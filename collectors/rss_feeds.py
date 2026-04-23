"""RSS feed collectors for Cipia.

Collects calls for proposals (appels a projets) from RSS feeds
of OPCOs and other sources that provide RSS.

Working feeds:
- Uniformation: https://www.uniformation.fr/rss.xml (contains AAPs with marche-publics links)
- OPCO 2i: https://www.opco2i.fr/feed/ (news, not specific AAPs)
"""

import re
import hashlib
from datetime import datetime
from typing import Optional
from xml.etree import ElementTree

import httpx

from collectors.base import BaseCollector


HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0",
    "Accept": "application/rss+xml, application/xml, text/xml, */*",
    "Accept-Language": "fr-FR,fr;q=0.9",
}

TIMEOUT = 30


def make_source_id(source: str, url: str) -> str:
    """Generate a deterministic source_id from URL hash."""
    h = hashlib.md5(url.encode()).hexdigest()[:12]
    return f"{source}-{h}"


def extract_date(text: str) -> Optional[str]:
    """Try to extract a date from various formats. Returns YYYY-MM-DD or None."""
    if not text:
        return None

    # RFC 2822: "Mon, 09 Mar 2026 09:00:09 +0000"
    m = re.search(r"(\d{1,2})\s+(\w{3})\s+(\d{4})", text)
    if m:
        day, month_abbr, year = m.groups()
        months = {
            "jan": "01", "feb": "02", "mar": "03", "apr": "04",
            "may": "05", "jun": "06", "jul": "07", "aug": "08",
            "sep": "09", "oct": "10", "nov": "11", "dec": "12",
        }
        month_num = months.get(month_abbr.lower())
        if month_num:
            return f"{year}-{month_num}-{int(day):02d}"

    # ISO: "2026-03-09T10:00:09+01:00"
    m = re.search(r"(\d{4})-(\d{2})-(\d{2})", text)
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"

    return None


def clean_html(text: str) -> str:
    """Remove HTML tags from text."""
    if not text:
        return ""
    # Remove HTML tags
    text = re.sub(r"<[^>]+>", " ", text)
    # Normalize whitespace
    text = re.sub(r"\s+", " ", text).strip()
    return text


class UniformationRSSCollector(BaseCollector):
    """RSS feed scraper for Uniformation appels d'offres."""

    SOURCE_NAME = "uniformation_rss"
    OPCO_NAME = "Uniformation"
    FEED_URL = "https://www.uniformation.fr/rss.xml"

    def collect(self) -> list[dict]:
        """Collect articles from Uniformation RSS feed."""
        articles = []
        client = httpx.Client(headers=HEADERS, timeout=TIMEOUT, follow_redirects=True)

        try:
            self.logger.info(f"Uniformation RSS: fetching {self.FEED_URL}")
            resp = client.get(self.FEED_URL)
            resp.raise_for_status()
        except httpx.HTTPError as e:
            self.logger.error(f"Uniformation RSS: error fetching feed: {e}")
            return []
        finally:
            client.close()

        try:
            root = ElementTree.fromstring(resp.content)
        except ElementTree.ParseError as e:
            self.logger.error(f"Uniformation RSS: XML parse error: {e}")
            return []

        # Find all items
        for item in root.iter("item"):
            title_el = item.find("title")
            link_el = item.find("link")
            desc_el = item.find("description")
            pubdate_el = item.find("pubDate")

            if title_el is None or link_el is None:
                continue

            title = clean_html(title_el.text or "")
            link = (link_el.text or "").strip()

            if not title or not link:
                continue

            # Filter for AAP-relevant content
            text_lower = title.lower()
            if not any(kw in text_lower for kw in [
                "appel", "offre", "marche", "catalogue", "formation",
                "prestation", "consultation", "candidature"
            ]):
                continue

            # Skip generic pages
            if "page d'accueil" in text_lower or len(title) < 20:
                continue

            # Extract date
            date_str = None
            if pubdate_el is not None and pubdate_el.text:
                date_str = extract_date(pubdate_el.text)

            # Extract description and look for marche-publics link
            description = ""
            external_link = None
            if desc_el is not None and desc_el.text:
                desc_text = desc_el.text
                description = clean_html(desc_text)

                # Look for marche-publics link in description
                m = re.search(r'href="(https://www\.marches-publics\.info/[^"]+)"', desc_text)
                if m:
                    external_link = m.group(1).replace("&amp;", "&")

            # Use external link if available, otherwise use feed item link
            final_url = external_link or link

            articles.append({
                "source": self.SOURCE_NAME,
                "source_id": make_source_id(self.SOURCE_NAME, final_url),
                "title": title[:500],
                "url": final_url,
                "content": description[:2000] if description else None,
                "published_date": date_str,
                "category": "ao",
                "status": "new",
                "acheteur": self.OPCO_NAME,
                "region": None,
            })

        self.logger.info(f"Uniformation RSS: {len(articles)} AAP items collected")
        return articles


