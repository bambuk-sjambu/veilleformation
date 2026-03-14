"""OPCO scrapers for VeilleFormation.fr.

Collects calls for proposals (appels a projets) and news from
the 11 French OPCO websites relevant to training organizations.

Accessible OPCOs:
- OPCO Sante: static HTML, appels d'offres page
- L'OPCOMMERCE: static HTML, appels d'offres page
- AKTO: httpx, appels d'offres page
- OPCO 2i: httpx, appels d'offres page
- Uniformation: httpx, appels d'offre page

Inaccessible (timeouts/SSL/connection errors):
- OCAPIAT, OPCO Mobilites, ATLAS, Constructys
- OPCO EP, AFDAS (redirect to external platforms)
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

TIMEOUT = 20


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


class OPCOSanteCollector(BaseCollector):
    """Scraper for OPCO Sante appels d'offres."""

    SOURCE_NAME = "opco"
    OPCO_NAME = "opco_sante"
    BASE_URL = "https://www.opco-sante.fr"
    PAGES = [
        "/prestataire/nos-appels-d-offres/",
    ]

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

        # Look for article cards / links in common patterns
        for link in soup.select("article a[href], .card a[href], .view-content a[href], .field-content a[href]"):
            href = link.get("href", "")
            if not href or href == "#":
                continue

            full_url = urljoin(base_url, href)
            title = link.get_text(strip=True)
            if not title or len(title) < 10:
                # Try parent for title
                parent = link.find_parent(["article", "div", "li"])
                if parent:
                    h = parent.find(["h2", "h3", "h4"])
                    if h:
                        title = h.get_text(strip=True)

            if not title or len(title) < 10:
                continue

            # Skip generic navigation links
            generic = ["consulter", "candidater", "telecharger", "dossier", "en savoir plus",
                        "lire la suite", "voir plus", "acceder", "retour"]
            if title.lower().strip() in generic or len(title.split()) < 4:
                continue

            # Find date nearby
            parent = link.find_parent(["article", "div", "li"])
            date_text = ""
            if parent:
                date_el = parent.find(class_=re.compile(r"date|time|meta", re.I))
                if date_el:
                    date_text = date_el.get_text(strip=True)
                time_el = parent.find("time")
                if time_el:
                    date_text = time_el.get("datetime", "") or time_el.get_text(strip=True)

            articles.append({
                "source": "opco",
                "source_id": make_source_id(self.OPCO_NAME, full_url),
                "title": title[:500],
                "url": full_url,
                "content": None,
                "published_date": extract_date_fr(date_text),
                "category": "financement",
                "status": "new",
                "acheteur": "OPCO Sante",
                "region": None,
            })

        # Fallback: scan all h2/h3 with nearby links
        if not articles:
            for heading in soup.select("h2, h3"):
                a = heading.find("a")
                if not a:
                    a = heading.find_next("a")
                if not a or not a.get("href"):
                    continue

                title = heading.get_text(strip=True)
                if len(title) < 10:
                    continue

                full_url = urljoin(base_url, a["href"])
                articles.append({
                    "source": "opco",
                    "source_id": make_source_id(self.OPCO_NAME, full_url),
                    "title": title[:500],
                    "url": full_url,
                    "content": None,
                    "published_date": None,
                    "category": "financement",
                    "status": "new",
                    "acheteur": "OPCO Sante",
                    "region": None,
                })

        return articles


