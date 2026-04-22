"""France Travail AAP scraper for VeilleFormation.fr.

Collects calls for proposals (appels a projets) from France Travail
focused on training and employment initiatives.

Updated 2026-03-18: Regional AAP pages no longer exist, use search instead.
"""

import re
import hashlib
from datetime import datetime
from typing import Optional
from urllib.parse import urljoin, urlencode

import httpx
from bs4 import BeautifulSoup

from collectors.base import BaseCollector


HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.5",
}

TIMEOUT = 30

# France Travail search URLs for AAP
SEARCH_URLS = [
    {
        "name": "Recherche AAP Formation",
        "url": "https://www.francetravail.fr/informations/ma-recherche.html",
        "params": {"q": "appel projet formation"},
    },
    {
        "name": "Recherche Marches Formation",
        "url": "https://www.francetravail.fr/informations/ma-recherche.html",
        "params": {"q": "marche formation"},
    },
]


def make_source_id(source: str, url: str) -> str:
    """Generate a deterministic source_id from URL hash."""
    h = hashlib.md5(url.encode()).hexdigest()[:12]
    return f"{source}-{h}"


def extract_date_fr(text: str) -> Optional[str]:
    """Try to extract a French date from text. Returns YYYY-MM-DD or None."""
    if not text:
        return None

    months_fr = {
        "janvier": "01", "fevrier": "02", "février": "02", "mars": "03",
        "avril": "04", "mai": "05", "juin": "06", "juillet": "07",
        "aout": "08", "aout": "08", "septembre": "09", "octobre": "10",
        "novembre": "11", "decembre": "12", "decembre": "12",
    }

    # "12 mars 2025" or "12 Mars 2025"
    m = re.search(r"(\d{1,2})\s+([\wéûô]+)\s+(\d{4})", text.lower())
    if m:
        day, month_name, year = m.groups()
        month_num = months_fr.get(month_name)
        if month_num:
            return f"{year}-{month_num}-{int(day):02d}"

    # "12/03/2025"
    m = re.search(r"(\d{2})/(\d{2})/(\d{4})", text)
    if m:
        day, month, year = m.groups()
        return f"{year}-{month}-{day}"

    return None


class FranceTravailCollector(BaseCollector):
    """Scraper for France Travail appels a projets via search."""

    SOURCE_NAME = "france_travail"
    BASE_URL = "https://www.francetravail.fr"

    def __init__(self, db_path: str, logger=None):
        super().__init__(db_path, logger)
        self.search_urls = SEARCH_URLS

    def collect(self) -> list[dict]:
        """Collect AAPs from France Travail search results."""
        all_articles = []
        client = httpx.Client(headers=HEADERS, timeout=TIMEOUT, follow_redirects=True)

        try:
            for search_config in self.search_urls:
                search_name = search_config["name"]
                base_url = search_config["url"]
                params = search_config["params"]

                full_url = f"{base_url}?{urlencode(params)}"
                self.logger.info(f"France Travail: searching {search_name}")

                try:
                    resp = client.get(full_url)
                    if resp.status_code == 404:
                        self.logger.debug(f"France Travail: 404 pour {search_name}")
                        continue
                    resp.raise_for_status()
                except httpx.HTTPError as e:
                    self.logger.warning(f"France Travail: erreur {search_name}: {e}")
                    continue

                soup = BeautifulSoup(resp.text, "lxml")
                articles = self._parse_search_results(soup, full_url)
                all_articles.extend(articles)

                if articles:
                    self.logger.info(f"France Travail {search_name}: {len(articles)} items")

        finally:
            client.close()

        return all_articles

    def _parse_search_results(self, soup: BeautifulSoup, page_url: str) -> list[dict]:
        """Parse France Travail search results page."""
        articles = []
        seen_urls = set()

        # France Travail search result selectors
        selectors = [
            ".search-result",
            ".result-item",
            "article",
            ".list-item",
            ".card",
            ".view-content .item",
            "main .item",
            ".results-list li",
        ]

        for selector in selectors:
            for element in soup.select(selector):
                link = element.find("a", href=True)
                if not link or not link.get("href"):
                    continue

                href = link["href"]
                full_url = urljoin(self.BASE_URL, href)

                # Skip duplicates and external links
                if full_url in seen_urls:
                    continue
                if not full_url.startswith(self.BASE_URL):
                    continue
                if href.startswith("#") or "mailto:" in href:
                    continue

                # Get title
                title = ""
                h = element.find(["h2", "h3", "h4", "h5"])
                if h:
                    title = h.get_text(strip=True)
                else:
                    title = link.get_text(strip=True)

                # Must have meaningful title
                if not title or len(title) < 15:
                    continue

                # Skip navigation/common links
                skip_words = [
                    "accueil", "contact", "mentions legales", "plan du site",
                    "accessibilite", "cookies", "se connecter", "connexion",
                    "lire la suite", "en savoir plus", "voir tous", "retour",
                    "rechercher"
                ]
                title_lower = title.lower().strip()
                if title_lower in skip_words or len(title.split()) < 3:
                    continue

                # Filter for AAP-relevant content
                text_lower = (title + " " + href).lower()
                relevant_keywords = [
                    "appel", "offre", "marche", "consultation", "projet",
                    "formation", "emploi", "insertion", "qualification",
                    "prestation", "service", "fourniture"
                ]
                if not any(kw in text_lower for kw in relevant_keywords):
                    continue

                # Look for date
                date_str = None
                parent = element.find_parent(["article", "li", "div"])
                if parent:
                    time_el = parent.find("time")
                    if time_el:
                        date_str = time_el.get("datetime", "")[:10]
                        if not date_str:
                            date_str = extract_date_fr(time_el.get_text(strip=True))
                    else:
                        date_el = parent.find(class_=re.compile(r"date|time|meta", re.I))
                        if date_el:
                            date_str = extract_date_fr(date_el.get_text(strip=True))

                seen_urls.add(full_url)

                # Get description/summary
                content = None
                desc_el = element.find(class_=re.compile(r"desc|summary|excerpt|chapo|teaser", re.I))
                if desc_el:
                    content = desc_el.get_text(strip=True)

                # Try to extract region from title or content
                region = None
                region_patterns = [
                    r"(Ile-de-France|Auvergne-Rhone-Alpes|Hauts-de-France|Nouvelle-Aquitaine|Occitanie|Grand-Est|PACA|Pays de la Loire|Bretagne|Normandie|Bourgogne-Franche-Comte|Centre-Val de Loire|Corse)",
                ]
                for pattern in region_patterns:
                    m = re.search(pattern, (title + " " + (content or "")).lower(), re.I)
                    if m:
                        region = m.group(1).replace("-", " ").title()
                        break

                articles.append({
                    "source": self.SOURCE_NAME,
                    "source_id": make_source_id(self.SOURCE_NAME, full_url),
                    "title": title[:500],
                    "url": full_url,
                    "content": content,
                    "published_date": date_str,
                    "category": "ao",
                    "status": "new",
                    "acheteur": "France Travail",
                    "region": region,
                })

        return articles


def collect_france_travail(db_path: str, logger=None) -> dict:
    """Run the France Travail collector and return stats."""
    collector = FranceTravailCollector(db_path, logger)
    return collector.run()
