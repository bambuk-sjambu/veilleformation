"""ANSM collector — RSS feeds from Agence nationale de sécurité du médicament.

Aggregates three official RSS 2.0 feeds:
  - https://ansm.sante.fr/rss/informations_securite (alertes sécurité — priorité)
  - https://ansm.sante.fr/rss/actualites (actualités)
  - https://ansm.sante.fr/rss/disponibilite_produits_sante (ruptures de stock)

Persona cible : Médical libéral (généralistes, kinés, ostéos, infirmiers
libéraux, sages-femmes) — Phase A multi-secteur Cipia.

⚠️ Particularité ANSM : les flux RSS publient uniquement les éléments **du
jour courant** (description channel : "Informations du jour de l'ANSM"). Une
exécution hors jour publication retournera une liste vide, ce qui est normal.
La collecte est donc à exécuter en cron quotidien.

Pas d'authentification requise. Pas de rate limit documenté, mais on
applique un session HTTP partagé avec User-Agent identifié + retry léger.
"""

import hashlib
import re
import time
import xml.etree.ElementTree as ET
from datetime import datetime
from email.utils import parsedate_to_datetime
from html import unescape
from typing import Optional

import requests

from collectors.base import BaseCollector


# ----------------------------------------------------------------------
# Endpoints et configuration
# ----------------------------------------------------------------------

ANSM_FEEDS: list[tuple[str, str]] = [
    # (feed_label, url) — l'ordre = ordre de priorité (sécurité en premier)
    ("informations_securite", "https://ansm.sante.fr/rss/informations_securite"),
    ("actualites", "https://ansm.sante.fr/rss/actualites"),
    ("disponibilite_produits_sante", "https://ansm.sante.fr/rss/disponibilite_produits_sante"),
]

USER_AGENT = "Cipia/1.0 (veille reglementaire sante - https://cipia.fr)"

# Mots-clés indicatifs (filtrage côté collector laissé optionnel : on
# laisse passer pour la classification IA en aval, comme spécifié dans le
# brief). Conservés ici pour traçabilité et activation future.
MEDICAL_KEYWORDS = [
    "médecin",
    "medecin",
    "kiné",
    "kine",
    "infirmier",
    "professionnel de santé",
    "professionnel de sante",
    "libéral",
    "liberal",
    "rappel",
    "alerte",
]

_KEYWORD_PATTERN = re.compile(
    "|".join(re.escape(kw) for kw in MEDICAL_KEYWORDS),
    re.IGNORECASE,
)


# ----------------------------------------------------------------------
# Helpers (module-level pour pouvoir tester unitairement)
# ----------------------------------------------------------------------

def _strip_html(html_text: Optional[str]) -> str:
    """Strip HTML tags and decode entities, returning collapsed plain text."""
    if not html_text:
        return ""
    text = re.sub(r"<[^>]+>", " ", html_text)
    text = unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _extract_slug(url: str) -> Optional[str]:
    """Extract the actualité slug from an ANSM URL.

    Example:
        https://ansm.sante.fr/actualites/finasteride-1-mg-attestation
        -> finasteride-1-mg-attestation
    """
    if not url:
        return None
    match = re.search(r"ansm\.sante\.fr/(?:actualites|informations[^/]*)/([a-z0-9\-]+)", url, re.IGNORECASE)
    return match.group(1) if match else None


def _hash_url(url: str) -> str:
    """Stable short hash of a URL — fallback identifier when no GUID available."""
    digest = hashlib.sha1(url.encode("utf-8", errors="replace")).hexdigest()
    return digest[:16]


# ----------------------------------------------------------------------
# Collector
# ----------------------------------------------------------------------