class OPCOmmerceCollector(BaseCollector):
    """Scraper for L'OPCOMMERCE appels d'offres."""

    SOURCE_NAME = "opco"
    OPCO_NAME = "opco_commerce"
    BASE_URL = "https://www.lopcommerce.com"
    PAGE = "/partenaire/appels-d-offres/consulter-nos-appels-d-offres/"

    def collect(self) -> list[dict]:
        articles = []
        url = self.BASE_URL + self.PAGE

        self.logger.info(f"OPCOMMERCE: scraping {url}")

        try:
            client = httpx.Client(headers=HEADERS, timeout=TIMEOUT, follow_redirects=True)
            resp = client.get(url)
            resp.raise_for_status()
        except httpx.HTTPError as e:
            self.logger.error(f"OPCOMMERCE: erreur {url}: {e}")
            return []
        finally:
            client.close()

        soup = BeautifulSoup(resp.text, "lxml")
        articles = self._parse_page(soup, url)
        self.logger.info(f"OPCOMMERCE: {len(articles)} items collectes")
        return articles

    def _parse_page(self, soup: BeautifulSoup, base_url: str) -> list[dict]:
        articles = []

        # Find content area - look for AO listings
        containers = soup.select(".field-item, .node-content, .view-content, .content, main")
        if not containers:
            containers = [soup]

        seen_urls = set()
        for container in containers:
            for a in container.find_all("a", href=True):
                href = a["href"]
                full_url = urljoin(base_url, href)

                # Skip navigation, anchors, external
                if href.startswith("#") or "mailto:" in href:
                    continue
                if full_url in seen_urls:
                    continue

                title = a.get_text(strip=True)
                if not title or len(title) < 15:
                    continue

                # Must look like an AO or appel a projets
                text_lower = (title + " " + href).lower()
                if not any(kw in text_lower for kw in [
                    "appel", "offre", "marche", "consultation",
                    "formation", "prestation", "cahier", "ao-", "aap-"
                ]):
                    continue

                # Skip generic navigation links
                generic = ["appels d'offres", "consulter nos appels d'offres",
                           "consulter le cahier des charges", "telecharger le dossier",
                           "consulter appel d'offre"]
                if title.lower().strip() in generic or len(title.split()) < 4:
                    continue

                seen_urls.add(full_url)
                articles.append({
                    "source": "opco",
                    "source_id": make_source_id(self.OPCO_NAME, full_url),
                    "title": title[:500],
                    "url": full_url,
                    "content": None,
                    "published_date": None,
                    "category": "financement",
                    "status": "new",
                    "acheteur": "L'OPCOMMERCE",
                    "region": None,
                })

        return articles


class AKTOCollector(BaseCollector):
    """Scraper for AKTO appels d'offres."""

    SOURCE_NAME = "opco"
    OPCO_NAME = "akto"
    BASE_URL = "https://www.akto.fr"
    PAGE = "/appels-d-offres/"

    def collect(self) -> list[dict]:
        url = self.BASE_URL + self.PAGE
        self.logger.info(f"AKTO: scraping {url}")

        try:
            client = httpx.Client(headers=HEADERS, timeout=TIMEOUT, follow_redirects=True)
            resp = client.get(url)
            resp.raise_for_status()
        except httpx.HTTPError as e:
            self.logger.error(f"AKTO: erreur {url}: {e}")
            return []
        finally:
            client.close()

        soup = BeautifulSoup(resp.text, "lxml")
        articles = []

        # AKTO uses card-based layout
        for card in soup.select("article, .card, .node, .views-row, .item-list li"):
            a = card.find("a", href=True)
            if not a:
                continue

            href = a["href"]
            full_url = urljoin(url, href)
            title = ""

            h = card.find(["h2", "h3", "h4"])
            if h:
                title = h.get_text(strip=True)
            else:
                title = a.get_text(strip=True)

            if not title or len(title) < 10:
                continue

            # Extract date
            date_str = None
            time_el = card.find("time")
            if time_el:
                date_str = time_el.get("datetime", "")[:10]
            else:
                date_el = card.find(class_=re.compile(r"date|time", re.I))
                if date_el:
                    date_str = extract_date_fr(date_el.get_text(strip=True))

            # Extract summary
            summary_el = card.find(class_=re.compile(r"desc|summary|excerpt|body|chapo", re.I))
            content = summary_el.get_text(strip=True) if summary_el else None

            articles.append({
                "source": "opco",
                "source_id": make_source_id(self.OPCO_NAME, full_url),
                "title": title[:500],
                "url": full_url,
                "content": content,
                "published_date": date_str,
                "category": "financement",
                "status": "new",
                "acheteur": "AKTO",
                "region": None,
            })

        self.logger.info(f"AKTO: {len(articles)} items collectes")
        return articles


