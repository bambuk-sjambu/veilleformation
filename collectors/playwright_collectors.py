"""Playwright-based scrapers for JS-rendered sites.

This module provides collectors for sites that require JavaScript rendering
to extract content, Unlike the static HTML scrapers, Playwright can
handle dynamic content loading.

Requirements:
    playwright>=1.40.0 (install with: pip install playwright)
    playwright install chromium
    playwright-stealth (optional, for bot protection bypass)
"""

import re
import hashlib
import logging
from datetime import datetime
from typing import Optional
from urllib.parse import urljoin

from playwright.sync_api import sync_playwright, Page, Browser, BrowserContext

try:
    from playwright_stealth import stealth
    STEALTH_AVAILABLE = True
except ImportError:
    STEALTH_AVAILABLE = False

from collectors.base import BaseCollector
from storage.database import get_connection, insert_article


TIMEOUT = 60000  # 60 seconds for JS rendering
DEFAULT_HEADLESS = True


def make_source_id(source: str, url: str) -> str:
    """Generate a deterministic source_id from URL hash."""
    h = hashlib.md5(url.encode()).hexdigest()[:12]
    return f"{source}-{h}"


def extract_date_fr(text: str) -> Optional[str]:
    """Extract French date from text. Returns YYYY-MM-DD or None."""
    if not text:
        return None

    months_fr = {
        "janvier": "01", "fevrier": "02", "fevrier": "02", "mars": "03",
        "avril": "04", "mai": "05", "juin": "06", "juillet": "07",
        "aout": "08", "aout": "08", "septembre": "09", "octobre": "10",
        "novembre": "11", "decembre": "12", "decembre": "12",
    }

    # "12 mars 2025"
    m = re.search(r"(\d{1,2})\s+([\w]+)\s+(\d{4})", text.lower())
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


class PlaywrightBaseCollector(BaseCollector):
    """Base class for Playwright-based scrapers."""

    SOURCE_NAME = "playwright"

    def __init__(self, db_path: str, logger=None, headless: bool = DEFAULT_HEADLESS):
        super().__init__(db_path, logger)
        self.headless = headless
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None

    def collect(self) -> list[dict]:
        """Collect articles using Playwright. Override in subclass."""
        raise NotImplementedError(
            f"{self.__class__.__name__} must implement collect()"
        )

    def _init_browser(self, playwright: sync_playwright) -> Browser:
        """Initialize browser."""
        self.browser = playwright.chromium.launch(headless=self.headless)
        self.context = self.browser.new_context(
            user_agent="Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0",
            locale="fr-FR",
        )
        return self.browser

    def _new_page(self) -> Page:
        """Create a new page."""
        self.page = self.context.new_page()
        self.page.set_default_timeout(TIMEOUT)
        return self.page

    def _navigate(self, url: str, wait_until: str = "networkidle") -> Page:
        """Navigate to URL and wait for content."""
        self.logger.info(f"Playwright: navigating to {url}")
        if not self.page:
            self._new_page()
        self.page.goto(url, wait_until=wait_until, timeout=TIMEOUT)
        return self.page

    def _wait_for_selector(self, selector: str, timeout: int = 15000) -> bool:
        """Wait for a selector to appear."""
        try:
            self.page.wait_for_selector(selector, timeout=timeout)
            return True
        except Exception:
            return False

    def _screenshot(self, name: str) -> str:
        """Take a screenshot for debugging."""
        import os
        os.makedirs("data/screenshots", exist_ok=True)
        path = f"data/screenshots/{name}.png"
        self.page.screenshot(path=path)
        return path

    def close(self):
        """Close browser resources."""
        if self.page:
            self.page.close()
            self.page = None
        if self.context:
            self.context.close()
            self.context = None
        if self.browser:
            self.browser.close()
            self.browser = None


