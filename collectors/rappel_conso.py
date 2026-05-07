"""RappelConso V2 collector (DGCCRF + DGAL alertes alimentaires).

Source : data.economie.gouv.fr — dataset Opendatasoft `rappelconso-v2-gtin-espaces`.
Documentation API : Explore v2.1 (REST, JSON paginé, licence ouverte).

Ce collector cible le persona HACCP (Phase A multi-secteur) : rappels de produits
alimentaires publiés par la DGCCRF + DGAL (autorité agriculture/alimentation).

Stratégie :
1. Filtre `where=categorie_produit="alimentation"` (valeur réelle observée en
   minuscules, pas "Alimentation" comme initialement annoncé dans le brief).
2. Tri `order_by=date_publication DESC` pour récupérer les rappels les plus récents.
3. Pagination via `offset` tant que `len(results) == limit` ET dans la fenêtre
   `days_back`. Limite haute Opendatasoft : 100 records/req.
4. Mapping vers le format Cipia (source, source_id, title, url, content,
   published_date, category, status="new").

Notes schema réelles (vérifiées 2026-05-02 sur l'API live, le brief V1 était
imprécis — pas de `fields[...]` mais des champs à plat) :
- `id` (int, autoincrement DGCCRF) + `numero_fiche` (str stable, format "YYYY-NN-NNNN")
- `date_publication` (ISO 8601 avec offset)
- `categorie_produit` / `sous_categorie_produit` (lowercase)
- `marque_produit`, `modeles_ou_references`, `libelle`
- `motif_rappel`, `risques_encourus`, `description_complementaire_risque`
- `conduites_a_tenir_par_le_consommateur` (séparateur "|")
- `lien_vers_la_fiche_rappel` (URL publique rappel.conso.gouv.fr)

Source ultra-stable : gov.fr, open data, pas d'authentification, pas de captcha,
IP datacenter Hetzner OK.
"""

import time
from datetime import datetime, timedelta, timezone
from typing import Optional

import requests

from collectors.base import BaseCollector
from storage.monitoring import send_monitoring_alert

API_URL = (
    "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/"
    "rappelconso-v2-gtin-espaces/records"
)

PAGE_LIMIT = 100  # max Opendatasoft v2.1
MAX_PAGES = 20  # garde-fou : 20 * 100 = 2000 rappels par run, largement assez
RETRY_DELAYS = [10, 30, 60]
MAX_CONSECUTIVE_FAILURES = 3
USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) Cipia/1.0 +https://cipia.fr"

# Filtre Opendatasoft (SQL-like). Valeur exacte observée : "alimentation" (minuscule).
# Tester un autre persona (cosmétiques, jouets) → changer cette constante.
CATEGORIE_FILTER = 'categorie_produit="alimentation"'

# Catégorie Cipia. Le schema actuel (storage/database.py CHECK constraint) ne
# connaît PAS encore "alerte_sanitaire" — au choix : ajouter la valeur dans le
# schema, ou utiliser "reglementaire" en attendant. On garde "reglementaire"
# pour ne pas faire échouer l'INSERT, et on pose une constante claire pour
# basculer dès que le schema est mis à jour.
ARTICLE_CATEGORY = "reglementaire"  # TODO: passer à "alerte_sanitaire" quand le CHECK l'accepte


def _clean(text: Optional[str]) -> str:
    """Normalise une chaîne issue de l'API (None, espaces multiples, séparateurs)."""
    if not text:
        return ""
    return " ".join(str(text).split()).strip()


def _format_pipe_list(text: Optional[str]) -> str:
    """Convertit une liste pipe-separated ("a|b|c") en phrase lisible ("a ; b ; c")."""
    if not text:
        return ""
    parts = [p.strip() for p in str(text).split("|") if p.strip()]
    return " ; ".join(parts)


