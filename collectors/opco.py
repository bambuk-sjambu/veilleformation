"""OPCO scrapers for Cipia.

Collects calls for proposals (appels a projets) and news from
the 11 French OPCO websites relevant to training organizations.

Updated 2026-03-18 with improved selectors and additional OPCOs.

Working OPCOs:
- OPCO Sante: static HTML, appels d'offres page
- L'OPCOMMERCE: static HTML, appels d'offres page
- AKTO: httpx, appels d'offres page
- OPCO 2i: WordPress-like, appels d'offres page
- Uniformation: httpx, appels d'offre page
- OPCO EP: static HTML, marches publics page

Inaccessible or JS-heavy:
- OCAPIAT, OPCO Mobilites, ATLAS, Constructys (timeouts/SSL)
- AFDAS (redirects, page structure changed)
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

TIMEOUT = 25


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


def extract_articles_from_links(soup: BeautifulSoup, base_url: str, source_name: str, opco_name: str,
                                url_patterns: list[str] = None) -> list[dict]:
    """Generic article extraction from links in a page."""
    articles = []
    seen_urls = set()

    # Patterns to look for in URLs
    if url_patterns is None:
        url_patterns = ["appel", "offre", "marche", "consultation", "projet", "ao", "aap"]

    for a in soup.find_all("a", href=True):
        href = a.get("href", "")
        if not href or href == "#" or href.startswith("javascript:"):
            continue
        if "mailto:" in href:
            continue

        full_url = urljoin(base_url, href)

        # Skip duplicates and external links
        if full_url in seen_urls:
            continue
        if not (full_url.startswith(base_url) or
                full_url.startswith(base_url.replace("www.", ""))):
            continue

        # Check if URL looks like an AAP
        href_lower = href.lower()
        if not any(p in href_lower for p in url_patterns):
            continue

        # Get title
        title = a.get_text(strip=True)
        if not title or len(title) < 15:
            # Try parent or siblings
            parent = a.find_parent(["div", "li", "article", "section"])
            if parent:
                h = parent.find(["h2", "h3", "h4", "strong"])
                if h:
                    title = h.get_text(strip=True)

        if not title or len(title) < 15:
            continue

        # Skip generic links
        generic = ["consulter", "candidater", "telecharger", "dossier", "en savoir plus",
                   "lire la suite", "voir plus", "acceder", "retour", "accueil", "contact"]
        title_lower = title.lower().strip()
        if title_lower in generic or len(title.split()) < 4:
            continue

        seen_urls.add(full_url)

        # Look for date nearby
        date_str = None
        parent = a.find_parent(["div", "li", "article", "section"])
        if parent:
            time_el = parent.find("time")
            if time_el:
                date_str = time_el.get("datetime", "")[:10]
                if not date_str:
                    date_str = extract_date_fr(time_el.get_text(strip=True))
            if not date_str:
                date_el = parent.find(class_=re.compile(r"date|time|meta", re.I))
                if date_el:
                    date_str = extract_date_fr(date_el.get_text(strip=True))

        articles.append({
            "source": source_name,
            "source_id": make_source_id(source_name, full_url),
            "title": title[:500],
            "url": full_url,
            "content": None,
            "published_date": date_str,
            "category": "ao",
            "status": "new",
            "acheteur": opco_name,
            "region": None,
        })

    return articles


class OPCOSanteCollector(BaseCollector):
    """Scraper for OPCO Sante appels d'offres."""

    SOURCE_NAME = "opco_sante"
    OPCO_NAME = "OPCO Sante"
    BASE_URL = "https://www.opco-sante.fr"
    PAGES = ["/prestataire/nos-appels-d-offres/"]

    def collect(self) -> list[dict]:
        articles = []
        client = httpx.Client(headers=HEADERS, timeout=TIMEOUT, follow_redirects=True)

        try:
            for page_path in self.PAGES:
                url = self.BASE_URL + page_path
                self.logger.info(f"OPCO Sante: scraping {url}")

                try:
                    resp = client.get(url)
                    resp.raise_for_status()
                except httpx.HTTPError as e:
                    self.logger.warning(f"OPCO Sante: erreur {url}: {e}")
                    continue

                soup = BeautifulSoup(resp.text, "lxml")
                items = self._parse_list_page(soup, url)
                articles.extend(items)
                self.logger.info(f"OPCO Sante: {len(items)} items depuis {page_path}")
        finally:
            client.close()

        return articles

    def _parse_list_page(self, soup: BeautifulSoup, base_url: str) -> list[dict]:
        articles = []
        seen_urls = set()

        # Try multiple selectors for OPCO Sante
        selectors = [
            "article a[href*='appel']",
            ".view-content a[href]",
            ".field-content a[href]",
            "main a[href*='appel']",
            ".content a[href*='offre']",
        ]

        for selector in selectors:
            for link in soup.select(selector):
                href = link.get("href", "")
                if not href or href == "#":
                    continue

                full_url = urljoin(base_url, href)
                if full_url in seen_urls:
                    continue

                # Get title
                title = link.get_text(strip=True)
                if not title or len(title) < 10:
                    parent = link.find_parent(["article", "div", "li"])
                    if parent:
                        h = parent.find(["h2", "h3", "h4"])
                        if h:
                            title = h.get_text(strip=True)

                if not title or len(title) < 10:
                    continue

                # Skip generic links
                generic = ["consulter", "candidater", "telecharger", "dossier", "en savoir plus"]
                if title.lower().strip() in generic:
                    continue

                seen_urls.add(full_url)

                # Find date
                date_str = None
                parent = link.find_parent(["article", "div", "li"])
                if parent:
                    time_el = parent.find("time")
                    if time_el:
                        date_str = time_el.get("datetime", "")[:10] or extract_date_fr(time_el.get_text())

                articles.append({
                    "source": self.SOURCE_NAME,
                    "source_id": make_source_id(self.SOURCE_NAME, full_url),
                    "title": title[:500],
                    "url": full_url,
                    "content": None,
                    "published_date": date_str,
                    "category": "ao",
                    "status": "new",
                    "acheteur": self.OPCO_NAME,
                    "region": None,
                })

        return articles


