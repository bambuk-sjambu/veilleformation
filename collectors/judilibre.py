"""Judilibre collector — Cour de cassation + Conseil d'État jurisprudence.

Source : api.piste.gouv.fr/cassation/judilibre/v1.0 (OAuth2, PISTE).

Persona ciblé (Phase A multi-secteur) : avocats indépendants / petits cabinets
(1-5 personnes). Voir `COLLECTORS-V2-BRIEF.md` section "Avocats / Source 1".

Stratégie :
1. OAuth2 client_credentials via le helper :class:`collectors.piste_auth.PisteAuth`
   (factorisé pour pouvoir réutiliser les credentials Légifrance déjà existants).
2. Endpoint ``/search`` avec filtres :
   - ``date_start = today - days_back`` (rolling window)
   - ``chamber = civ1,civ2,civ3,com,crim,soc`` (les 6 chambres pertinentes
     pour avocat libéral généraliste — modifiable via paramètre __init__)
   - ``sort = date`` + ``order = desc``
3. Pagination via ``page`` / ``page_size`` jusqu'à épuiser ``total`` ou atteindre
   ``MAX_PAGES`` (garde-fou).
4. Mapping vers le format Cipia (source, source_id, title, url, content,
   published_date, category, status="new").

Note schéma DB : la contrainte ``CHECK(category IN (...))`` actuelle de
``storage/database.py`` ne contient PAS encore "jurisprudence". On utilise
"reglementaire" pour ne pas faire échouer l'INSERT, tout en posant la
constante :data:`ARTICLE_CATEGORY` pour basculer dès que le schéma est mis à
jour (ALTER ou nouvelle migration multi-secteur).

Authentification :
- Variables d'environnement (cf. :class:`collectors.piste_auth.PisteAuth`) :
  ``PISTE_CLIENT_ID`` / ``PISTE_CLIENT_SECRET`` (préférées) avec fallback sur
  ``LEGIFRANCE_CLIENT_ID`` / ``LEGIFRANCE_CLIENT_SECRET`` (compte PISTE
  historique de Cipia).
- Si manquantes, le collector loggue un warning et retourne ``[]`` sans crasher.
- Sandbox : passer ``api_base="https://sandbox-api.piste.gouv.fr/cassation/judilibre/v1.0"``.

Doc API : https://github.com/Cour-de-cassation/judilibre-search
"""

from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timedelta
from typing import Iterable, Optional

import requests

from collectors.base import BaseCollector
from collectors.piste_auth import PisteAuth
from storage.monitoring import send_monitoring_alert


# ----------------------------------------------------------------------
# Endpoints
# ----------------------------------------------------------------------

API_BASE_PROD = "https://api.piste.gouv.fr/cassation/judilibre/v1.0"
API_BASE_SANDBOX = "https://sandbox-api.piste.gouv.fr/cassation/judilibre/v1.0"

# ----------------------------------------------------------------------
# Defaults
# ----------------------------------------------------------------------

# Chambres Cassation pertinentes pour cabinet d'avocat libéral généraliste.
# civ1=civile 1ère / civ2 / civ3 / com=commerciale / crim=criminelle / soc=sociale.
DEFAULT_CHAMBERS = ("civ1", "civ2", "civ3", "com", "crim", "soc")

# Page size max chez Judilibre = 50, on prend la valeur max pour limiter le
# nombre d'appels (et donc le quota PISTE).
PAGE_SIZE = 50
MAX_PAGES = 20  # garde-fou : 20 pages * 50 = 1000 décisions par run, large.

RATE_LIMIT_DELAY = 1.0  # secondes entre chaque page (PISTE quota friendly)
RETRY_DELAYS = [5, 15, 45]  # backoff pour erreurs réseau
MAX_CONSECUTIVE_FAILURES = 3

# Cipia : la contrainte CHECK ne connaît pas encore "jurisprudence".
# On utilise "reglementaire" (sémantiquement le plus proche) en attendant
# qu'on étende le CHECK constraint via une migration additive.
ARTICLE_CATEGORY = "reglementaire"  # TODO: passer à "jurisprudence" quand le CHECK l'accepte

# Mapping des codes chambres vers les libellés affichables.
CHAMBER_LABELS = {
    "civ1": "Civ. 1re",
    "civ2": "Civ. 2e",
    "civ3": "Civ. 3e",
    "com": "Com.",
    "crim": "Crim.",
    "soc": "Soc.",
    "mixte": "Ch. mixte",
    "pl": "Ass. plén.",
}


# ----------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------


