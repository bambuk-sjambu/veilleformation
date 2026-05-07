"""BOFiP collector — Bulletin Officiel des Finances Publiques (DGFiP).

Persona Experts-comptables (priorité 1, brief COLLECTORS-V2-BRIEF.md).

Source : flux RSS officiel DGFiP — URL générée via l'interface
`https://bofip.impots.gouv.fr/flux-rss` (formulaire Drupal qui POST en AJAX
puis retourne dans une modal le lien réel `/bofip/ext/rss.xml?...`).

URL exacte figée (reproductible sans cookie) :
    https://bofip.impots.gouv.fr/bofip/ext/rss.xml
        ?actualites=1&rescrits=1&publications=1&maxR=50&maxJ=60

Format : RSS 2.0 (pas Atom). Chaque <item> a uniquement <title>, <link>,
<description>, <category>. Pas de <pubDate>, pas de <guid> — la date de
publication est encapsulée dans la description sous la for
"(publié le DD/MM/YYYY)" et l'identifiant juridique sous la forme
"(identifiant juridique ACTU-YYYY-NNNNN; publié le DD/MM/YYYY)" ou
"(identifiant juridique BOI-...; publié le DD/MM/YYYY)".

Pas de filtre keyword côté collector : tout le contenu BOFiP est par nature
pertinent pour un EC (fiscalité). Le filtrage fin (IS / IR / TVA / BIC / BNC)
sera appliqué côté processors via les `taxonomy_*` du multi-secteur.

Fallback HTML : si le flux est indisponible, scraping de
`https://bofip.impots.gouv.fr/actualites/toutes-les-actualites/all` (liens
`<a href="/bofip/NNNN-PGP.html/ACTU-YYYY-NNNNN" title="DD/MM/YYYY : ...">`).

IP datacenter Hetzner : flux RSS testé OK le 2026-05-02 sans header spécial.
"""

import re
import xml.etree.ElementTree as ET
from datetime import datetime
from html import unescape
from typing import Optional

import requests

from collectors.base import BaseCollector


# URL RSS officielle figée (générée via l'interface /flux-rss le 2026-05-02).
# Couvre : Actualités + Rescrits + Publications doctrinales (BOI) toutes séries,
# 50 résultats max, fenêtre glissante de 60 jours.
BOFIP_RSS_URL = (
    "https://bofip.impots.gouv.fr/bofip/ext/rss.xml"
    "?actualites=1&rescrits=1&publications=1&maxR=50&maxJ=60"
)

# Page HTML fallback (liste paginée des actualités).
BOFIP_HTML_FALLBACK_URL = "https://bofip.impots.gouv.fr/actualites/toutes-les-actualites/all"

# Regex pour extraire la date "publié le DD/MM/YYYY" depuis la description.
_PUBLI_DATE_RE = re.compile(r"publi[ée]\s+le\s+(\d{2})/(\d{2})/(\d{4})", re.IGNORECASE)

# Regex pour extraire l'identifiant juridique BOFiP depuis l'URL ou la description.
# Exemples cibles :
#   /bofip/15003-PGP.html/ACTU-2026-00056            -> ACTU-2026-00056
#   /bofip/3980-PGP.html/identifiant=BOI-IF-CFE-...  -> BOI-IF-CFE-...
_BOFIP_ID_URL_RE = re.compile(
    r"/(ACTU-\d{4}-\d{4,6}|identifiant=([A-Z]{2,5}(?:-[A-Z0-9]+)+(?:-\d{6,8})?))"
)
_BOFIP_ID_DESC_RE = re.compile(
    r"identifiant\s+juridique\s+([A-Z]{2,5}(?:-[A-Z0-9]+)+(?:-\d{4,8})?)",
    re.IGNORECASE,
)


def _strip_html(html_text: str) -> str:
    """Strip HTML tags + decode entities, collapsing whitespace."""
    if not html_text:
        return ""
    text = re.sub(r"<[^>]+>", " ", html_text)
    text = unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _extract_bofip_id(url: str, description: str = "") -> Optional[str]:
    """Extract a stable BOFiP identifier from the link URL or description.

    Returns:
        - 'ACTU-YYYY-NNNNN' for actualités
        - 'BOI-XXX-...'     for publications doctrinales
        - None if nothing matches
    """
    if url:
        match = _BOFIP_ID_URL_RE.search(url)
        if match:
            # Group 2 is set when the URL uses /identifiant=BOI-...
            return (match.group(2) or match.group(1)).strip()

    if description:
        match = _BOFIP_ID_DESC_RE.search(description)
        if match:
            return match.group(1).strip().rstrip(";").rstrip(",")

    return None