class OPCO2iRSSCollector(BaseCollector):
    """RSS feed scraper for OPCO 2i news (may contain some AAP info)."""

    SOURCE_NAME = "opco_2i_rss"
    OPCO_NAME = "OPCO 2i"
    FEED_URL = "https://www.opco2i.fr/feed/"

    def collect(self) -> list[dict]:
        """Collect articles from OPCO 2i RSS feed."""
        articles = []
        client = httpx.Client(headers=HEADERS, timeout=TIMEOUT, follow_redirects=True)

        try:
            self.logger.info(f"OPCO 2i RSS: fetching {self.FEED_URL}")
            resp = client.get(self.FEED_URL)
            resp.raise_for_status()
        except httpx.HTTPError as e:
            self.logger.error(f"OPCO 2i RSS: error fetching feed: {e}")
            return []
        finally:
            client.close()

        try:
            root = ElementTree.fromstring(resp.content)
        except ElementTree.ParseError as e:
            self.logger.error(f"OPCO 2i RSS: XML parse error: {e}")
            return []

        for item in root.iter("item"):
            title_el = item.find("title")
            link_el = item.find("link")
            desc_el = item.find("description")
            pubdate_el = item.find("pubDate")

            if title_el is None or link_el is None:
                continue

            title = clean_html(title_el.text or "")
            link = (link_el.text or "").strip()

            if not title or not link or len(title) < 20:
                continue

            # Filter for relevant content (not general news)
            text_lower = title.lower()
            relevant_keywords = [
                "appel", "offre", "marche", "financement", "dispositif",
                "formation", "certification", "diagnostic", "accompagnement",
                "entreprise", "salarie", "employeur"
            ]
            if not any(kw in text_lower for kw in relevant_keywords):
                continue

            date_str = None
            if pubdate_el is not None and pubdate_el.text:
                date_str = extract_date(pubdate_el.text)

            description = ""
            if desc_el is not None and desc_el.text:
                description = clean_html(desc_el.text)[:2000]

            # Determine category
            category = "metier"  # Default to metier/news
            if any(kw in text_lower for kw in ["appel", "offre", "marche"]):
                category = "ao"
            elif any(kw in text_lower for kw in ["financement", "aide", "subvention"]):
                category = "financement"

            articles.append({
                "source": self.SOURCE_NAME,
                "source_id": make_source_id(self.SOURCE_NAME, link),
                "title": title[:500],
                "url": link,
                "content": description if description else None,
                "published_date": date_str,
                "category": category,
                "status": "new",
                "acheteur": self.OPCO_NAME,
                "region": None,
            })

        self.logger.info(f"OPCO 2i RSS: {len(articles)} relevant items collected")
        return articles