class OPCO2iPlaywrightCollector(PlaywrightBaseCollector):
    """Playwright scraper for OPCO 2i (JS-rendered)."""

    SOURCE_NAME = "opco_2i"
    OPCO_NAME = "OPCO 2i"
    START_URL = "https://www.opco2i.fr/appels-doffres/"

    def collect(self) -> list[dict]:
        articles = []
        seen_urls = set()

        with sync_playwright() as p:
            self._init_browser(p)
            try:
                page = self._navigate(self.START_URL, wait_until="load")

                # Wait a bit for JS to render
                page.wait_for_timeout(3000)

                # Debug: take screenshot
                self._screenshot("opco2i_debug")

                # Extract all links that look like AAP articles
                elements = page.query_selector_all("article, .post, .card, .views-row, .news-item")

                for el in elements:
                    # Get link
                    link = el.query_selector("a[href]") if el else None
                    if not link:
                        continue

                    href = link.get_attribute("href")
                    if not href or href == "#":
                        continue

                    full_url = urljoin(self.START_URL, href)
                    if full_url in seen_urls:
                        continue

                    # Get title
                    title_el = el.query_selector("h2, h3, h4")
                    title = title_el.inner_text() if title_el else link.inner_text()

                    if not title or len(title) < 15:
                        continue

                    # Skip generic links
                    skip_words = ["consulter", "en savoir plus", "lire la suite", "voir plus"]
                    if title.lower().strip() in skip_words:
                        continue

                    seen_urls.add(full_url)

                    # Extract date
                    date_str = None
                    time_el = el.query_selector("time, .date")
                    if time_el:
                        datetime_attr = time_el.get_attribute("datetime")
                        if datetime_attr:
                            date_str = datetime_attr[:10]
                        else:
                            date_str = extract_date_fr(time_el.inner_text())

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

                self.logger.info(f"OPCO 2i Playwright: {len(articles)} items")

            except Exception as e:
                self.logger.error(f"OPCO 2i Playwright error: {e}")
            finally:
                self.close()

        return articles


class RegionsPlaywrightCollector(PlaywrightBaseCollector):
    """Playwright scraper for regional council AAP pages."""

    SOURCE_NAME = "region"

    REGIONS = [
        {"name": "Ile-de-France", "url": "https://www.iledefrance.fr/aides-et-appels-a-projets"},
        {"name": "Auvergne-Rhone-Alpes", "url": "https://www.auvergnerhonealpes.fr/appels-a-projets"},
        {"name": "Nouvelle-Aquitaine", "url": "https://www.nouvelle-aquitaine.fr/appels-a-projets"},
        {"name": "Occitanie", "url": "https://www.laregion.fr/appels-a-projets"},
        {"name": "Grand-Est", "url": "https://www.grandest.fr/vos-aides/appels-a-projets"},
    ]

    def collect(self) -> list[dict]:
        articles = []

        with sync_playwright() as p:
            self._init_browser(p)

            try:
                for region in self.REGIONS:
                    region_name = region["name"]
                    url = region["url"]

                    self.logger.info(f"Regions PW: scraping {region_name}")
                    page = self._navigate(url)

                    # Wait for content
                    self._wait_for_selector("article, .card, .list-item, .views-row", timeout=15000)

                    # Extract articles with common selectors
                    elements = page.query_selector_all(
                        "article, .card, .list-item, .views-row, .news-item, .teaser"
                    )

                    for el in elements:
                        link = el.query_selector("a[href]")
                        if not link:
                            continue

                        href = link.get_attribute("href")
                        if not href:
                            continue

                        title_el = el.query_selector("h2, h3, h4")
                        title = title_el.inner_text() if title_el else link.inner_text()

                        if not title or len(title) < 20:
                            continue

                        # Filter for AAP-relevant content
                        text_lower = (title + " " + href).lower()
                        aap_keywords = ["appel", "offre", "projet", "marche", "aide", "financement"]
                        if not any(kw in text_lower for kw in aap_keywords):
                            continue

                        full_url = urljoin(region["url"], href)

                        articles.append({
                            "source": self.SOURCE_NAME,
                            "source_id": make_source_id(self.SOURCE_NAME, full_url),
                            "title": title[:500],
                            "url": full_url,
                            "content": None,
                            "published_date": None,
                            "category": "ao",
                            "status": "new",
                            "acheteur": f"Region {region_name}",
                            "region": region_name,
                        })

                    self.logger.info(f"Regions PW {region_name}: collected items")

            except Exception as e:
                self.logger.error(f"Regions PW error: {e}")
            finally:
                self.close()

        return articles