def _clean(text: Optional[str]) -> str:
    """Normalise une chaîne issue de l'API (None, espaces multiples)."""
    if not text:
        return ""
    return " ".join(str(text).split()).strip()


def _format_date(value) -> Optional[str]:
    """Extrait la portion ``YYYY-MM-DD`` d'une date ISO 8601 ou epoch ms."""
    if not value:
        return None
    if isinstance(value, (int, float)):
        try:
            return datetime.fromtimestamp(value / 1000).strftime("%Y-%m-%d")
        except (OSError, ValueError, OverflowError):
            return None
    s = str(value)
    return s[:10] if len(s) >= 10 else None


def _build_title(decision: dict) -> str:
    """Construit un titre lisible « Cass. <chamber> — <theme> — <numero> »."""
    chamber = decision.get("chamber") or ""
    chamber_label = CHAMBER_LABELS.get(chamber, chamber.upper() if chamber else "")
    prefix = "Cass."
    if chamber_label:
        prefix = f"Cass. {chamber_label}"

    theme = ""
    themes = decision.get("themes") or []
    if isinstance(themes, list) and themes:
        first = themes[0]
        if isinstance(first, dict):
            theme = _clean(first.get("label") or first.get("title") or first.get("value"))
        else:
            theme = _clean(first)

    numero = (
        _clean(decision.get("number"))
        or _clean(decision.get("numero"))
        or _clean(decision.get("id"))
    )

    parts = [p for p in (prefix, theme, numero) if p]
    return " — ".join(parts) or "Décision sans titre"


# ----------------------------------------------------------------------
# Collector
# ----------------------------------------------------------------------