class RappelConsoCollector(BaseCollector):
    """Collect rappels alimentaires depuis l'API RappelConso V2 (DGCCRF + DGAL)."""

    SOURCE_NAME = "rappel_conso"
    SECTOR_ID = "haccp"

    def __init__(self, db_path: str = ":memory:", logger=None, days_back: int = 30):
        super().__init__(db_path, logger)
        self.days_back = days_back

    # --------------------------------------------------------------
    # HTTP
    # --------------------------------------------------------------

    def _fetch_with_retry(self, params: dict) -> Optional[dict]:
        """GET API Opendatasoft avec retry exponentiel.

        Retourne le payload JSON décodé ou None si toutes les tentatives échouent.
        """
        last_error: Optional[Exception] = None
        for attempt, delay in enumerate(RETRY_DELAYS):
            try:
                r = requests.get(
                    API_URL,
                    params=params,
                    headers={
                        "User-Agent": USER_AGENT,
                        "Accept": "application/json",
                    },
                    timeout=30,
                )
                r.raise_for_status()
                return r.json()
            except requests.RequestException as e:
                last_error = e
                self.logger.warning(
                    f"RappelConso tentative {attempt + 1}/{len(RETRY_DELAYS)} "
                    f"echouee: {e}"
                )
                if attempt < len(RETRY_DELAYS) - 1:
                    time.sleep(delay)
        self.logger.error(
            f"RappelConso: toutes les tentatives ont echoue - {last_error}"
        )
        return None

    # --------------------------------------------------------------
    # Parsing
    # --------------------------------------------------------------

    @staticmethod
    def _parse_date(value: Optional[str]) -> Optional[str]:
        """Parse une date ISO 8601 RappelConso et retourne 'YYYY-MM-DD' ou None."""
        if not value:
            return None
        try:
            # Ex : "2026-05-01T08:19:50+00:00"
            dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
            return dt.strftime("%Y-%m-%d")
        except (ValueError, AttributeError):
            return str(value)[:10] or None

    def _build_title(self, record: dict) -> str:
        """Construit un titre lisible à partir du record.

        Priorité : "{marque} — {sous_categorie} : {libelle}".
        Fallback : numero_fiche si tout est vide.
        """
        marque = _clean(record.get("marque_produit"))
        sous_cat = _clean(record.get("sous_categorie_produit"))
        libelle = _clean(record.get("libelle")) or _clean(
            record.get("modeles_ou_references")
        )

        # Capitalise pour la lisibilité (les valeurs sont en minuscules dans l'API).
        marque = marque.title() if marque else ""
        sous_cat = sous_cat.capitalize() if sous_cat else ""

        parts = []
        if marque:
            parts.append(marque)
        if sous_cat:
            parts.append(sous_cat)
        head = " — ".join(parts) if parts else ""

        if head and libelle:
            return f"{head} : {libelle}"
        if head:
            return head
        if libelle:
            return libelle

        numero = record.get("numero_fiche") or record.get("id")
        return f"Rappel produit alimentaire {numero}".strip()

    def _build_content(self, record: dict) -> str:
        """Concatène les champs métier importants en un bloc texte exploitable
        par le pipeline IA (résumé, classification Qualiopi).
        """
        chunks = []

        motif = _clean(record.get("motif_rappel"))
        if motif:
            chunks.append(f"Motif du rappel : {motif}.")

        risques = _clean(record.get("risques_encourus"))
        if risques:
            chunks.append(f"Risques encourus : {risques}.")

        description = _clean(record.get("description_complementaire_risque"))
        if description:
            chunks.append(f"Détail risque : {description}.")

        preconisations = _clean(record.get("preconisations_sanitaires"))
        if preconisations:
            chunks.append(f"Préconisations sanitaires : {preconisations}.")

        conduite = _format_pipe_list(record.get("conduites_a_tenir_par_le_consommateur"))
        if conduite:
            chunks.append(f"Conduite à tenir : {conduite}.")

        distributeurs = _clean(record.get("distributeurs"))
        if distributeurs:
            # Le champ contient parfois "¤¤" comme séparateur étrange : nettoyer.
            distributeurs = distributeurs.replace("¤¤", " ; ").replace(
                "¤", " ; "
            )
            chunks.append(f"Distributeurs : {distributeurs}.")

        zone = _clean(record.get("zone_geographique_de_vente"))
        if zone:
            chunks.append(f"Zone de vente : {zone}.")

        modeles = _clean(record.get("modeles_ou_references"))
        if modeles:
            chunks.append(f"Références concernées : {modeles}.")

        return " ".join(chunks)

    def _parse_record(self, record: dict) -> dict:
        """Convertit un record Opendatasoft en article structuré pour la DB Cipia."""
        numero = record.get("numero_fiche") or record.get("id")
        # numero_fiche est stable et lisible ("2026-04-0331") — préférer à `id`
        # qui dépend d'une renumérotation interne DGCCRF.
        source_id = f"{self.SOURCE_NAME}-{numero}"

        url = (
            record.get("lien_vers_la_fiche_rappel")
            or record.get("lien_vers_affichette_pdf")
            or ""
        )

        return {
            "source": self.SOURCE_NAME,
            "source_id": source_id,
            "title": self._build_title(record),
            "url": url,
            "content": self._build_content(record),
            "published_date": self._parse_date(record.get("date_publication")),
            "category": ARTICLE_CATEGORY,
            "status": "new",
        }

    # --------------------------------------------------------------
    # Collection
    # --------------------------------------------------------------

    def _is_within_window(self, record: dict, cutoff: datetime) -> bool:
        """True si la date de publication du record est >= cutoff (UTC-naive cmp)."""
        raw = record.get("date_publication")
        if not raw:
            return True  # on garde par sécurité, le filtrage ultérieur fera le tri
        try:
            dt = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
            # Normalise en naive UTC pour comparer avec cutoff (datetime.now()).
            if dt.tzinfo is not None:
                dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
            return dt >= cutoff
        except (ValueError, AttributeError):
            return True

    def collect(self) -> list[dict]:
        """Récupère les rappels alimentaires sur la fenêtre `days_back`.

        Pagination : `offset` croissant tant que la dernière page est pleine ET
        que les records restent dans la fenêtre temporelle. Hard cap à
        `MAX_PAGES` pour éviter une boucle infinie en cas de tri capricieux.
        """
        cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(
            days=self.days_back
        )
        articles: list[dict] = []
        seen_ids: set[str] = set()
        consecutive_failures = 0
        offset = 0

        for page in range(MAX_PAGES):
            params = {
                "where": CATEGORIE_FILTER,
                "order_by": "date_publication DESC",
                "limit": PAGE_LIMIT,
                "offset": offset,
            }

            self.logger.info(
                f"RappelConso: page {page + 1} (offset={offset}, limit={PAGE_LIMIT})"
            )
            payload = self._fetch_with_retry(params)

            if payload is None:
                consecutive_failures += 1
                if consecutive_failures >= MAX_CONSECUTIVE_FAILURES:
                    self.logger.error(
                        f"RappelConso: {consecutive_failures} echecs consecutifs - alerte"
                    )
                    send_monitoring_alert(
                        db_path=self.db_path,
                        severity="critical",
                        alert_type="api_failure",
                        source=self.SOURCE_NAME,
                        message="API RappelConso (data.economie.gouv.fr) inaccessible",
                        details={"offset": offset, "page": page + 1},
                    )
                    break
                continue

            consecutive_failures = 0
            results = payload.get("results", []) or []

            if not results:
                self.logger.info("RappelConso: page vide, fin de pagination")
                break

            stop_pagination = False
            for record in results:
                if not self._is_within_window(record, cutoff):
                    # Comme on trie DESC sur la date, dès qu'un record sort de
                    # la fenêtre on peut arrêter la pagination.
                    stop_pagination = True
                    continue

                article = self._parse_record(record)
                if article["source_id"] in seen_ids:
                    continue
                seen_ids.add(article["source_id"])
                articles.append(article)

            if stop_pagination:
                self.logger.info(
                    f"RappelConso: cutoff {cutoff.date()} atteint, fin de pagination"
                )
                break

            if len(results) < PAGE_LIMIT:
                # Dernière page partielle = plus rien à paginer.
                break

            offset += PAGE_LIMIT

        self.logger.info(
            f"RappelConso: {len(articles)} rappels alimentaires collectes "
            f"(fenetre {self.days_back}j)"
        )
        return articles