class FranceTravailPlaywrightCollector(PlaywrightBaseCollector):
    """Playwright scraper for France Travail search."""

    SOURCE_NAME = "france_travail"
    BASE_URL = "https://www.francetravail.fr"
    SEARCH_URL = f"{BASE_URL}/informations/ma-recherche.html"

    def collect(self) -> list[dict]:
        articles = []

        with sync_playwright() as p:
            self._init_browser(p)

            try:
                page = self._navigate(self.SEARCH_URL)

                # Type search query
                search_input = page.query_selector('input[name="q"], input[type="search"]')
                if search_input:
                    search_input.fill("appel projet formation")
                    search_input.press("Enter")
                    page.wait_for_load_state(timeout=10000)

                # Wait for results
                if not self._wait_for_selector(".search-result, .result-item, article", timeout=15000):
                    self.logger.warning("France Travail PW: no results found")
                    return []

                # Extract results
                elements = page.query_selector_all(
                    ".search-result, .result-item, article, .list-item"
                )

                for el in elements:
                    link = el.query_selector("a[href]")
                    if not link:
                        continue

                    href = link.get_attribute("href")
                    title = link.inner_text()

                    if not title or len(title) < 20:
                        continue

                    full_url = urljoin(self.BASE_URL, href)

                    # Filter for relevant content
                    text_lower = title.lower()
                    relevant_keywords = ["appel", "offre", "marche", "formation", "emploi"]
                    if not any(kw in text_lower for kw in relevant_keywords):
                        continue

                    articles.append({
                        "source": self.SOURCE_NAME,
                        "source_id": make_source_id(self.SOURCE_NAME, full_url),
                        "title": title[:500],
                        "url": full_url,
                        "content": None,
                        "published_date": None,
                        "category": "ao",
                        "status": "new",
                        "acheteur": "France Travail",
                        "region": None,
                    })

                self.logger.info(f"France Travail PW: {len(articles)} items")

            except Exception as e:
                self.logger.error(f"France Travail PW error: {e}")
            finally:
                self.close()

        return articles


class FranceCompetencesPlaywrightCollector(PlaywrightBaseCollector):
    """Playwright scraper for France Competences news."""

    SOURCE_NAME = "france_competences"
    START_URL = "https://www.francecompetences.fr/actualites/"

    def collect(self) -> list[dict]:
        articles = []
        seen_urls = set()

        with sync_playwright() as p:
            self._init_browser(p)
            try:
                page = self._navigate(self.START_URL, wait_until="networkidle")
                page.wait_for_timeout(3000)

                # Extract news items - links to /fiche/ pages
                links = page.query_selector_all("a[href*='/fiche/']")

                for link in links:
                    href = link.get_attribute("href")
                    if not href:
                        continue

                    full_url = urljoin(self.START_URL, href)
                    if full_url in seen_urls:
                        continue

                    title = link.inner_text().strip()
                    if not title or len(title) < 20:
                        continue

                    # Skip pagination and navigation links
                    if any(skip in title.lower() for skip in ["page", "precedent", "suivant", "accueil"]):
                        continue

                    seen_urls.add(full_url)

                    # Filter for formation-related content
                    text_lower = title.lower()
                    relevant_keywords = [
                        "formation", "certification", "competence", "qualiopi",
                        "cpf", "vae", "rncp", "titre", "diplome", "professionnel",
                        "apprentissage", "alternance", "organisme", "financement",
                        "opco", "branche", "metier", "emploi", "enregistrement",
                        "repertoire", "decision", "arrete", "decret"
                    ]
                    if not any(kw in text_lower for kw in relevant_keywords):
                        continue

                    articles.append({
                        "source": self.SOURCE_NAME,
                        "source_id": make_source_id(self.SOURCE_NAME, full_url),
                        "title": title[:500],
                        "url": full_url,
                        "content": None,
                        "published_date": None,
                        "category": "metier",
                        "status": "new",
                        "acheteur": "France Competences",
                        "region": None,
                    })

                self.logger.info(f"France Competences PW: {len(articles)} items")

            except Exception as e:
                self.logger.error(f"France Competences PW error: {e}")
            finally:
                self.close()

        return articles