class FranceCompetencesRSSCollector(BaseCollector):
    """RSS feed scraper for France Competences news."""

    SOURCE_NAME = "france_competences"
    FEED_URL = "https://www.francecompetences.fr/feed/"

    def collect(self) -> list[dict]:
        """Collect articles from France Competences RSS feed."""
        articles = []
        client = httpx.Client(headers=HEADERS, timeout=TIMEOUT, follow_redirects=True)

        try:
            self.logger.info(f"France Competences RSS: fetching {self.FEED_URL}")
            resp = client.get(self.FEED_URL)
            resp.raise_for_status()
        except httpx.HTTPError as e:
            self.logger.error(f"France Competences RSS: error fetching feed: {e}")
            return []
        finally:
            client.close()

        try:
            root = ElementTree.fromstring(resp.content)
        except ElementTree.ParseError as e:
            self.logger.error(f"France Competences RSS: XML parse error: {e}")
            return []

        for item in root.iter("item"):
            title_el = item.find("title")
            link_el = item.find("link")
            desc_el = item.find("description")
            pubdate_el = item.find("pubDate")

            if title_el is None or link_el is None:
                continue

            title = clean_html(title_el.text or "")
            link = (link_el.text or "").strip()

            if not title or not link or len(title) < 20:
                continue

            # Filter for formation-related content
            text_lower = title.lower()
            relevant_keywords = [
                "formation", "certification", "competence", "qualiopi",
                "cpf", "vae", "rncp", "titre", "diplome", "professionnel",
                "apprentissage", "alternance", "organisme", "financement",
                "opco", "branche", "metier", "emploi"
            ]
            if not any(kw in text_lower for kw in relevant_keywords):
                continue

            date_str = None
            if pubdate_el is not None and pubdate_el.text:
                date_str = extract_date(pubdate_el.text)

            description = ""
            if desc_el is not None and desc_el.text:
                description = clean_html(desc_el.text)[:2000]

            # Determine category based on content
            category = "metier"
            if any(kw in text_lower for kw in ["reglement", "decret", "arrete", "loi"]):
                category = "reglementaire"
            elif any(kw in text_lower for kw in ["financement", "aide", "subvention"]):
                category = "financement"

            articles.append({
                "source": self.SOURCE_NAME,
                "source_id": make_source_id(self.SOURCE_NAME, link),
                "title": title[:500],
                "url": link,
                "content": description if description else None,
                "published_date": date_str,
                "category": category,
                "status": "new",
                "acheteur": "France Competences",
                "region": None,
            })

        self.logger.info(f"France Competences RSS: {len(articles)} relevant items collected")
        return articles


class TravailGouvRSSCollector(BaseCollector):
    """RSS feed scraper for Ministere du Travail (travail.gouv.fr)."""

    SOURCE_NAME = "travail_gouv"
    FEED_URL = "https://travail.gouv.fr/feeds/actualites/rss.xml"

    def collect(self) -> list[dict]:
        """Collect articles from Ministere du Travail RSS feed."""
        articles = []
        client = httpx.Client(headers=HEADERS, timeout=TIMEOUT, follow_redirects=True)

        try:
            self.logger.info(f"Travail.gouv RSS: fetching {self.FEED_URL}")
            resp = client.get(self.FEED_URL)
            resp.raise_for_status()
        except httpx.HTTPError as e:
            self.logger.error(f"Travail.gouv RSS: error fetching feed: {e}")
            return []
        finally:
            client.close()

        try:
            root = ElementTree.fromstring(resp.content)
        except ElementTree.ParseError as e:
            self.logger.error(f"Travail.gouv RSS: XML parse error: {e}")
            return []

        for item in root.iter("item"):
            title_el = item.find("title")
            link_el = item.find("link")
            desc_el = item.find("description")
            pubdate_el = item.find("pubDate")

            if title_el is None or link_el is None:
                continue

            title = clean_html(title_el.text or "")
            link = (link_el.text or "").strip()

            if not title or not link or len(title) < 20:
                continue

            # Filter for formation-related content
            text_lower = title.lower()
            relevant_keywords = [
                "formation", "professionnelle", "certification", "competence",
                "cpf", "vae", "qualiopi", "organisme", "apprentissage",
                "alternance", "contrat", "salarie", "employeur", "entreprise",
                "parcours", "bilan", "stage", "diplome"
            ]
            if not any(kw in text_lower for kw in relevant_keywords):
                continue

            date_str = None
            if pubdate_el is not None and pubdate_el.text:
                date_str = extract_date(pubdate_el.text)

            description = ""
            if desc_el is not None and desc_el.text:
                description = clean_html(desc_el.text)[:2000]

            # Determine category
            category = "reglementaire"  # Default for government sources
            if any(kw in text_lower for kw in ["metier", "emploi", "recrutement"]):
                category = "metier"
            elif any(kw in text_lower for kw in ["financement", "aide", "subvention"]):
                category = "financement"

            articles.append({
                "source": self.SOURCE_NAME,
                "source_id": make_source_id(self.SOURCE_NAME, link),
                "title": title[:500],
                "url": link,
                "content": description if description else None,
                "published_date": date_str,
                "category": category,
                "status": "new",
                "acheteur": "Ministere du Travail",
                "region": None,
            })

        self.logger.info(f"Travail.gouv RSS: {len(articles)} relevant items collected")
        return articles