def _parse_publi_date(text: str) -> Optional[str]:
    """Extract 'publié le DD/MM/YYYY' from text and return YYYY-MM-DD."""
    if not text:
        return None
    match = _PUBLI_DATE_RE.search(text)
    if not match:
        return None
    day, month, year = match.groups()
    try:
        return datetime(int(year), int(month), int(day)).strftime("%Y-%m-%d")
    except ValueError:
        return None


def _category_from_bofip(bofip_category: str) -> str:
    """Map BOFiP RSS <category> to Cipia internal category.

    BOFiP n'a que 2 catégories : 'Actualité' et 'Publication doctrinale'.
    Les deux sont du contenu réglementaire (doctrine fiscale officielle DGFiP),
    donc on les classe 'reglementaire' (la seule catégorie compatible avec la
    contrainte CHECK de la table articles : reglementaire | ao | metier |
    handicap | financement).

    NB. proposition au product owner : ajouter 'fiscal' à la liste autorisée
    pour distinguer veille fiscale EC vs réglementaire formation. Pour
    l'instant on reste compatible avec le schéma existant.
    """
    return "reglementaire"


class BOFiPCollector(BaseCollector):
    """Collector pour le Bulletin Officiel des Finances Publiques (DGFiP).

    Persona Experts-comptables. Pas de credentials requis.
    Stratégie :
        1. Flux RSS 2.0 officiel figé (50 entrées, 60 jours glissants).
        2. Fallback HTML scraping de la page liste actualités si le flux
           tombe (best-effort, dédupliqué par identifiant BOFiP).
    """

    SOURCE_NAME = "bofip"
    SECTOR_ID = "experts-comptables"

    def __init__(self, db_path: str, logger=None, timeout: int = 30):
        super().__init__(db_path, logger)
        self.timeout = timeout
        self._session = requests.Session()
        self._session.headers.update({
            "User-Agent": "Cipia/1.0 (veille fiscale experts-comptables)",
            "Accept": "application/rss+xml, application/xml, text/xml, */*;q=0.5",
            "Accept-Language": "fr,fr-FR;q=0.9,en;q=0.5",
        })

    # ------------------------------------------------------------------
    # RSS 2.0 parsing
    # ------------------------------------------------------------------

    def _fetch_rss(self) -> bytes:
        """Fetch the BOFiP RSS feed. Raises requests.RequestException on error."""
        response = self._session.get(BOFIP_RSS_URL, timeout=self.timeout)
        response.raise_for_status()
        return response.content

    def _parse_rss_feed(self, xml_content: bytes) -> list[dict]:
        """Parse RSS 2.0 XML into a list of Cipia article dicts."""
        articles: list[dict] = []
        try:
            root = ET.fromstring(xml_content)
        except ET.ParseError as e:
            self.logger.error(f"BOFiP: erreur parsing RSS XML: {e}")
            return []

        # RSS 2.0 : <rss><channel><item>...</item></channel></rss>, no namespace.
        channel = root.find("channel")
        if channel is None:
            self.logger.error("BOFiP: pas de <channel> dans le flux RSS")
            return []

        for item_el in channel.findall("item"):
            article = self._parse_rss_item(item_el)
            if article:
                articles.append(article)

        return articles

    def _parse_rss_item(self, item_el: ET.Element) -> Optional[dict]:
        """Parse a single <item> into a Cipia article dict."""
        title_el = item_el.find("title")
        link_el = item_el.find("link")
        desc_el = item_el.find("description")
        cat_el = item_el.find("category")

        title = title_el.text.strip() if title_el is not None and title_el.text else ""
        url = link_el.text.strip() if link_el is not None and link_el.text else ""
        raw_desc = desc_el.text if desc_el is not None and desc_el.text else ""
        description = _strip_html(raw_desc)
        bofip_cat = cat_el.text.strip() if cat_el is not None and cat_el.text else ""

        if not title and not url:
            return None

        # Stable id: prefer BOFiP juridical identifier (ACTU-... or BOI-...),
        # fall back to a hash of the URL.
        bofip_id = _extract_bofip_id(url, description)
        if not bofip_id:
            bofip_id = "url-" + str(abs(hash(url)) if url else abs(hash(title)))[:12]

        published_date = _parse_publi_date(description)

        # Build a content payload that keeps both the RSS description and
        # the BOFiP categorisation, useful for downstream LLM classification.
        content_parts = []
        if description:
            content_parts.append(description)
        if bofip_cat:
            content_parts.append(f"Type BOFiP: {bofip_cat}")
        content = " | ".join(content_parts) if content_parts else None

        # extra_meta : on stocke la classif BOFiP native + l'identifiant
        # juridique, exploitable pour filtrage segment EC (IS, IR, TVA, BIC...)
        # via taxonomy_indicators côté processors.
        extra_meta = {
            "bofip_identifier": bofip_id,
            "bofip_category": bofip_cat or None,
        }

        article = {
            "source": self.SOURCE_NAME,
            "source_id": f"bofip-{bofip_id}",
            "title": title or "Sans titre",
            "url": url or None,
            "content": content[:5000] if content else None,
            "published_date": published_date,
            "category": _category_from_bofip(bofip_cat),
            "status": "new",
            # Multi-secteur : pré-tag pour le persona EC.
            "extra_meta_payload": extra_meta,
        }

        return article

    # ------------------------------------------------------------------
    # HTML fallback (page actualités)
    # ------------------------------------------------------------------

    def _fetch_html_fallback(self) -> list[dict]:
        """Scrape the BOFiP actualités HTML page when RSS is unavailable.

        Pattern observé : <a href="/bofip/NNNN-PGP.html/ACTU-YYYY-NNNNN"
                              title="DD/MM/YYYY : titre court">titre</a>
        """
        self.logger.info("BOFiP: fallback HTML actualités")
        try:
            response = self._session.get(BOFIP_HTML_FALLBACK_URL, timeout=self.timeout)
            response.raise_for_status()
        except requests.RequestException as e:
            self.logger.warning(f"BOFiP: erreur acces page HTML: {e}")
            return []

        return self._parse_html_fallback(response.text)

    def _parse_html_fallback(self, html: str) -> list[dict]:
        """Extract ACTU links from the BOFiP actualités index page."""
        articles: list[dict] = []
        # Capture: full href, ACTU id, title attribute (date + colon + résumé), inner text
        link_re = re.compile(
            r'<a\s+[^>]*href="(/bofip/[^"]*?(ACTU-\d{4}-\d{4,6}))"[^>]*'
            r'title="(\d{2}/\d{2}/\d{4})\s*:\s*([^"]*)"[^>]*>([^<]*)</a>',
            re.IGNORECASE | re.DOTALL,
        )
        seen = set()

        for match in link_re.finditer(html):
            path, actu_id, date_str, title_attr, link_text = match.groups()
            if actu_id in seen:
                continue
            seen.add(actu_id)

            title = (link_text or title_attr or "").strip()
            title = unescape(_strip_html(title))
            if not title:
                continue

            try:
                d, m, y = date_str.split("/")
                published_date = f"{y}-{m.zfill(2)}-{d.zfill(2)}"
            except ValueError:
                published_date = None

            url = f"https://bofip.impots.gouv.fr{path}"

            articles.append({
                "source": self.SOURCE_NAME,
                "source_id": f"bofip-{actu_id}",
                "title": title[:500],
                "url": url,
                "content": None,
                "published_date": published_date,
                "category": "reglementaire",
                "status": "new",
                "extra_meta_payload": {
                    "bofip_identifier": actu_id,
                    "bofip_category": "Actualité",
                },
            })

        self.logger.info(f"BOFiP: {len(articles)} actualités via fallback HTML")
        return articles

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def collect(self) -> list[dict]:
        """Fetch BOFiP texts via RSS, with HTML fallback on failure.

        Returns:
            List of article dicts. Deduplicated by source_id.
        """
        articles: list[dict] = []
        seen_ids: set[str] = set()

        # 1. Primary: RSS 2.0 feed
        try:
            self.logger.info(f"BOFiP: chargement flux RSS ({BOFIP_RSS_URL})")
            xml_content = self._fetch_rss()
            rss_articles = self._parse_rss_feed(xml_content)
            self.logger.info(f"BOFiP: {len(rss_articles)} entrées RSS")
            for article in rss_articles:
                sid = article["source_id"]
                if sid not in seen_ids:
                    seen_ids.add(sid)
                    articles.append(article)
        except requests.RequestException as e:
            self.logger.warning(f"BOFiP: flux RSS indisponible ({e}), passage en fallback HTML")
        except Exception as e:
            self.logger.error(f"BOFiP: erreur inattendue parsing RSS: {e}")

        # 2. Fallback HTML : appelé seulement si le RSS n'a rien donné
        if not articles:
            try:
                html_articles = self._fetch_html_fallback()
                for article in html_articles:
                    sid = article["source_id"]
                    if sid not in seen_ids:
                        seen_ids.add(sid)
                        articles.append(article)
            except Exception as e:
                self.logger.error(f"BOFiP: erreur inattendue fallback HTML: {e}")

        self.logger.info(f"BOFiP: {len(articles)} textes uniques collectés")
        return articles