class TravailGouvPlaywrightCollector(PlaywrightBaseCollector):
    """Playwright scraper for Ministere du Travail actualites with stealth mode."""

    SOURCE_NAME = "travail_gouv"
    START_URL = "https://travail.gouv.fr/actualites"

    def collect(self) -> list[dict]:
        articles = []

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)

            # Create context with stealth settings
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0 Safari/537.36",
                viewport={"width": 1920, "height": 1080},
                locale="fr-FR",
            )

            page = context.new_page()

            # Apply stealth mode if available
            if STEALTH_AVAILABLE:
                stealth(page)
                self.logger.info("Travail.gouv: stealth mode enabled")

            try:
                self.logger.info(f"Travail.gouv: navigating to {self.START_URL}")
                page.goto(self.START_URL, wait_until="networkidle", timeout=90000)
                page.wait_for_timeout(5000)

                # Look for article links with more specific selectors
                selectors = [
                    "a[href*='/actualites/']",
                    "a[href*='/article/']",
                    "article a",
                    ".news-item a",
                    ".views-row a",
                    ".card a",
                    "a[href*='travail.gouv.fr']",
                ]

                all_links = []
                for selector in selectors:
                    try:
                        links = page.query_selector_all(selector)
                        all_links.extend(links)
                    except Exception:
                        pass

                seen_urls = set()
                for link in all_links:
                    try:
                        href = link.get_attribute("href")
                        if not href:
                            continue

                        # Get absolute URL
                        if href.startswith("http"):
                            full_url = href
                        else:
                            full_url = urljoin(self.START_URL, href)

                        # Skip navigation/pagination
                        if any(skip in full_url for skip in ["page=", "rss", "feed", "login", "contact"]):
                            continue

                        if full_url in seen_urls:
                            continue
                        seen_urls.add(full_url)

                        # Get title
                        title = link.inner_text().strip()
                        if not title or len(title) < 20:
                            continue

                        # Skip navigation elements
                        if any(skip in title.lower() for skip in ["accueil", "lire", "suite", "précédent", "suivant", "page"]):
                            continue

                        # Filter for formation-related content
                        text_lower = title.lower()
                        relevant_keywords = [
                            "formation", "professionnelle", "certification", "competence",
                            "cpf", "vae", "qualiopi", "organisme", "apprentissage",
                            "alternance", "contrat", "salarie", "employeur", "entreprise",
                            "parcours", "bilan", "stage", "diplome", "emploi", "travail",
                            "reforme", "dispositif", "financement", "droit", "social",
                        ]
                        if not any(kw in text_lower for kw in relevant_keywords):
                            continue

                        articles.append({
                            "source": self.SOURCE_NAME,
                            "source_id": make_source_id(self.SOURCE_NAME, full_url),
                            "title": title[:500],
                            "url": full_url,
                            "content": None,
                            "published_date": None,
                            "category": "reglementaire",
                            "status": "new",
                            "acheteur": "Ministere du Travail",
                            "region": None,
                        })
                    except Exception:
                        continue

                self.logger.info(f"Travail.gouv PW: {len(articles)} items collected")

            except Exception as e:
                self.logger.error(f"Travail.gouv PW error: {e}")
            finally:
                browser.close()

        return articles

# Registry
PLAYWRIGHT_COLLECTORS = {
    "opco_2i": OPCO2iPlaywrightCollector,
    "region": RegionsPlaywrightCollector,
    "france_travail": FranceTravailPlaywrightCollector,
    "france_competences": FranceCompetencesPlaywrightCollector,
    # Note: Travail.gouv and Education.gouv have bot protection, disabled for now
    # "travail_gouv": TravailGouvPlaywrightCollector,
    # "education_gouv": EducationGouvPlaywrightCollector,
}


def collect_all_playwright(db_path: str, logger=None, sources: list[str] = None) -> list[dict]:
    """Run specified Playwright collectors.

    Args:
        db_path: Database path
        logger: Logger instance
        sources: List of source names to collect from, or None for all

    Returns:
        List of stats dicts
    """
    all_stats = []

    collectors_to_run = (
        {k: v for k, v in PLAYWRIGHT_COLLECTORS.items() if sources is None or k in sources}
    )

    for name, collector_cls in collectors_to_run.items():
        try:
            collector = collector_cls(db_path, logger)
            stats = collector.run()
            all_stats.append(stats)
        except Exception as e:
            if logger:
                logger.error(f"Playwright {name}: fatal error: {e}")
            all_stats.append({
                "source": name,
                "collected": 0,
                "inserted": 0,
                "errors": [str(e)],
            })

    return all_stats
