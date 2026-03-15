"""Legifrance collector using the unofficial LegifranceRSS Atom feed.

No OAuth2 credentials required. Fetches recent texts from
https://legifrss.org/latest and optionally scrapes the JORF page
on legifrance.gouv.fr as a complementary source.

Filters entries for formation-related keywords and relevant text types
(decret, arrete, loi, ordonnance, circulaire).
"""

import os
import re
import tarfile
import tempfile
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from html import unescape
from typing import Optional
from urllib.parse import urlparse

import requests

from collectors.base import BaseCollector


# LegifranceRSS endpoints
RSS_FEED_URL = "https://legifrss.org/latest"
RSS_NATURES_URL = "https://legifrss.org/natures"

# JORF page for complementary scraping
JORF_PAGE_URL = "https://www.legifrance.gouv.fr/jorf/jo"

# DILA JORF open data archive (daily .tar.gz files)
DILA_JORF_BASE_URL = "https://echanges.dila.gouv.fr/OPENDATA/JORF/"

# Atom XML namespace
ATOM_NS = {"atom": "http://www.w3.org/2005/Atom"}

# Keywords from the CDC for filtering formation-related texts
FORMATION_KEYWORDS = [
    "formation professionnelle",
    "qualiopi",
    "cpf",
    "opco",
    "vae",
    "apprentissage",
    "certification professionnelle",
    "organisme de formation",
    "titre professionnel",
    "cfa",
    "contrat de professionnalisation",
    "bilan de competences",
    "bilan de compétences",
    "compte personnel de formation",
    "certification qualite",
    "certification qualité",
    "france competences",
    "france compétences",
    "rncp",
    "repertoire national",
    "répertoire national",
    "action de formation",
    "competences professionnelles",
    "compétences professionnelles",
    # Mots-clés additionnels pour élargir la veille
    "insertion professionnelle",
    "reconversion",
    "emploi",
    "chomage",
    "pôle emploi",
    "pole emploi",
    "france travail",
    "afpa",
    "stage",
    "stagiaire",
    "alternant",
    "alternance",
    "periode de formation",
    "formation continue",
    "formation initiale",
    "habilite",
    "habilité",
    "diplome",
    "diplôme",
    "bac pro",
    "cap",
    "bts",
    "licence pro",
    "master",
    "enseignement superieur",
    "enseignement supérieur",
    "education nationale",
    "éducation nationale",
    "ministere du travail",
    "ministère du travail",
    "drieets",
    "dreets",
    "region",
    "conseil regional",
    "financement",
    "cofinancement",
    "cpf",
    "compte personnel",
]

# Text types to accept (matched against title or nature)
TEXT_TYPES = [
    "decret",
    "décret",
    "arrete",
    "arrêté",
    "loi",
    "ordonnance",
    "circulaire",
    "decision",
    "décision",
]

# Pre-compiled regex for keyword matching (case-insensitive)
_KEYWORD_PATTERN = re.compile(
    "|".join(re.escape(kw) for kw in FORMATION_KEYWORDS),
    re.IGNORECASE,
)

# Pre-compiled regex for text type matching
_TYPE_PATTERN = re.compile(
    r"\b(" + "|".join(re.escape(t) for t in TEXT_TYPES) + r")\b",
    re.IGNORECASE,
)


def _strip_html(html_text: str) -> str:
    """Remove HTML tags and decode entities, returning plain text."""
    if not html_text:
        return ""
    text = re.sub(r"<[^>]+>", " ", html_text)
    text = unescape(text)
    # Collapse whitespace
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _extract_text_id(url: str) -> Optional[str]:
    """Extract the JORFTEXT id from a Legifrance URL.

    Example:
        https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053659239
        -> JORFTEXT000053659239
    """
    if not url:
        return None
    match = re.search(r"(JORFTEXT\d+)", url)
    return match.group(1) if match else None