class ANSMCollector(BaseCollector):
    """Collector for ANSM RSS feeds (informations_securite, actualites,
    disponibilite_produits_sante).

    Returns articles formatted for Cipia : source, source_id, title, url,
    content, published_date, category, status="new".

    The three feeds are aggregated and deduplicated by URL (and by GUID
    when available), so articles published in multiple feeds (e.g. a
    rupture which is also tagged "informations_securite") count once.
    """

    SOURCE_NAME = "ansm"

    # Catégorie Cipia : le schéma DB n'autorise actuellement que
    # ('reglementaire', 'ao', 'metier', 'handicap', 'financement'). Les
    # alertes ANSM sont mappées sur 'reglementaire' faute d'option dédiée.
    # TODO multi-secteur : étendre le CHECK(category IN ...) pour ajouter
    # 'alerte_sanitaire' (proposition brief V2 médical libéral).
    DEFAULT_CATEGORY = "reglementaire"

    # Délai entre 2 fetch RSS (politesse, ANSM = site gouv stable mais
    # pas besoin de marteler).
    REQUEST_SLEEP_SECONDS = 1.0

    # Nombre de tentatives sur erreur transitoire (5xx, timeout)
    MAX_RETRIES = 3
    RETRY_BACKOFF_SECONDS = 2.0

    def __init__(
        self,
        db_path: str,
        logger=None,
        apply_keyword_filter: bool = False,
    ):
        """Init.

        Args:
            db_path: chemin SQLite Cipia.
            logger: logger optionnel.
            apply_keyword_filter: si True, filtre côté collector via
                MEDICAL_KEYWORDS. Par défaut False : on laisse passer
                tout, la classification IA en aval (Indicateur 23/24/25/26)
                fait le tri.
        """
        super().__init__(db_path, logger)
        self.apply_keyword_filter = apply_keyword_filter
        self._session = requests.Session()
        self._session.headers.update({
            "User-Agent": USER_AGENT,
            "Accept": "application/rss+xml, application/xml, text/xml, */*",
            "Accept-Language": "fr",
        })

    # ------------------------------------------------------------------
    # HTTP fetch
    # ------------------------------------------------------------------

    def _fetch_feed(self, url: str) -> Optional[bytes]:
        """Fetch a single RSS feed with retry on transient errors.

        Returns:
            Raw XML bytes, or None on permanent failure (logged warning).
        """
        last_err: Optional[Exception] = None
        for attempt in range(1, self.MAX_RETRIES + 1):
            try:
                response = self._session.get(url, timeout=30)
                # Retry on 5xx; surface 4xx immediately.
                if 500 <= response.status_code < 600:
                    last_err = requests.HTTPError(f"HTTP {response.status_code}")
                    self.logger.warning(
                        f"ANSM: {url} HTTP {response.status_code} "
                        f"(tentative {attempt}/{self.MAX_RETRIES})"
                    )
                else:
                    response.raise_for_status()
                    return response.content
            except requests.RequestException as e:
                last_err = e
                self.logger.warning(
                    f"ANSM: erreur HTTP {url}: {e} "
                    f"(tentative {attempt}/{self.MAX_RETRIES})"
                )

            if attempt < self.MAX_RETRIES:
                time.sleep(self.RETRY_BACKOFF_SECONDS * attempt)

        self.logger.error(f"ANSM: echec definitif {url}: {last_err}")
        return None

    # ------------------------------------------------------------------
    # XML parsing
    # ------------------------------------------------------------------

    def _parse_rss_feed(
        self,
        xml_content: bytes,
        feed_label: str,
    ) -> list[dict]:
        """Parse RSS 2.0 XML content into a list of article dicts.

        Args:
            xml_content: raw XML bytes.
            feed_label: short label of the source feed (e.g.
                "informations_securite") — stored in the article content
                to help downstream classification.
        """
        articles: list[dict] = []
        if not xml_content:
            return articles

        try:
            root = ET.fromstring(xml_content)
        except ET.ParseError as e:
            self.logger.error(f"ANSM[{feed_label}]: erreur parsing XML: {e}")
            return articles

        # RSS 2.0 : <rss><channel><item>...</item></channel></rss>
        channel = root.find("channel")
        if channel is None:
            self.logger.debug(f"ANSM[{feed_label}]: pas de <channel>")
            return articles

        for item_el in channel.findall("item"):
            article = self._parse_rss_item(item_el, feed_label)
            if article:
                articles.append(article)

        return articles

    def _parse_rss_item(
        self,
        item_el: ET.Element,
        feed_label: str,
    ) -> Optional[dict]:
        """Parse a single <item> element into a Cipia article dict."""
        title_el = item_el.find("title")
        link_el = item_el.find("link")
        desc_el = item_el.find("description")
        pubdate_el = item_el.find("pubDate")
        guid_el = item_el.find("guid")

        title = (title_el.text or "").strip() if title_el is not None else ""
        url = (link_el.text or "").strip() if link_el is not None else ""

        # Description peut contenir du HTML brut + entities (CDATA déjà
        # auto-déballé par ElementTree).
        raw_desc = (desc_el.text or "") if desc_el is not None else ""
        content = _strip_html(raw_desc)

        # GUID stable ANSM (souvent = link). Sinon, fallback sur le slug
        # extrait de l'URL ; sinon hash.
        guid_text = (guid_el.text or "").strip() if guid_el is not None else ""
        if guid_text:
            stable_id = guid_text
        elif url:
            slug = _extract_slug(url)
            stable_id = slug if slug else _hash_url(url)
        elif title:
            stable_id = _hash_url(title)
        else:
            return None  # entry sans titre ni URL : on ignore

        # Le source_id est dédupliqué globalement entre les 3 flux (un
        # même article peut apparaître dans actualités + informations
        # sécurité). On préfixe par "ansm-" mais SANS le feed_label, pour
        # que la dedup cross-flux fonctionne via le simple source_id.
        source_id = f"ansm-{_hash_url(stable_id)}"

        published_date = self._parse_pubdate(pubdate_el.text if pubdate_el is not None else None)

        # Préfixer le contenu avec le label du flux pour aider la
        # classification IA en aval (alerte vs actu vs rupture).
        feed_prefix = {
            "informations_securite": "[Alerte sécurité ANSM]",
            "actualites": "[Actualité ANSM]",
            "disponibilite_produits_sante": "[Rupture de stock ANSM]",
        }.get(feed_label, f"[{feed_label}]")

        full_content: Optional[str]
        if content:
            full_content = f"{feed_prefix} {content}"[:5000]
        else:
            full_content = feed_prefix

        return {
            "source": self.SOURCE_NAME,
            "source_id": source_id,
            "title": (title or "Sans titre")[:500],
            "url": url or None,
            "content": full_content,
            # Conservé pour le filtrage keyword (avant préfixage), évite
            # qu'un préfixe interne comme "[Alerte sécurité ANSM]" matche
            # accidentellement les MEDICAL_KEYWORDS.
            "_raw_content": content,
            "published_date": published_date,
            "category": self.DEFAULT_CATEGORY,
            "status": "new",
        }

    @staticmethod
    def _parse_pubdate(pubdate: Optional[str]) -> Optional[str]:
        """Parse RFC 822 date (RSS 2.0 standard) and return YYYY-MM-DD.

        Falls back to ISO 8601 parsing if the format is unusual, then to
        None.
        """
        if not pubdate:
            return None
        pubdate = pubdate.strip()
        if not pubdate:
            return None

        # RFC 822 (e.g. "Fri, 02 May 2025 14:30:00 +0200")
        try:
            dt = parsedate_to_datetime(pubdate)
            if dt is not None:
                return dt.strftime("%Y-%m-%d")
        except (TypeError, ValueError, IndexError):
            pass

        # ISO 8601 fallback
        for fmt in ("%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
            try:
                dt = datetime.strptime(pubdate, fmt)
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                continue

        return None

    # ------------------------------------------------------------------
    # Filtrage optionnel
    # ------------------------------------------------------------------

    def _is_relevant(self, title: str, content: str) -> bool:
        """Apply MEDICAL_KEYWORDS filter when keyword filtering is enabled."""
        searchable = f"{title} {content}".lower()
        return bool(_KEYWORD_PATTERN.search(searchable))

    # ------------------------------------------------------------------
    # Main collect()
    # ------------------------------------------------------------------

    def collect(self) -> list[dict]:
        """Fetch the 3 ANSM RSS feeds, merge and deduplicate.

        Dedup strategy : par source_id (qui dérive du GUID stable ou,
        à défaut, du hash de la `link`). Un même article apparaissant
        dans 2 flux est conservé une seule fois — version du flux le plus
        prioritaire (informations_securite > actualites > disponibilite).

        Returns:
            List of article dicts (potentially empty if ANSM n'a rien
            publié le jour courant — comportement normal du flux).
        """
        seen_ids: set[str] = set()
        articles: list[dict] = []

        for feed_label, feed_url in ANSM_FEEDS:
            self.logger.info(f"ANSM[{feed_label}]: fetch {feed_url}")
            xml_bytes = self._fetch_feed(feed_url)

            if xml_bytes is None:
                # Erreur HTTP loggée déjà ; on continue avec les autres flux.
                continue

            feed_articles = self._parse_rss_feed(xml_bytes, feed_label)
            self.logger.info(
                f"ANSM[{feed_label}]: {len(feed_articles)} entrees"
            )

            kept = 0
            for article in feed_articles:
                sid = article["source_id"]
                if sid in seen_ids:
                    continue

                if self.apply_keyword_filter:
                    if not self._is_relevant(
                        article.get("title", ""),
                        article.get("_raw_content", "") or "",
                    ):
                        continue

                seen_ids.add(sid)
                # Le champ interne _raw_content ne doit pas finir en DB.
                article.pop("_raw_content", None)
                articles.append(article)
                kept += 1

            self.logger.debug(
                f"ANSM[{feed_label}]: {kept} retenus apres dedup/filtre"
            )

            # Politesse entre 2 requêtes
            time.sleep(self.REQUEST_SLEEP_SECONDS)

        self.logger.info(
            f"ANSM: {len(articles)} articles uniques agreges sur "
            f"{len(ANSM_FEEDS)} flux"
        )
        return articles
