"""Conseils Regionaux AAP scraper for Cipia.

Collects calls for proposals (appels a projets) from French regional councils
focused on training, employment, and professional development initiatives.

Updated 2026-03-18 with current URLs.
"""

import re
import hashlib
from datetime import datetime
from typing import Optional
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

from collectors.base import BaseCollector


HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.5",
}

TIMEOUT = 5  # 5s par requete : avec 13 regions x ~2 paths, max ~130s en pire cas
             # (vs 30s avant qui donnait 240s+ de runs en prod)

# Regional council configurations with updated URLs (2026-03)
REGIONAL_COUNCILS = [
    {
        "name": "Ile-de-France",
        "base_url": "https://www.iledefrance.fr",
        "paths": ["/aides-et-appels-a-projets"],
    },
    {
        "name": "Auvergne-Rhone-Alpes",
        "base_url": "https://www.auvergnerhonealpes.fr",
        "paths": ["/appels-a-projets", "/actualites/appels-a-projets"],
    },
    {
        "name": "Hauts-de-France",
        "base_url": "https://www.hautsdefrance.fr",
        "paths": ["/appels-a-projets", "/actualites?type=297"],
    },
    {
        "name": "Nouvelle-Aquitaine",
        "base_url": "https://www.nouvelle-aquitaine.fr",
        "paths": ["/appels-a-projets", "/actualites/appels-a-projets"],
    },
    {
        "name": "Occitanie",
        "base_url": "https://www.laregion.fr",
        "paths": ["/appels-a-projets", "/appels-a-projets-formation"],
    },
    {
        "name": "Grand-Est",
        "base_url": "https://www.grandest.fr",
        "paths": ["/appels-a-projets", "/vos-aides/appels-a-projets"],
    },
    {
        "name": "PACA",
        "base_url": "https://www.maregionsud.fr",
        "paths": ["/appels-a-projets", "/aides/appels-a-projets"],
    },
    {
        "name": "Pays-de-la-Loire",
        "base_url": "https://www.paysdelaloire.fr",
        "paths": ["/appels-a-projets", "/aides-et-appels-a-projets"],
    },
    {
        "name": "Bretagne",
        "base_url": "https://www.bretagne.bzh",
        "paths": ["/appels-a-projets", "/aides/appels-a-projets"],
    },
    {
        "name": "Normandie",
        "base_url": "https://www.normandie.fr",
        "paths": ["/appels-a-projets", "/aides-et-appels-a-projets"],
    },
    {
        "name": "Bourgogne-Franche-Comte",
        "base_url": "https://www.bourgognefranchecomte.fr",
        "paths": ["/appels-a-projets", "/aides/appels-a-projets"],
    },
    {
        "name": "Centre-Val-de-Loire",
        "base_url": "https://www.centre-valdeloire.fr",
        "paths": ["/appels-a-projets", "/aides-et-appels-a-projets"],
    },
    {
        "name": "Corse",
        "base_url": "https://www.corse.fr",
        "paths": ["/appels-a-projets", "/aides-et-subventions"],
    },
]