class LegifranceRSSCollector(BaseCollector):
    """Collector for Legifrance legal texts using the LegifranceRSS feed.

    This collector does not require any API credentials. It fetches the
    Atom feed from legifrss.org, filters entries by formation-related
    keywords, and optionally scrapes the JORF page for additional texts.
    """

    SOURCE_NAME = "legifrance"

    def __init__(self, db_path: str, logger=None, days_back: int = 30):
        super().__init__(db_path, logger)
        self.days_back = days_back
        self._session = requests.Session()
        self._session.headers.update({
            "User-Agent": "VeilleFormation/1.0 (veille reglementaire formation professionnelle)",
        })

    # ------------------------------------------------------------------
    # Keyword & type filtering
    # ------------------------------------------------------------------

    def _is_relevant(self, title: str, content: str) -> bool:
        """Return True if the text matches formation-related keywords."""
        searchable = f"{title} {content}".lower()
        return bool(_KEYWORD_PATTERN.search(searchable))

    def _is_valid_type(self, title: str) -> bool:
        """Return True if the title indicates a relevant text type."""
        return bool(_TYPE_PATTERN.search(title))

    # ------------------------------------------------------------------
    # LegifranceRSS Atom feed
    # ------------------------------------------------------------------

    def _fetch_rss_feed(self, nature: Optional[str] = None) -> list[dict]:
        """Fetch and parse the LegifranceRSS Atom feed.

        Args:
            nature: Optional nature filter (e.g. 'DECRET', 'ARRETE').

        Returns:
            List of parsed entry dicts.
        """
        params = {}
        if nature:
            params["nature"] = nature

        try:
            response = self._session.get(RSS_FEED_URL, params=params, timeout=30)
            response.raise_for_status()
        except requests.RequestException as e:
            self.logger.warning(f"LegifranceRSS: erreur acces flux: {e}")
            return []

        return self._parse_atom_feed(response.content)

    def _parse_atom_feed(self, xml_content: bytes) -> list[dict]:
        """Parse Atom XML content into a list of entry dicts."""
        entries = []
        try:
            root = ET.fromstring(xml_content)
        except ET.ParseError as e:
            self.logger.error(f"LegifranceRSS: erreur parsing XML: {e}")
            return []

        for entry_el in root.findall("atom:entry", ATOM_NS):
            entry = self._parse_atom_entry(entry_el)
            if entry:
                entries.append(entry)

        return entries

    def _parse_atom_entry(self, entry_el: ET.Element) -> Optional[dict]:
        """Parse a single Atom <entry> element into an article dict."""
        title_el = entry_el.find("atom:title", ATOM_NS)
        link_el = entry_el.find("atom:link", ATOM_NS)
        content_el = entry_el.find("atom:content", ATOM_NS)
        published_el = entry_el.find("atom:published", ATOM_NS)
        id_el = entry_el.find("atom:id", ATOM_NS)
        author_el = entry_el.find("atom:author/atom:name", ATOM_NS)

        title = title_el.text.strip() if title_el is not None and title_el.text else ""
        url = link_el.get("href", "") if link_el is not None else ""
        if not url and id_el is not None and id_el.text:
            url = id_el.text.strip()

        raw_content = content_el.text if content_el is not None and content_el.text else ""
        content = _strip_html(raw_content)

        # Parse published date
        published_date = None
        if published_el is not None and published_el.text:
            published_date = self._parse_date(published_el.text.strip())

        # Extract text ID for deduplication
        text_id = _extract_text_id(url)
        if not text_id:
            # Fall back to the <id> element
            if id_el is not None and id_el.text:
                text_id = _extract_text_id(id_el.text.strip())
            if not text_id:
                # Use a hash of the title as last resort
                text_id = str(abs(hash(title)))[:12]

        author = author_el.text.strip() if author_el is not None and author_el.text else None

        # Build content with author info if available
        full_content = content
        if author:
            full_content = f"Source: {author} | {content}" if content else f"Source: {author}"

        return {
            "source": "legifrance",
            "source_id": f"legifrance-{text_id}",
            "title": title if title else "Sans titre",
            "url": url,
            "content": full_content[:5000] if full_content else None,
            "published_date": published_date,
            "category": "reglementaire",
            "status": "new",
        }

    def _parse_date(self, date_str: str) -> Optional[str]:
        """Parse an ISO 8601 date string and return YYYY-MM-DD."""
        for fmt in (
            "%Y-%m-%dT%H:%M:%S%z",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%d",
        ):
            try:
                dt = datetime.strptime(date_str, fmt)
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                continue

        # Try stripping timezone suffix like +01:00
        cleaned = re.sub(r"[+-]\d{2}:\d{2}$", "", date_str)
        for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
            try:
                dt = datetime.strptime(cleaned, fmt)
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                continue

        self.logger.debug(f"LegifranceRSS: format date non reconnu: {date_str}")
        return None

    def _collect_from_rss(self) -> list[dict]:
        """Collect formation-related articles from LegifranceRSS.

        Fetches the feed multiple times with nature filters to maximize
        coverage of relevant text types, then applies keyword filtering.
        """
        all_entries = []
        seen_ids = set()

        # Fetch with specific nature filters for better coverage
        natures_to_fetch = ["DECRET", "ARRETE", "DECISION", None]

        for nature in natures_to_fetch:
            label = nature or "all"
            self.logger.info(f"LegifranceRSS: chargement flux (nature={label})")

            entries = self._fetch_rss_feed(nature=nature)
            self.logger.info(f"LegifranceRSS: {len(entries)} entrees (nature={label})")

            for entry in entries:
                sid = entry["source_id"]
                if sid in seen_ids:
                    continue
                seen_ids.add(sid)

                title = entry.get("title", "")
                content = entry.get("content", "")

                if self._is_relevant(title, content):
                    all_entries.append(entry)
                    self.logger.debug(
                        f"LegifranceRSS: retenu '{title[:80]}'"
                    )

        self.logger.info(
            f"LegifranceRSS: {len(all_entries)} textes pertinents via RSS"
        )
        return all_entries

    # ------------------------------------------------------------------
    # JORF page scraping (complementary)
    # ------------------------------------------------------------------

    def _collect_from_jorf(self) -> list[dict]:
        """Scrape the JORF page for additional formation-related texts.

        This is a best-effort complementary source. If the page is
        unavailable or unparseable, an empty list is returned.
        """
        self.logger.info("LegifranceRSS: scraping page JORF")

        try:
            response = self._session.get(JORF_PAGE_URL, timeout=30)
            response.raise_for_status()
        except requests.RequestException as e:
            self.logger.warning(f"LegifranceRSS: erreur acces JORF: {e}")
            return []

        return self._parse_jorf_html(response.text)

    def _parse_jorf_html(self, html: str) -> list[dict]:
        """Extract article links from the JORF HTML page.

        Looks for links matching /jorf/id/JORFTEXT... pattern in the page.
        """
        articles = []

        # Find all JORFTEXT links with surrounding context
        # Pattern: links to individual texts in the Journal Officiel
        link_pattern = re.compile(
            r'<a[^>]*href="(/jorf/id/(JORFTEXT\d+))"[^>]*>(.*?)</a>',
            re.IGNORECASE | re.DOTALL,
        )

        for match in link_pattern.finditer(html):
            path, text_id, raw_title = match.groups()
            title = _strip_html(raw_title).strip()

            if not title:
                continue

            # Apply keyword filter
            if not self._is_relevant(title, ""):
                continue

            url = f"https://www.legifrance.gouv.fr{path}"
            today = datetime.now().strftime("%Y-%m-%d")

            articles.append({
                "source": "legifrance",
                "source_id": f"legifrance-jorf-{text_id}",
                "title": title,
                "url": url,
                "content": None,
                "published_date": today,
                "category": "reglementaire",
                "status": "new",
            })

        self.logger.info(
            f"LegifranceRSS: {len(articles)} textes pertinents via JORF"
        )
        return articles

    # ------------------------------------------------------------------
    # DILA JORF historical archives
    # ------------------------------------------------------------------

    def _list_jorf_archives(self) -> list[str]:
        """List available .tar.gz archive filenames from the DILA JORF directory."""
        try:
            response = self._session.get(DILA_JORF_BASE_URL, timeout=30)
            response.raise_for_status()
        except requests.RequestException as e:
            self.logger.error(f"JORF historique: erreur acces repertoire DILA: {e}")
            return []

        # Parse the HTML directory listing for .tar.gz links
        pattern = re.compile(r'href="(JORF_\d{8}-\d{6}\.tar\.gz)"', re.IGNORECASE)
        filenames = pattern.findall(response.text)
        return sorted(filenames)

    def _extract_date_from_filename(self, filename: str) -> Optional[datetime]:
        """Extract the date from a JORF archive filename like JORF_YYYYMMDD-HHMMSS.tar.gz."""
        match = re.search(r"JORF_(\d{8})", filename)
        if not match:
            return None
        try:
            return datetime.strptime(match.group(1), "%Y%m%d")
        except ValueError:
            return None

    def _parse_jorf_xml_text(self, xml_content: bytes, fallback_date: str) -> Optional[dict]:
        """Parse a single JORF XML file and return an article dict if relevant.

        Args:
            xml_content: Raw XML bytes for one legal text.
            fallback_date: YYYY-MM-DD date to use if the XML has no publication date.

        Returns:
            Article dict or None if the text is not formation-related.
        """
        try:
            root = ET.fromstring(xml_content)
        except ET.ParseError:
            return None

        # Extract text ID from the XML tree
        # Try <META><META_COMMUN><ID> or filename-based JORFTEXT ID
        text_id = None
        id_el = root.find(".//META/META_COMMUN/ID")
        if id_el is not None and id_el.text:
            text_id = id_el.text.strip()

        # Also check root tag or ID element directly
        if not text_id:
            id_el = root.find(".//ID")
            if id_el is not None and id_el.text:
                text_id = id_el.text.strip()

        if not text_id:
            # Try to extract from any JORFTEXT reference in the XML
            xml_str = xml_content.decode("utf-8", errors="replace")
            jorf_match = re.search(r"(JORFTEXT\d+)", xml_str)
            if jorf_match:
                text_id = jorf_match.group(1)

        if not text_id:
            return None

        # Extract title
        title = ""
        titre_el = root.find(".//TITRE")
        if titre_el is not None and titre_el.text:
            title = titre_el.text.strip()
        if not title:
            titre_el = root.find(".//TITRE_TXT")
            if titre_el is not None and titre_el.text:
                title = titre_el.text.strip()
        if not title:
            return None

        # Extract nature (DECRET, ARRETE, etc.)
        nature = ""
        nature_el = root.find(".//META/META_COMMUN/NATURE")
        if nature_el is not None and nature_el.text:
            nature = nature_el.text.strip()

        # Extract publication date
        published_date = fallback_date
        date_el = root.find(".//META/META_COMMUN/DATE_PUBLI")
        if date_el is not None and date_el.text:
            raw_date = date_el.text.strip()
            parsed = self._parse_date(raw_date)
            if parsed:
                published_date = parsed

        # Extract text content from articles or CONTENU
        content_parts = []

        # Try <CONTENU> elements
        for contenu_el in root.iter("CONTENU"):
            if contenu_el.text:
                content_parts.append(_strip_html(contenu_el.text))

        # Try <BLOC_TEXTUEL><CONTENU> pattern
        for bloc in root.iter("BLOC_TEXTUEL"):
            contenu = bloc.find("CONTENU")
            if contenu is not None and contenu.text:
                content_parts.append(_strip_html(contenu.text))

        # Try individual <ARTICLE> elements
        for article_el in root.iter("ARTICLE"):
            for child in article_el:
                if child.text:
                    content_parts.append(_strip_html(child.text))

        # Try <TEXTE> element directly
        if not content_parts:
            texte_el = root.find(".//TEXTE")
            if texte_el is not None:
                # Get all text content recursively
                all_text = ET.tostring(texte_el, encoding="unicode", method="text")
                if all_text and all_text.strip():
                    content_parts.append(all_text.strip())

        content = " ".join(content_parts).strip()

        # Build searchable text including nature for type filtering
        full_searchable = f"{nature} {title} {content}"

        # Apply the same keyword relevance filter as the RSS collector
        if not self._is_relevant(title, content):
            return None

        # Build the Legifrance URL
        url = f"https://www.legifrance.gouv.fr/jorf/id/{text_id}"

        return {
            "source": "legifrance",
            "source_id": f"legifrance-{text_id}",
            "title": title[:500],
            "url": url,
            "content": content[:5000] if content else None,
            "published_date": published_date,
            "category": "reglementaire",
            "status": "new",
        }

    def _process_archive(self, filename: str, fallback_date: str) -> list[dict]:
        """Download and process a single JORF archive file.

        Args:
            filename: Name of the .tar.gz file on the DILA server.
            fallback_date: YYYY-MM-DD date to use as default publication date.

        Returns:
            List of relevant article dicts extracted from the archive.
        """
        url = f"{DILA_JORF_BASE_URL}{filename}"
        articles = []

        try:
            response = self._session.get(url, timeout=120, stream=True)
            response.raise_for_status()
        except requests.RequestException as e:
            self.logger.warning(f"JORF historique: erreur telechargement {filename}: {e}")
            return []

        # Write to a temp file and extract
        tmpdir = None
        try:
            tmpdir = tempfile.mkdtemp(prefix="jorf_")
            archive_path = os.path.join(tmpdir, filename)

            with open(archive_path, "wb") as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)

            # Extract and parse XML files
            try:
                with tarfile.open(archive_path, "r:gz") as tar:
                    # Security: filter out suspicious paths
                    members = [
                        m for m in tar.getmembers()
                        if m.isfile()
                        and not m.name.startswith("/")
                        and ".." not in m.name
                        and m.name.lower().endswith(".xml")
                    ]

                    xml_count = len(members)
                    relevant_count = 0

                    for member in members:
                        try:
                            f = tar.extractfile(member)
                            if f is None:
                                continue
                            xml_content = f.read()
                            article = self._parse_jorf_xml_text(xml_content, fallback_date)
                            if article:
                                articles.append(article)
                                relevant_count += 1
                        except Exception as e:
                            self.logger.debug(
                                f"JORF historique: erreur parsing {member.name}: {e}"
                            )

                    self.logger.debug(
                        f"JORF historique: {filename} -> {xml_count} XML, "
                        f"{relevant_count} pertinents"
                    )

            except (tarfile.TarError, EOFError) as e:
                self.logger.warning(f"JORF historique: archive corrompue {filename}: {e}")

        finally:
            # Clean up temp directory
            if tmpdir:
                import shutil
                shutil.rmtree(tmpdir, ignore_errors=True)

        return articles

    def collect_history(self, weeks_back: int = 4) -> dict:
        """Collect historical JORF texts from DILA open data archives.

        Downloads daily .tar.gz archives from the DILA server, extracts XML
        files, and filters for formation-related legal texts using the same
        keyword filter as the RSS collector.

        Args:
            weeks_back: Number of weeks of history to collect (default: 4).

        Returns:
            Dict with collection stats: archives_found, archives_processed,
            texts_parsed, relevant_found, inserted, errors, duration_seconds.
        """
        start = datetime.now()
        cutoff_date = datetime.now() - timedelta(weeks=weeks_back)

        self.logger.info(
            f"JORF historique: collecte des {weeks_back} dernieres semaines "
            f"(depuis {cutoff_date.strftime('%Y-%m-%d')})"
        )

        stats = {
            "source": "legifrance-history",
            "archives_found": 0,
            "archives_processed": 0,
            "texts_parsed": 0,
            "relevant_found": 0,
            "inserted": 0,
            "duplicates": 0,
            "errors": [],
            "duration_seconds": 0,
        }

        # 1. List available archives
        all_filenames = self._list_jorf_archives()
        if not all_filenames:
            stats["errors"].append("Impossible de lister les archives DILA")
            stats["duration_seconds"] = round((datetime.now() - start).total_seconds(), 2)
            self.logger.error("JORF historique: aucune archive trouvee")
            return stats

        # 2. Filter archives within the date range
        filenames = []
        for fn in all_filenames:
            file_date = self._extract_date_from_filename(fn)
            if file_date and file_date >= cutoff_date:
                filenames.append(fn)

        stats["archives_found"] = len(filenames)
        self.logger.info(
            f"JORF historique: {len(filenames)} archives dans la periode "
            f"(sur {len(all_filenames)} disponibles)"
        )

        if not filenames:
            stats["duration_seconds"] = round((datetime.now() - start).total_seconds(), 2)
            return stats

        # 3. Process each archive
        all_articles = []
        seen_ids = set()

        for i, filename in enumerate(filenames):
            file_date = self._extract_date_from_filename(filename)
            fallback_date = file_date.strftime("%Y-%m-%d") if file_date else datetime.now().strftime("%Y-%m-%d")

            self.logger.info(
                f"JORF historique: telechargement {i + 1}/{len(filenames)} - {filename}"
            )

            try:
                articles = self._process_archive(filename, fallback_date)
                stats["archives_processed"] += 1

                for article in articles:
                    if article["source_id"] not in seen_ids:
                        seen_ids.add(article["source_id"])
                        all_articles.append(article)

                stats["texts_parsed"] += len(articles)

            except Exception as e:
                self.logger.error(f"JORF historique: erreur traitement {filename}: {e}")
                stats["errors"].append(f"{filename}: {e}")

            # Be gentle with DILA servers
            if i < len(filenames) - 1:
                time.sleep(1)

        stats["relevant_found"] = len(all_articles)

        # 4. Save to database
        if all_articles:
            inserted = self.save(all_articles)
            stats["inserted"] = inserted
            stats["duplicates"] = len(all_articles) - inserted

        duration = (datetime.now() - start).total_seconds()
        stats["duration_seconds"] = round(duration, 2)

        self.logger.info(
            f"JORF historique: termine - {stats['relevant_found']} textes pertinents, "
            f"{stats['inserted']} nouveaux inseres, "
            f"{stats['duplicates']} doublons, "
            f"{stats['archives_processed']}/{stats['archives_found']} archives traitees "
            f"({duration:.1f}s)"
        )

        return stats

    # ------------------------------------------------------------------
    # Main collect method
    # ------------------------------------------------------------------

    def collect(self) -> list[dict]:
        """Fetch Legifrance texts from RSS feed and JORF page.

        Combines both sources and deduplicates by source_id.
        Handles errors gracefully: if one source fails, the other
        is still used.

        Returns:
            List of article dicts ready for database insertion.
        """
        seen_ids = set()
        articles = []

        # 1. Primary source: LegifranceRSS feed
        try:
            rss_articles = self._collect_from_rss()
            for article in rss_articles:
                if article["source_id"] not in seen_ids:
                    seen_ids.add(article["source_id"])
                    articles.append(article)
        except Exception as e:
            self.logger.error(f"LegifranceRSS: erreur inattendue flux RSS: {e}")

        # 2. Complementary source: JORF page scraping
        try:
            jorf_articles = self._collect_from_jorf()
            for article in jorf_articles:
                # Also check against RSS text IDs to avoid cross-source duplicates
                # Extract the base JORFTEXT id for comparison
                jorf_text_id = _extract_text_id(article.get("url", ""))
                rss_equivalent = f"legifrance-{jorf_text_id}" if jorf_text_id else None

                if (article["source_id"] not in seen_ids
                        and (rss_equivalent is None or rss_equivalent not in seen_ids)):
                    seen_ids.add(article["source_id"])
                    articles.append(article)
        except Exception as e:
            self.logger.error(f"LegifranceRSS: erreur inattendue scraping JORF: {e}")

        self.logger.info(
            f"LegifranceRSS: {len(articles)} textes uniques collectes au total"
        )
        return articles