class EducationGouvRSSCollector(BaseCollector):
    """RSS feed scraper for Ministere de l'Education Nationale (education.gouv.fr)."""

    SOURCE_NAME = "education_gouv"
    FEED_URL = "https://www.education.gouv.fr/rss-feed.xml"

    def collect(self) -> list[dict]:
        """Collect articles from Education.gouv RSS feed."""
        articles = []
        client = httpx.Client(headers=HEADERS, timeout=TIMEOUT, follow_redirects=True)

        try:
            self.logger.info(f"Education.gouv RSS: fetching {self.FEED_URL}")
            resp = client.get(self.FEED_URL)
            resp.raise_for_status()
        except httpx.HTTPError as e:
            self.logger.error(f"Education.gouv RSS: error fetching feed: {e}")
            return []
        finally:
            client.close()

        try:
            root = ElementTree.fromstring(resp.content)
        except ElementTree.ParseError as e:
            self.logger.error(f"Education.gouv RSS: XML parse error: {e}")
            return []

        for item in root.iter("item"):
            title_el = item.find("title")
            link_el = item.find("link")
            desc_el = item.find("description")
            pubdate_el = item.find("pubDate")

            if title_el is None or link_el is None:
                continue

            title = clean_html(title_el.text or "")
            link = (link_el.text or "").strip()

            if not title or not link or len(title) < 20:
                continue

            # Filter for formation-related content (focus on professional training)
            text_lower = title.lower()
            relevant_keywords = [
                "formation", "professionnelle", "certification", "competence",
                "cpf", "vae", "qualiopi", "organisme", "apprentissage",
                "alternance", "cfa", "lycee", "bac pro", "bts", "cap",
                "diplome", "titre professionnel", "rncp"
            ]
            if not any(kw in text_lower for kw in relevant_keywords):
                continue

            date_str = None
            if pubdate_el is not None and pubdate_el.text:
                date_str = extract_date(pubdate_el.text)

            description = ""
            if desc_el is not None and desc_el.text:
                description = clean_html(desc_el.text)[:2000]

            # Determine category
            category = "metier"  # Default for education news
            if any(kw in text_lower for kw in ["reglement", "decret", "arrete", "circulaire"]):
                category = "reglementaire"
            elif any(kw in text_lower for kw in ["financement", "aide", "subvention", "bourse"]):
                category = "financement"

            articles.append({
                "source": self.SOURCE_NAME,
                "source_id": make_source_id(self.SOURCE_NAME, link),
                "title": title[:500],
                "url": link,
                "content": description if description else None,
                "published_date": date_str,
                "category": category,
                "status": "new",
                "acheteur": "Ministere de l'Education Nationale",
                "region": None,
            })

        self.logger.info(f"Education.gouv RSS: {len(articles)} relevant items collected")
        return articles


# Registry
RSS_COLLECTORS = {
    "uniformation_rss": UniformationRSSCollector,
    "opco_2i_rss": OPCO2iRSSCollector,
    "france_competences": FranceCompetencesRSSCollector,
    "travail_gouv": TravailGouvRSSCollector,
    "education_gouv": EducationGouvRSSCollector,
}


def collect_all_rss(db_path: str, logger=None) -> list[dict]:
    """Run all RSS collectors and return combined stats."""
    all_stats = []
    for name, collector_cls in RSS_COLLECTORS.items():
        try:
            collector = collector_cls(db_path, logger)
            stats = collector.run()
            all_stats.append(stats)
        except Exception as e:
            if logger:
                logger.error(f"RSS {name}: fatal error: {e}")
            all_stats.append({
                "source": name,
                "collected": 0,
                "inserted": 0,
                "errors": [str(e)],
            })
    return all_stats