class OPCOmmerceCollector(BaseCollector):
    """Scraper for L'OPCOMMERCE appels d'offres."""

    SOURCE_NAME = "opcommerce"
    OPCO_NAME = "L'OPCOMMERCE"
    BASE_URL = "https://www.lopcommerce.com"
    PAGES = ["/partenaire/appels-d-offres/consulter-nos-appels-d-offres/"]

    def collect(self) -> list[dict]:
        articles = []
        client = httpx.Client(headers=HEADERS, timeout=TIMEOUT, follow_redirects=True)

        try:
            for page_path in self.PAGES:
                url = self.BASE_URL + page_path
                self.logger.info(f"OPCOMMERCE: scraping {url}")

                try:
                    resp = client.get(url)
                    resp.raise_for_status()
                except httpx.HTTPError as e:
                    self.logger.error(f"OPCOMMERCE: erreur {url}: {e}")
                    continue

                soup = BeautifulSoup(resp.text, "lxml")
                items = self._parse_page(soup, url)
                articles.extend(items)
                self.logger.info(f"OPCOMMERCE: {len(items)} items collectes")
        finally:
            client.close()

        return articles

    def _parse_page(self, soup: BeautifulSoup, base_url: str) -> list[dict]:
        # Look for content area
        content_area = soup.find("main") or soup.find(class_=re.compile(r"content|main", re.I)) or soup

        # Extract links that look like AAP
        return extract_articles_from_links(
            content_area, base_url, self.SOURCE_NAME, self.OPCO_NAME,
            url_patterns=["appel", "offre", "marche", "ao", "aap", "consultation", "dossier"]
        )