class OPCO2iCollector(BaseCollector):
    """Scraper for OPCO 2i appels d'offres."""

    SOURCE_NAME = "opco"
    OPCO_NAME = "opco_2i"
    BASE_URL = "https://www.opco2i.fr"
    PAGE = "/appels-doffres/"

    def collect(self) -> list[dict]:
        url = self.BASE_URL + self.PAGE
        self.logger.info(f"OPCO 2i: scraping {url}")

        try:
            client = httpx.Client(headers=HEADERS, timeout=TIMEOUT, follow_redirects=True)
            resp = client.get(url)
            resp.raise_for_status()
        except httpx.HTTPError as e:
            self.logger.error(f"OPCO 2i: erreur {url}: {e}")
            return []
        finally:
            client.close()

        soup = BeautifulSoup(resp.text, "lxml")
        articles = []

        for card in soup.select("article, .card, .wp-block-post, .entry, .post"):
            a = card.find("a", href=True)
            if not a:
                continue

            href = a["href"]
            full_url = urljoin(url, href)

            h = card.find(["h2", "h3", "h4"])
            title = h.get_text(strip=True) if h else a.get_text(strip=True)

            if not title or len(title) < 10:
                continue

            date_str = None
            time_el = card.find("time")
            if time_el:
                date_str = time_el.get("datetime", "")[:10]

            excerpt_el = card.find(class_=re.compile(r"excerpt|desc|summary|chapo", re.I))
            content = excerpt_el.get_text(strip=True) if excerpt_el else None

            articles.append({
                "source": "opco",
                "source_id": make_source_id(self.OPCO_NAME, full_url),
                "title": title[:500],
                "url": full_url,
                "content": content,
                "published_date": date_str,
                "category": "financement",
                "status": "new",
                "acheteur": "OPCO 2i",
                "region": None,
            })

        self.logger.info(f"OPCO 2i: {len(articles)} items collectes")
        return articles


class UniformationCollector(BaseCollector):
    """Scraper for Uniformation appels d'offre."""

    SOURCE_NAME = "opco"
    OPCO_NAME = "uniformation"
    BASE_URL = "https://www.uniformation.fr"
    PAGE = "/partenaire-prestataire/appels-doffre"

    def collect(self) -> list[dict]:
        url = self.BASE_URL + self.PAGE
        self.logger.info(f"Uniformation: scraping {url}")

        try:
            client = httpx.Client(headers=HEADERS, timeout=TIMEOUT, follow_redirects=True)
            resp = client.get(url)
            resp.raise_for_status()
        except httpx.HTTPError as e:
            self.logger.error(f"Uniformation: erreur {url}: {e}")
            return []
        finally:
            client.close()

        soup = BeautifulSoup(resp.text, "lxml")
        articles = []

        for card in soup.select("article, .card, .node, .views-row, .view-content .item-list li"):
            a = card.find("a", href=True)
            if not a:
                continue

            href = a["href"]
            full_url = urljoin(url, href)

            h = card.find(["h2", "h3", "h4"])
            title = h.get_text(strip=True) if h else a.get_text(strip=True)

            if not title or len(title) < 10:
                continue

            date_str = None
            date_el = card.find(class_=re.compile(r"date|time", re.I))
            if date_el:
                date_str = extract_date_fr(date_el.get_text(strip=True))

            excerpt_el = card.find(class_=re.compile(r"desc|summary|excerpt|body|chapo|teaser", re.I))
            content = excerpt_el.get_text(strip=True) if excerpt_el else None

            articles.append({
                "source": "opco",
                "source_id": make_source_id(self.OPCO_NAME, full_url),
                "title": title[:500],
                "url": full_url,
                "content": content,
                "published_date": date_str,
                "category": "financement",
                "status": "new",
                "acheteur": "Uniformation",
                "region": None,
            })

        self.logger.info(f"Uniformation: {len(articles)} items collectes")
        return articles


# Registry of all OPCO collectors
OPCO_COLLECTORS = {
    "opco_sante": OPCOSanteCollector,
    "opco_commerce": OPCOmmerceCollector,
    "akto": AKTOCollector,
    "opco_2i": OPCO2iCollector,
    "uniformation": UniformationCollector,
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
