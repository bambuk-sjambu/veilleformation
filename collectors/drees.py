"""DREES collector — RSS de la Direction de la Recherche, des Études, de
l'Évaluation et des Statistiques.

Source officielle pour la veille statistique et études santé/social :
- https://drees.solidarites-sante.gouv.fr/rss.xml
  (publications, communiqués de presse, jeux de données)

Persona cible : Médical libéral (recommandations HAS, statistiques santé,
rémunérations professionnels, parcours patient) — Pivot multi-secteurs Cipia.

Pas d'authentification. RSS public stable. ~50-100 publications/an.
"""

import hashlib
import re
import xml.etree.ElementTree as ET
from datetime import datetime
from email.utils import parsedate_to_datetime
from html import unescape
from typing import Optional

import requests

from collectors.base import BaseCollector


DREES_RSS_URL = "https://drees.solidarites-sante.gouv.fr/rss.xml"
USER_AGENT = "Cipia/1.0 (veille reglementaire sante - https://cipia.fr)"


def _strip_html(html_text: Optional[str]) -> str:
    if not html_text:
        return ""
    text = re.sub(r"<[^>]+>", " ", html_text)
    text = unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def _hash_url(url: str) -> str:
    return hashlib.sha1(url.encode("utf-8", errors="replace")).hexdigest()[:16]


class DREESCollector(BaseCollector):
    """Collector pour le flux RSS DREES (santé, études, données)."""

    SOURCE_NAME = "drees"
    SECTOR_ID = "medical"
    DEFAULT_CATEGORY = "reglementaire"

    def __init__(self, db_path: str, logger=None, timeout: int = 30):
        super().__init__(db_path, logger)
        self.timeout = timeout

    def collect(self) -> list[dict]:
        try:
            self.logger.info(f"DREES: fetch RSS {DREES_RSS_URL}")
            r = requests.get(
                DREES_RSS_URL,
                headers={"User-Agent": USER_AGENT, "Accept": "application/rss+xml"},
                timeout=self.timeout,
            )
            r.raise_for_status()
        except requests.RequestException as e:
            self.logger.error(f"DREES: erreur fetch: {e}")
            return []

        try:
            root = ET.fromstring(r.content)
        except ET.ParseError as e:
            self.logger.error(f"DREES: XML invalide: {e}")
            return []

        items = root.findall(".//item")
        self.logger.info(f"DREES: {len(items)} entrées RSS")

        articles = []
        seen_urls = set()
        for item in items:
            title = (item.findtext("title") or "").strip()
            url = (item.findtext("link") or "").strip()
            description = _strip_html(item.findtext("description"))
            pub = item.findtext("pubDate")

            if not title or not url:
                continue
            if url in seen_urls:
                continue
            seen_urls.add(url)

            # Date de publication (RFC 2822) → ISO YYYY-MM-DD
            published_date = None
            if pub:
                try:
                    dt = parsedate_to_datetime(pub)
                    published_date = dt.date().isoformat()
                except (TypeError, ValueError):
                    pass
            if not published_date:
                published_date = datetime.now().date().isoformat()

            source_id = _hash_url(url)
            articles.append({
                "source": self.SOURCE_NAME,
                "source_id": source_id,
                "title": title[:500],
                "url": url,
                "content": description[:5000] if description else None,
                "summary": None,
                "published_date": published_date,
                "category": self.DEFAULT_CATEGORY,
                "status": "new",
            })

        self.logger.info(f"DREES: {len(articles)} articles uniques collectés")
        return articles