class AKTOCollector(BaseCollector):
    """Scraper for AKTO appels d'offres."""

    SOURCE_NAME = "opco_akto"
    OPCO_NAME = "AKTO"
    BASE_URL = "https://www.akto.fr"
    PAGES = ["/appels-d-offres/"]

    def collect(self) -> list[dict]:
        articles = []
        client = httpx.Client(headers=HEADERS, timeout=TIMEOUT, follow_redirects=True)

        try:
            for page_path in self.PAGES:
                url = self.BASE_URL + page_path
                self.logger.info(f"AKTO: scraping {url}")

                try:
                    resp = client.get(url)
                    resp.raise_for_status()
                except httpx.HTTPError as e:
                    self.logger.error(f"AKTO: erreur {url}: {e}")
                    continue

                soup = BeautifulSoup(resp.text, "lxml")
                items = self._parse_page(soup, url)
                articles.extend(items)
                self.logger.info(f"AKTO: {len(items)} items collectes")
        finally:
            client.close()

        return articles

    def _parse_page(self, soup: BeautifulSoup, base_url: str) -> list[dict]:
        articles = []
        seen_urls = set()

        # AKTO uses card-based layout
        for card in soup.select("article, .card, .node, .views-row, .item-list li, .post"):
            a = card.find("a", href=True)
            if not a:
                continue

            href = a["href"]
            full_url = urljoin(base_url, href)
            if full_url in seen_urls:
                continue

            # Get title
            h = card.find(["h2", "h3", "h4"])
            title = h.get_text(strip=True) if h else a.get_text(strip=True)
            if not title or len(title) < 10:
                continue

            # Skip generic
            if title.lower().strip() in ["consulter", "en savoir plus", "lire la suite"]:
                continue

            seen_urls.add(full_url)

            # Extract date
            date_str = None
            time_el = card.find("time")
            if time_el:
                date_str = time_el.get("datetime", "")[:10] or extract_date_fr(time_el.get_text())

            # Extract summary
            summary_el = card.find(class_=re.compile(r"desc|summary|excerpt|body|chapo", re.I))
            content = summary_el.get_text(strip=True) if summary_el else None

            articles.append({
                "source": self.SOURCE_NAME,
                "source_id": make_source_id(self.SOURCE_NAME, full_url),
                "title": title[:500],
                "url": full_url,
                "content": content,
                "published_date": date_str,
                "category": "ao",
                "status": "new",
                "acheteur": self.OPCO_NAME,
                "region": None,
            })

        return articles


class OPCO2iCollector(BaseCollector):
    """Scraper for OPCO 2i appels d'offres."""

    SOURCE_NAME = "opco_2i"
    OPCO_NAME = "OPCO 2i"
    BASE_URL = "https://www.opco2i.fr"
    PAGES = ["/appels-doffres/"]

    def collect(self) -> list[dict]:
        articles = []
        client = httpx.Client(headers=HEADERS, timeout=TIMEOUT, follow_redirects=True)

        try:
            for page_path in self.PAGES:
                url = self.BASE_URL + page_path
                self.logger.info(f"OPCO 2i: scraping {url}")

                try:
                    resp = client.get(url)
                    resp.raise_for_status()
                except httpx.HTTPError as e:
                    self.logger.error(f"OPCO 2i: erreur {url}: {e}")
                    continue

                soup = BeautifulSoup(resp.text, "lxml")
                items = self._parse_page(soup, url)
                articles.extend(items)
                self.logger.info(f"OPCO 2i: {len(items)} items collectes")
        finally:
            client.close()

        return articles

    def _parse_page(self, soup: BeautifulSoup, base_url: str) -> list[dict]:
        articles = []
        seen_urls = set()

        # OPCO 2i uses WordPress-like structure
        selectors = [
            "article.post",
            ".post-item",
            ".entry",
            ".wp-block-post",
            ".card",
            "main article",
        ]

        for selector in selectors:
            for card in soup.select(selector):
                a = card.find("a", href=True)
                if not a:
                    continue

                href = a["href"]
                full_url = urljoin(base_url, href)
                if full_url in seen_urls:
                    continue
                if not full_url.startswith(self.BASE_URL):
                    continue

                h = card.find(["h2", "h3", "h4"])
                title = h.get_text(strip=True) if h else a.get_text(strip=True)
                if not title or len(title) < 10:
                    continue

                seen_urls.add(full_url)

                date_str = None
                time_el = card.find("time")
                if time_el:
                    date_str = time_el.get("datetime", "")[:10]

                excerpt_el = card.find(class_=re.compile(r"excerpt|desc|summary|chapo", re.I))
                content = excerpt_el.get_text(strip=True) if excerpt_el else None

                articles.append({
                    "source": self.SOURCE_NAME,
                    "source_id": make_source_id(self.SOURCE_NAME, full_url),
                    "title": title[:500],
                    "url": full_url,
                    "content": content,
                    "published_date": date_str,
                    "category": "ao",
                    "status": "new",
                    "acheteur": self.OPCO_NAME,
                    "region": None,
                })

        # Fallback: generic link extraction
        if not articles:
            content_area = soup.find("main") or soup
            articles = extract_articles_from_links(
                content_area, base_url, self.SOURCE_NAME, self.OPCO_NAME
            )

        return articles