class JudilibreCollector(BaseCollector):
    """Collecte les décisions Judilibre (Cour de cassation) via l'API PISTE."""

    SOURCE_NAME = "judilibre"
    SECTOR_ID = "avocats"

    def __init__(
        self,
        db_path: str = ":memory:",
        logger: Optional[logging.Logger] = None,
        days_back: int = 14,
        chambers: Iterable[str] = DEFAULT_CHAMBERS,
        api_base: str = API_BASE_PROD,
        auth: Optional[PisteAuth] = None,
    ):
        super().__init__(db_path, logger)
        self.days_back = days_back
        self.chambers = tuple(chambers)
        self.api_base = api_base.rstrip("/")
        self.auth = auth or PisteAuth.from_env(logger=self.logger)

    # --------------------------------------------------------------
    # HTTP
    # --------------------------------------------------------------

    def _build_search_params(self, page: int) -> dict:
        date_start = (datetime.now() - timedelta(days=self.days_back)).strftime("%Y-%m-%d")
        params = {
            "date_start": date_start,
            "sort": "date",
            "order": "desc",
            "page_size": PAGE_SIZE,
            "page": page,
        }
        if self.chambers:
            # Judilibre supporte le multi-valued via param répété — requests sérialise
            # ``"chamber": [...]`` en ``chamber=civ1&chamber=civ2&...``.
            params["chamber"] = list(self.chambers)
        return params

    def _search(self, page: int) -> Optional[dict]:
        """Exécute /search avec retry exponentiel + refresh token sur 401.

        Returns:
            JSON décodé, ou ``None`` si toutes les tentatives échouent.
        """
        url = f"{self.api_base}/search"
        token = self.auth.get_token()
        if not token:
            return None
        token_refreshed = False

        last_error: Optional[Exception] = None
        for attempt, delay in enumerate([0] + RETRY_DELAYS):
            if delay:
                self.logger.info("Judilibre: retry dans %ss...", delay)
                time.sleep(delay)

            headers = {
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
            }
            try:
                response = requests.get(
                    url,
                    headers=headers,
                    params=self._build_search_params(page),
                    timeout=30,
                )
                # Token expiré : on rafraîchit une fois et on rejoue.
                if response.status_code == 401 and not token_refreshed:
                    self.logger.info("Judilibre: 401, renouvellement du token PISTE")
                    self.auth.invalidate()
                    new_token = self.auth.get_token(force_refresh=True)
                    if new_token:
                        token = new_token
                        token_refreshed = True
                        continue
                response.raise_for_status()
                return response.json()
            except requests.RequestException as exc:
                last_error = exc
                self.logger.warning(
                    "Judilibre: tentative %s/%s page=%s echouee: %s",
                    attempt + 1,
                    len(RETRY_DELAYS) + 1,
                    page,
                    exc,
                )

        self.logger.error(
            "Judilibre: toutes tentatives echouees pour page=%s (%s)",
            page,
            last_error,
        )
        return None

    # --------------------------------------------------------------
    # Parsing
    # --------------------------------------------------------------

    def _parse_decision(self, decision: dict) -> Optional[dict]:
        """Convertit une décision Judilibre en article Cipia."""
        decision_id = _clean(decision.get("id"))
        if not decision_id:
            return None

        chamber = decision.get("chamber") or ""

        # Contenu : sommaire + extrait du texte intégral si présent.
        content_parts = []
        for key in ("summary", "abstract", "solution"):
            v = _clean(decision.get(key))
            if v:
                content_parts.append(v)
        text_excerpt = _clean(decision.get("text"))
        if text_excerpt:
            content_parts.append(text_excerpt[:1000])
        content = " | ".join(content_parts) if content_parts else None

        # Date : date_creation par défaut (date de mise en ligne), sinon date_audience.
        published_date = (
            _format_date(decision.get("decision_date"))
            or _format_date(decision.get("date_creation"))
            or _format_date(decision.get("date_audience"))
            or _format_date(decision.get("date"))
        )

        url = f"https://www.courdecassation.fr/decision/{decision_id}"

        article = {
            "source": "judilibre",
            "source_id": f"judilibre-{decision_id}",
            "title": _build_title(decision),
            "url": url,
            "content": content,
            "published_date": published_date,
            "category": ARTICLE_CATEGORY,
            "status": "new",
        }

        # Métadonnées additionnelles pour exploitation downstream (extra_meta).
        meta = {}
        if chamber:
            meta["chamber"] = chamber
        formation = _clean(decision.get("formation"))
        if formation:
            meta["formation"] = formation
        publication = decision.get("publication")
        if publication:
            meta["publication"] = publication
        solution = _clean(decision.get("solution"))
        if solution:
            meta["solution"] = solution
        if meta:
            # extra_meta est stocké en TEXT (JSON) dans SQLite — sérialiser ici.
            article["extra_meta"] = json.dumps(meta, ensure_ascii=False)

        return article

    # --------------------------------------------------------------
    # Public collect()
    # --------------------------------------------------------------

    def collect(self) -> list[dict]:
        """Récupère les décisions Judilibre publiées dans la fenêtre ``days_back``.

        Returns:
            Liste de dicts au format Cipia. Vide si auth manquante ou erreur.
        """
        if not self.auth.has_credentials():
            self.logger.warning(
                "Judilibre: identifiants PISTE manquants "
                "(PISTE_CLIENT_ID / PISTE_CLIENT_SECRET, ou fallback "
                "LEGIFRANCE_CLIENT_ID / LEGIFRANCE_CLIENT_SECRET). "
                "Collecte ignoree."
            )
            return []

        articles: list[dict] = []
        seen_ids: set[str] = set()
        consecutive_failures = 0
        total_announced: Optional[int] = None

        for page in range(1, MAX_PAGES + 1):
            if page > 1:
                time.sleep(RATE_LIMIT_DELAY)

            self.logger.info("Judilibre: recherche page %s", page)
            payload = self._search(page)

            if payload is None:
                consecutive_failures += 1
                if consecutive_failures >= MAX_CONSECUTIVE_FAILURES:
                    self.logger.error(
                        "Judilibre: %s echecs consecutifs - alerte monitoring",
                        consecutive_failures,
                    )
                    send_monitoring_alert(
                        db_path=self.db_path,
                        severity="critical",
                        alert_type="api_failure",
                        source="judilibre",
                        message=(
                            f"API Judilibre inaccessible apres "
                            f"{MAX_CONSECUTIVE_FAILURES} tentatives"
                        ),
                        details={"consecutive_failures": consecutive_failures},
                    )
                break

            consecutive_failures = 0

            results = payload.get("results") or []
            if not results:
                self.logger.info("Judilibre: page %s vide, fin de pagination", page)
                break

            if total_announced is None:
                total_announced = payload.get("total")

            for decision in results:
                article = self._parse_decision(decision)
                if not article:
                    continue
                if article["source_id"] in seen_ids:
                    continue
                seen_ids.add(article["source_id"])
                articles.append(article)

            # Fin de pagination : moins que page_size = dernière page.
            if len(results) < PAGE_SIZE:
                break
            # Sécurité : si l'API expose un total, arrêter dès qu'on l'a couvert.
            if total_announced is not None and len(articles) >= total_announced:
                break

        self.logger.info(
            "Judilibre: %s decisions uniques collectees (sur %s pages)",
            len(articles),
            min(page, MAX_PAGES),
        )
        return articles