# Agregateurs d'appels d'offres publics
AGREGATEURS = [
    {
        "name": "France Marches",
        "base_url": "https://www.francemarches.com",
        "paths": ["/appels-offres", "/appels-offres/formation"],
    },
    {
        "name": "E-Marchespublics",
        "base_url": "https://www.e-marchespublics.com",
        "paths": ["/appels-offres", "/recherche?motcle=formation"],
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
        "août": "08", "aout": "08", "septembre": "09", "octobre": "10",
        "novembre": "11", "décembre": "12", "decembre": "12",
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


class RegionsCollector(BaseCollector):
    """Scraper for Conseils Regionaux appels a projets."""

    SOURCE_NAME = "region"

    def __init__(self, db_path: str, logger=None):
        super().__init__(db_path, logger)
        self.regions = REGIONAL_COUNCILS
        self.aggregateurs = AGREGATEURS

    def collect(self) -> list[dict]:
        """Collect AAPs from all regional council pages."""
        all_articles = []
        client = httpx.Client(headers=HEADERS, timeout=TIMEOUT, follow_redirects=True)

        try:
            # Scrape regional councils
            for region_config in self.regions:
                region_name = region_config["name"]
                base_url = region_config["base_url"]

                for path in region_config["paths"]:
                    url = base_url + path
                    self.logger.info(f"Regions: scraping {region_name} - {url}")

                    try:
                        resp = client.get(url)
                        if resp.status_code == 404:
                            self.logger.debug(f"Regions: 404 pour {region_name} {path}")
                            continue
                        resp.raise_for_status()
                    except httpx.HTTPError as e:
                        self.logger.debug(f"Regions: erreur {region_name} {path}: {e}")
                        continue

                    soup = BeautifulSoup(resp.text, "lxml")
                    articles = self._parse_region_page(soup, url, region_name, base_url)
                    all_articles.extend(articles)

                    if articles:
                        self.logger.info(f"Regions {region_name}: {len(articles)} items sur {path}")

            # Scrape agregateurs
            for agg_config in self.aggregateurs:
                agg_name = agg_config["name"]
                base_url = agg_config["base_url"]

                for path in agg_config["paths"]:
                    url = base_url + path
                    self.logger.info(f"Agregateur: scraping {agg_name} - {url}")

                    try:
                        resp = client.get(url)
                        if resp.status_code == 404:
                            continue
                        resp.raise_for_status()
                    except httpx.HTTPError as e:
                        self.logger.debug(f"Agregateur: erreur {agg_name}: {e}")
                        continue

                    soup = BeautifulSoup(resp.text, "lxml")
                    articles = self._parse_agregateur_page(soup, url, agg_name, base_url)
                    all_articles.extend(articles)

                    if articles:
                        self.logger.info(f"Agregateur {agg_name}: {len(articles)} items")

        finally:
            client.close()

        # Deduplicate by URL
        seen = set()
        unique_articles = []
        for article in all_articles:
            if article["url"] not in seen:
                seen.add(article["url"])
                unique_articles.append(article)

        return unique_articles

    def _parse_region_page(self, soup: BeautifulSoup, page_url: str, region_name: str, base_url: str) -> list[dict]:
        """Parse a regional council AAP page."""
        articles = []
        seen_urls = set()

        # Selecteurs specifiques par region
        region_selectors = {
            "Ile-de-France": [".view-content article", ".card-item", ".teaser-item", "article.node"],
            "Auvergne-Rhone-Alpes": [".view-content .views-row", "article.card", ".list-item"],
            "Grand-Est": [".view-content .views-row", "article", ".card"],
            "PACA": [".view-content .views-row", "article.card", ".list-item"],
        }

        # Use region-specific selectors or fall back to generic
        selectors = region_selectors.get(region_name, [
            "article",
            ".card",
            ".list-item",
            ".news-item",
            ".views-row",
            ".node",
            ".teaser",
            ".view-content .item",
            "main article",
        ])

        for selector in selectors:
            for element in soup.select(selector):
                link = element.find("a", href=True)
                if not link or not link.get("href"):
                    continue

                href = link["href"]
                full_url = urljoin(base_url, href)

                # Skip duplicates
                if full_url in seen_urls:
                    continue

                # Skip external links and navigation
                if not (full_url.startswith(base_url) or
                        full_url.startswith(base_url.replace("www.", "")) or
                        base_url.replace("www.", "") in full_url):
                    continue
                if href.startswith("#") or "mailto:" in href:
                    continue

                # Get title
                title = ""
                h = element.find(["h2", "h3", "h4"])
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
                    "telecharger", "pdf", "consulter", "partager"
                ]
                title_lower = title.lower().strip()
                if title_lower in skip_words or len(title.split()) < 3:
                    continue

                # Look for date
                date_str = None
                time_el = element.find("time")
                if time_el:
                    date_str = time_el.get("datetime", "")[:10]
                    if not date_str:
                        date_str = extract_date_fr(time_el.get_text(strip=True))
                else:
                    date_el = element.find(class_=re.compile(r"date|time|meta|published", re.I))
                    if date_el:
                        date_str = extract_date_fr(date_el.get_text(strip=True))

                seen_urls.add(full_url)

                # Get description/summary
                content = None
                desc_el = element.find(class_=re.compile(r"desc|summary|excerpt|chapo|teaser|body", re.I))
                if desc_el:
                    content = desc_el.get_text(strip=True)

                # Determine category
                category = "ao"
                text_lower = (title + " " + (content or "")).lower()
                if any(kw in text_lower for kw in ["financement", "subvention", "fonds", "budget", "aide"]):
                    category = "financement"

                articles.append({
                    "source": self.SOURCE_NAME,
                    "source_id": make_source_id(self.SOURCE_NAME, full_url),
                    "title": title[:500],
                    "url": full_url,
                    "content": content,
                    "published_date": date_str,
                    "category": category,
                    "status": "new",
                    "acheteur": f"Region {region_name}",
                    "region": region_name,
                })

        return articles

    def _parse_agregateur_page(self, soup: BeautifulSoup, page_url: str, agg_name: str, base_url: str) -> list[dict]:
        """Parse an agregateur AAP page."""
        articles = []
        seen_urls = set()

        # Generic selectors for agregateur sites
        selectors = [
            ".result-item",
            ".appel-offre",
            ".ao-item",
            ".list-item",
            "article",
            "tr.result",
            ".search-result",
        ]

        for selector in selectors:
            for element in soup.select(selector):
                link = element.find("a", href=True)
                if not link or not link.get("href"):
                    continue

                href = link["href"]
                full_url = urljoin(base_url, href)

                if full_url in seen_urls:
                    continue

                # Get title
                title = link.get_text(strip=True)
                if not title or len(title) < 15:
                    h = element.find(["h2", "h3", "h4", "strong"])
                    if h:
                        title = h.get_text(strip=True)

                if not title or len(title) < 15:
                    continue

                # Look for date
                date_str = None
                time_el = element.find("time")
                if time_el:
                    date_str = time_el.get("datetime", "")[:10]
                else:
                    date_el = element.find(class_=re.compile(r"date|deadline|echeance", re.I))
                    if date_el:
                        date_str = extract_date_fr(date_el.get_text(strip=True))

                seen_urls.add(full_url)

                # Get description
                content = None
                desc_el = element.find(class_=re.compile(r"desc|summary|detail|content", re.I))
                if desc_el:
                    content = desc_el.get_text(strip=True)

                # Try to extract region
                region = None
                region_el = element.find(class_=re.compile(r"region|lieu|localisation", re.I))
                if region_el:
                    region = region_el.get_text(strip=True)

                articles.append({
                    "source": f"agregateur_{agg_name.lower().replace('-', '_').replace(' ', '_')}",
                    "source_id": make_source_id(f"agg_{agg_name}", full_url),
                    "title": title[:500],
                    "url": full_url,
                    "content": content,
                    "published_date": date_str,
                    "category": "ao",
                    "status": "new",
                    "acheteur": agg_name,
                    "region": region,
                })

        return articles


def collect_regions(db_path: str, logger=None) -> dict:
    """Run the Regions collector and return stats."""
    collector = RegionsCollector(db_path, logger)
    return collector.run()