class UniformationCollector(BaseCollector):
    """Scraper for Uniformation appels d'offre."""

    SOURCE_NAME = "uniformation"
    OPCO_NAME = "Uniformation"
    BASE_URL = "https://www.uniformation.fr"
    PAGES = ["/partenaire-prestataire/appels-doffre"]

    def collect(self) -> list[dict]:
        articles = []
        client = httpx.Client(headers=HEADERS, timeout=TIMEOUT, follow_redirects=True)

        try:
            for page_path in self.PAGES:
                url = self.BASE_URL + page_path
                self.logger.info(f"Uniformation: scraping {url}")

                try:
                    resp = client.get(url)
                    resp.raise_for_status()
                except httpx.HTTPError as e:
                    self.logger.error(f"Uniformation: erreur {url}: {e}")
                    continue

                soup = BeautifulSoup(resp.text, "lxml")
                items = self._parse_page(soup, url)
                articles.extend(items)
                self.logger.info(f"Uniformation: {len(items)} items collectes")
        finally:
            client.close()

        return articles

    def _parse_page(self, soup: BeautifulSoup, base_url: str) -> list[dict]:
        articles = []
        seen_urls = set()

        for card in soup.select("article, .card, .node, .views-row, .view-content .item-list li, .teaser"):
            a = card.find("a", href=True)
            if not a:
                continue

            href = a["href"]
            full_url = urljoin(base_url, href)
            if full_url in seen_urls:
                continue

            h = card.find(["h2", "h3", "h4"])
            title = h.get_text(strip=True) if h else a.get_text(strip=True)
            if not title or len(title) < 10:
                continue

            seen_urls.add(full_url)

            date_str = None
            date_el = card.find(class_=re.compile(r"date|time", re.I))
            if date_el:
                date_str = extract_date_fr(date_el.get_text(strip=True))

            excerpt_el = card.find(class_=re.compile(r"desc|summary|excerpt|body|chapo|teaser", re.I))
            content = excerpt_el.get_text(strip=True) if excerpt_el else None

            articles.append({
                "source": self.SOURCE_NAME,
                "source_id": make_source_id(self.SOURCE_NAME, full_url),
                "title": title[:500],
                "url": full_url,
                "content": content,
                "published_date": date_str,
                "category": "ao",
                "status": "new",
                "acheteur": self.OPCO_NAME,
                "region": None,
            })

        return articles


class OPCOEPCollector(BaseCollector):
    """Scraper for OPCO EP marches publics."""

    SOURCE_NAME = "opco_ep"
    OPCO_NAME = "OPCO EP"
    BASE_URL = "https://www.opcoep.fr"
    PAGES = ["/marches-publics"]

    def collect(self) -> list[dict]:
        articles = []
        client = httpx.Client(headers=HEADERS, timeout=TIMEOUT, follow_redirects=True)

        try:
            for page_path in self.PAGES:
                url = self.BASE_URL + page_path
                self.logger.info(f"OPCO EP: scraping {url}")

                try:
                    resp = client.get(url)
                    resp.raise_for_status()
                except httpx.HTTPError as e:
                    self.logger.error(f"OPCO EP: erreur {url}: {e}")
                    continue

                soup = BeautifulSoup(resp.text, "lxml")
                items = self._parse_page(soup, url)
                articles.extend(items)
                self.logger.info(f"OPCO EP: {len(items)} items collectes")
        finally:
            client.close()

        return articles

    def _parse_page(self, soup: BeautifulSoup, base_url: str) -> list[dict]:
        content_area = soup.find("main") or soup.find(class_=re.compile(r"content|main", re.I)) or soup
        return extract_articles_from_links(
            content_area, base_url, self.SOURCE_NAME, self.OPCO_NAME,
            url_patterns=["appel", "offre", "marche", "consultation", "ao", "aap", "dossier", "document"]
        )


# Registry of all OPCO collectors
OPCO_COLLECTORS = {
    "opco_sante": OPCOSanteCollector,
    "opcommerce": OPCOmmerceCollector,
    "opco_akto": AKTOCollector,
    "opco_2i": OPCO2iCollector,
    "uniformation": UniformationCollector,
    "opco_ep": OPCOEPCollector,
}


def collect_all_opco(db_path: str, logger=None) -> list[dict]:
    """Run all OPCO collectors and return combined stats."""
    all_stats = []
    for name, collector_cls in OPCO_COLLECTORS.items():
        try:
            collector = collector_cls(db_path, logger)
            stats = collector.run()
            all_stats.append(stats)
        except Exception as e:
            if logger:
                logger.error(f"OPCO {name}: erreur fatale: {e}")
            all_stats.append({
                "source": name,
                "collected": 0,
                "inserted": 0,
                "errors": [str(e)],
            })
    return all_stats
