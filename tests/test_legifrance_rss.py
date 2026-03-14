"""Tests for the LegifranceRSS collector (RSS feed + DILA historical archives)."""

import io
import os
import tarfile
import tempfile
import xml.etree.ElementTree as ET
from unittest.mock import MagicMock, patch

import pytest

from collectors.legifrance_rss import (
    ATOM_NS,
    FORMATION_KEYWORDS,
    LegifranceRSSCollector,
    _extract_text_id,
    _strip_html,
)
from storage.database import get_connection, init_db, get_articles


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def db_path():
    """Create a temporary database for testing."""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    init_db(path)
    yield path
    os.unlink(path)


@pytest.fixture
def collector(db_path):
    """Return a LegifranceRSSCollector wired to the test database."""
    return LegifranceRSSCollector(db_path, logger=MagicMock())


# ---------------------------------------------------------------------------
# Sample XML data
# ---------------------------------------------------------------------------

SAMPLE_ATOM_XML = b"""\
<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>LegifranceRSS</title>
  <entry>
    <title>Decret relatif a la formation professionnelle continue</title>
    <link href="https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053659239"/>
    <id>https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053659239</id>
    <published>2026-03-10T08:00:00+01:00</published>
    <content type="html">&lt;p&gt;Modification du code du travail pour la formation professionnelle.&lt;/p&gt;</content>
    <author><name>Journal Officiel</name></author>
  </entry>
  <entry>
    <title>Arrete modifiant les criteres de certification Qualiopi</title>
    <link href="https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053659240"/>
    <id>https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053659240</id>
    <published>2026-03-09T10:30:00+01:00</published>
    <content type="html">Arrete sur Qualiopi et les organismes de formation.</content>
  </entry>
  <entry>
    <title>Decret relatif aux travaux publics routiers</title>
    <link href="https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053659999"/>
    <id>https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053659999</id>
    <published>2026-03-08T12:00:00+01:00</published>
    <content type="html">Travaux routiers sans lien avec la formation.</content>
  </entry>
</feed>
"""

SAMPLE_ATOM_ENTRY_MISSING = b"""\
<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title></title>
  </entry>
</feed>
"""

SAMPLE_JORF_XML = b"""\
<?xml version="1.0" encoding="UTF-8"?>
<TEXTE_JORF>
  <META>
    <META_COMMUN>
      <ID>JORFTEXT000099000001</ID>
      <NATURE>DECRET</NATURE>
      <DATE_PUBLI>2026-03-05</DATE_PUBLI>
    </META_COMMUN>
  </META>
  <TITRE>Decret n 2026-123 relatif a la formation professionnelle</TITRE>
  <BLOC_TEXTUEL>
    <CONTENU>Article 1 : Les organismes de formation professionnelle doivent se conformer.</CONTENU>
  </BLOC_TEXTUEL>
</TEXTE_JORF>
"""

SAMPLE_JORF_XML_IRRELEVANT = b"""\
<?xml version="1.0" encoding="UTF-8"?>
<TEXTE_JORF>
  <META>
    <META_COMMUN>
      <ID>JORFTEXT000099000002</ID>
      <NATURE>DECRET</NATURE>
      <DATE_PUBLI>2026-03-05</DATE_PUBLI>
    </META_COMMUN>
  </META>
  <TITRE>Decret relatif aux travaux publics et routes nationales</TITRE>
  <BLOC_TEXTUEL>
    <CONTENU>Article 1 : Les travaux routiers sont reglementes.</CONTENU>
  </BLOC_TEXTUEL>
</TEXTE_JORF>
"""


# ---------------------------------------------------------------------------
# Tests: _strip_html
# ---------------------------------------------------------------------------

class TestStripHtml:
    """Tests for the HTML stripping utility."""

    def test_strips_tags(self):
        assert _strip_html("<p>Hello <b>world</b></p>") == "Hello world"

    def test_decodes_entities(self):
        result = _strip_html("&lt;script&gt;alert(1)&lt;/script&gt;")
        assert "<script>" in result

    def test_handles_empty(self):
        assert _strip_html("") == ""
        assert _strip_html(None) == ""


# ---------------------------------------------------------------------------
# Tests: _extract_text_id
# ---------------------------------------------------------------------------

class TestExtractTextId:
    """Tests for JORFTEXT extraction from URLs."""

    def test_extract_from_standard_url(self):
        url = "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053659239"
        assert _extract_text_id(url) == "JORFTEXT000053659239"

    def test_extract_from_url_with_suffix(self):
        url = "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000012345678?version=1"
        assert _extract_text_id(url) == "JORFTEXT000012345678"

    def test_returns_none_for_no_match(self):
        assert _extract_text_id("https://example.com/nothing") is None

    def test_returns_none_for_empty(self):
        assert _extract_text_id("") is None
        assert _extract_text_id(None) is None


# ---------------------------------------------------------------------------
# Tests: _is_relevant
# ---------------------------------------------------------------------------

class TestIsRelevant:
    """Tests for formation-related keyword matching."""

    def test_is_relevant_with_formation_professionnelle(self, collector):
        assert collector._is_relevant("formation professionnelle", "") is True

    def test_is_relevant_with_qualiopi(self, collector):
        assert collector._is_relevant("", "certification qualiopi des OF") is True

    def test_is_relevant_with_cpf(self, collector):
        assert collector._is_relevant("Reforme du CPF", "") is True

    def test_is_relevant_with_opco(self, collector):
        assert collector._is_relevant("OPCO Atlas publie un guide", "") is True

    def test_is_relevant_with_vae(self, collector):
        assert collector._is_relevant("", "validation des acquis vae") is True

    def test_is_relevant_with_apprentissage(self, collector):
        assert collector._is_relevant("Apprentissage et alternance", "") is True

    def test_is_relevant_with_rncp(self, collector):
        assert collector._is_relevant("Inscription au RNCP", "") is True

    def test_is_relevant_case_insensitive(self, collector):
        assert collector._is_relevant("FORMATION PROFESSIONNELLE", "") is True

    def test_is_relevant_false_for_unrelated(self, collector):
        assert collector._is_relevant("Travaux routiers", "Entretien des routes nationales") is False

    def test_is_relevant_false_for_empty(self, collector):
        assert collector._is_relevant("", "") is False


# ---------------------------------------------------------------------------
# Tests: _is_valid_type
# ---------------------------------------------------------------------------

class TestIsValidType:
    """Tests for text type matching."""

    def test_valid_type_decret(self, collector):
        assert collector._is_valid_type("Decret n 2026-123 du 5 mars 2026") is True

    def test_valid_type_decret_accent(self, collector):
        assert collector._is_valid_type("Decret relatif a la formation") is True

    def test_valid_type_arrete(self, collector):
        assert collector._is_valid_type("Arrete du 1er mars 2026") is True

    def test_valid_type_arrete_accent(self, collector):
        assert collector._is_valid_type("Arrete modifiant les criteres") is True

    def test_valid_type_loi(self, collector):
        assert collector._is_valid_type("Loi n 2026-456 du 10 mars") is True

    def test_valid_type_ordonnance(self, collector):
        assert collector._is_valid_type("Ordonnance relative au travail") is True

    def test_valid_type_circulaire(self, collector):
        assert collector._is_valid_type("Circulaire du 15 mars 2026") is True

    def test_valid_type_decision(self, collector):
        assert collector._is_valid_type("Decision du conseil") is True

    def test_invalid_type_rapport(self, collector):
        assert collector._is_valid_type("Rapport d'activite annuel") is False

    def test_invalid_type_avis(self, collector):
        assert collector._is_valid_type("Avis de vacance de poste") is False


# ---------------------------------------------------------------------------
# Tests: _parse_atom_entry
# ---------------------------------------------------------------------------

class TestParseAtomEntry:
    """Tests for parsing single Atom <entry> elements."""

    def test_parse_atom_entry_complete(self, collector):
        """A fully populated entry should produce a correct article dict."""
        root = ET.fromstring(SAMPLE_ATOM_XML)
        entries = root.findall("atom:entry", ATOM_NS)
        entry = entries[0]

        result = collector._parse_atom_entry(entry)

        assert result is not None
        assert result["source"] == "legifrance"
        assert result["source_id"] == "legifrance-JORFTEXT000053659239"
        assert "formation professionnelle" in result["title"].lower()
        assert result["url"] == "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053659239"
        assert result["published_date"] == "2026-03-10"
        assert result["category"] == "reglementaire"
        assert result["status"] == "new"
        assert "Journal Officiel" in result["content"]

    def test_parse_atom_entry_without_author(self, collector):
        """Entry without <author> should still parse correctly."""
        root = ET.fromstring(SAMPLE_ATOM_XML)
        entries = root.findall("atom:entry", ATOM_NS)
        # Second entry has no author
        result = collector._parse_atom_entry(entries[1])

        assert result is not None
        assert result["source_id"] == "legifrance-JORFTEXT000053659240"
        assert "qualiopi" in result["title"].lower()

    def test_parse_atom_entry_missing_fields(self, collector):
        """Entry with empty title should still return a dict with fallback title."""
        root = ET.fromstring(SAMPLE_ATOM_ENTRY_MISSING)
        entries = root.findall("atom:entry", ATOM_NS)
        result = collector._parse_atom_entry(entries[0])

        assert result is not None
        # Fallback title when empty
        assert result["title"] == "Sans titre"
        # source_id should use hash fallback since no URL
        assert result["source_id"].startswith("legifrance-")


# ---------------------------------------------------------------------------
# Tests: _parse_date
# ---------------------------------------------------------------------------

class TestParseDate:
    """Tests for ISO 8601 date format parsing."""

    def test_parse_full_iso_with_timezone(self, collector):
        assert collector._parse_date("2026-03-10T08:00:00+01:00") == "2026-03-10"

    def test_parse_iso_without_timezone(self, collector):
        assert collector._parse_date("2026-03-10T08:00:00") == "2026-03-10"

    def test_parse_date_only(self, collector):
        assert collector._parse_date("2026-03-10") == "2026-03-10"

    def test_parse_utc_zulu(self, collector):
        # With timezone offset stripped, should still parse
        assert collector._parse_date("2026-03-10T08:00:00+00:00") == "2026-03-10"

    def test_parse_invalid_returns_none(self, collector):
        assert collector._parse_date("not-a-date") is None

    def test_parse_empty_returns_none(self, collector):
        # _parse_date is called only when text is not None/empty, but test the behavior
        assert collector._parse_date("") is None


# ---------------------------------------------------------------------------
# Tests: _collect_from_rss (integration with mocked HTTP)
# ---------------------------------------------------------------------------

class TestCollectFromRss:
    """Tests for RSS feed collection with mocked HTTP responses."""

    @patch.object(LegifranceRSSCollector, "_fetch_rss_feed")
    def test_collect_from_rss_filters_relevant(self, mock_fetch, collector):
        """Only formation-related entries should be returned."""
        # Parse the sample XML to get entries
        parsed = collector._parse_atom_feed(SAMPLE_ATOM_XML)
        mock_fetch.return_value = parsed

        articles = collector._collect_from_rss()

        # The first two entries contain formation keywords; the third does not
        assert len(articles) >= 2
        titles = [a["title"].lower() for a in articles]
        assert any("formation professionnelle" in t for t in titles)
        assert any("qualiopi" in t for t in titles)
        # The unrelated "travaux publics" entry should be filtered out
        assert not any("travaux publics" in t for t in titles)

    @patch.object(LegifranceRSSCollector, "_fetch_rss_feed")
    def test_collect_deduplication(self, mock_fetch, collector):
        """Entries with the same source_id should not be duplicated."""
        parsed = collector._parse_atom_feed(SAMPLE_ATOM_XML)
        # Return the same set for every nature filter call (4 calls total)
        mock_fetch.return_value = parsed

        articles = collector._collect_from_rss()

        source_ids = [a["source_id"] for a in articles]
        assert len(source_ids) == len(set(source_ids)), "Duplicate source_ids found"

    @patch("collectors.legifrance_rss.requests.Session.get")
    def test_collect_from_rss_http_error(self, mock_get, collector):
        """HTTP errors should result in an empty list, not an exception."""
        import requests as req
        mock_get.side_effect = req.RequestException("Connection refused")

        articles = collector._collect_from_rss()
        assert articles == []


# ---------------------------------------------------------------------------
# Tests: collect (full pipeline with mocked sources)
# ---------------------------------------------------------------------------

class TestCollect:
    """Tests for the main collect() method."""

    @patch.object(LegifranceRSSCollector, "_collect_from_jorf", return_value=[])
    @patch.object(LegifranceRSSCollector, "_collect_from_rss")
    def test_collect_returns_articles(self, mock_rss, mock_jorf, collector):
        """collect() should return articles from RSS."""
        mock_rss.return_value = [
            {
                "source": "legifrance",
                "source_id": "legifrance-JORFTEXT000053659239",
                "title": "Decret formation professionnelle",
                "url": "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053659239",
                "content": "Formation pro",
                "published_date": "2026-03-10",
                "category": "reglementaire",
                "status": "new",
            },
        ]

        articles = collector.collect()
        assert len(articles) == 1
        assert articles[0]["source_id"] == "legifrance-JORFTEXT000053659239"

    @patch.object(LegifranceRSSCollector, "_collect_from_jorf")
    @patch.object(LegifranceRSSCollector, "_collect_from_rss")
    def test_collect_deduplicates_across_sources(self, mock_rss, mock_jorf, collector):
        """Same text from RSS and JORF should appear only once."""
        article = {
            "source": "legifrance",
            "source_id": "legifrance-JORFTEXT000053659239",
            "title": "Decret formation",
            "url": "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053659239",
            "content": None,
            "published_date": "2026-03-10",
            "category": "reglementaire",
            "status": "new",
        }
        mock_rss.return_value = [article]
        mock_jorf.return_value = [
            {
                **article,
                "source_id": "legifrance-jorf-JORFTEXT000053659239",
            },
        ]

        articles = collector.collect()
        # JORF duplicate should be filtered by _extract_text_id cross-check
        assert len(articles) == 1

    @patch.object(LegifranceRSSCollector, "_collect_from_jorf")
    @patch.object(LegifranceRSSCollector, "_collect_from_rss")
    def test_collect_resilient_to_rss_failure(self, mock_rss, mock_jorf, collector):
        """If RSS fails, JORF articles should still be returned."""
        mock_rss.side_effect = Exception("RSS down")
        mock_jorf.return_value = [
            {
                "source": "legifrance",
                "source_id": "legifrance-jorf-JORFTEXT000099000001",
                "title": "Arrete formation",
                "url": "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000099000001",
                "content": None,
                "published_date": "2026-03-10",
                "category": "reglementaire",
                "status": "new",
            },
        ]

        articles = collector.collect()
        assert len(articles) == 1


# ---------------------------------------------------------------------------
# Tests: run() saves to database
# ---------------------------------------------------------------------------

class TestRun:
    """Tests for the full run() pipeline saving to database."""

    @patch.object(LegifranceRSSCollector, "_collect_from_jorf", return_value=[])
    @patch.object(LegifranceRSSCollector, "_collect_from_rss")
    def test_run_inserts_into_db(self, mock_rss, mock_jorf, db_path, collector):
        """run() should save collected articles into the database."""
        mock_rss.return_value = [
            {
                "source": "legifrance",
                "source_id": "legifrance-JORFTEXT000053659239",
                "title": "Decret formation professionnelle",
                "url": "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053659239",
                "content": "Formation pro content",
                "published_date": "2026-03-10",
                "category": "reglementaire",
                "status": "new",
            },
        ]

        stats = collector.run()

        assert stats["inserted"] == 1
        assert stats["collected"] == 1

        conn = get_connection(db_path)
        rows = get_articles(conn, source="legifrance")
        assert len(rows) == 1
        assert rows[0]["source_id"] == "legifrance-JORFTEXT000053659239"
        conn.close()


# ---------------------------------------------------------------------------
# Tests: _parse_jorf_xml_text (historical archive parsing)
# ---------------------------------------------------------------------------

class TestParseJorfXmlText:
    """Tests for parsing individual JORF XML texts from archives."""

    def test_parses_relevant_text(self, collector):
        """A formation-related XML should be parsed into an article dict."""
        result = collector._parse_jorf_xml_text(SAMPLE_JORF_XML, "2026-03-05")

        assert result is not None
        assert result["source"] == "legifrance"
        assert result["source_id"] == "legifrance-JORFTEXT000099000001"
        assert "formation professionnelle" in result["title"].lower()
        assert result["published_date"] == "2026-03-05"
        assert result["url"] == "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000099000001"
        assert result["category"] == "reglementaire"
        assert result["content"] is not None

    def test_filters_irrelevant_text(self, collector):
        """An unrelated XML should return None."""
        result = collector._parse_jorf_xml_text(SAMPLE_JORF_XML_IRRELEVANT, "2026-03-05")
        assert result is None

    def test_handles_malformed_xml(self, collector):
        """Malformed XML should return None without raising."""
        result = collector._parse_jorf_xml_text(b"<not valid xml", "2026-03-05")
        assert result is None

    def test_handles_empty_xml(self, collector):
        """Minimal XML without required elements should return None."""
        xml = b"<root></root>"
        result = collector._parse_jorf_xml_text(xml, "2026-03-05")
        assert result is None


# ---------------------------------------------------------------------------
# Tests: collect_history (with mocked archives)
# ---------------------------------------------------------------------------

class TestCollectHistory:
    """Tests for historical JORF collection from DILA archives."""

    def _make_tar_gz(self, xml_contents: dict[str, bytes]) -> bytes:
        """Create an in-memory .tar.gz containing the given XML files.

        Args:
            xml_contents: Mapping of filename -> XML bytes.

        Returns:
            bytes of the .tar.gz archive.
        """
        buf = io.BytesIO()
        with tarfile.open(fileobj=buf, mode="w:gz") as tar:
            for name, content in xml_contents.items():
                info = tarfile.TarInfo(name=name)
                info.size = len(content)
                tar.addfile(info, io.BytesIO(content))
        return buf.getvalue()

    @patch.object(LegifranceRSSCollector, "_list_jorf_archives")
    @patch("collectors.legifrance_rss.requests.Session.get")
    def test_collect_history_parses_xml(self, mock_get, mock_list, db_path, collector):
        """collect_history should download archives, extract XML, and filter."""
        mock_list.return_value = ["JORF_20260310-060000.tar.gz"]

        # Create a tar.gz with one relevant and one irrelevant XML
        tar_bytes = self._make_tar_gz({
            "texte/JORFTEXT000099000001.xml": SAMPLE_JORF_XML,
            "texte/JORFTEXT000099000002.xml": SAMPLE_JORF_XML_IRRELEVANT,
        })

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status = MagicMock()
        mock_response.iter_content = MagicMock(return_value=[tar_bytes])
        mock_get.return_value = mock_response

        stats = collector.collect_history(weeks_back=4)

        assert stats["archives_found"] == 1
        assert stats["archives_processed"] == 1
        assert stats["relevant_found"] >= 1
        assert stats["inserted"] >= 1

        # Verify article in database
        conn = get_connection(db_path)
        rows = get_articles(conn, source="legifrance")
        assert len(rows) >= 1
        assert any("formation professionnelle" in r["title"].lower() for r in rows)
        conn.close()

    @patch.object(LegifranceRSSCollector, "_list_jorf_archives")
    def test_collect_history_no_archives(self, mock_list, collector):
        """If no archives are found, stats should reflect that."""
        mock_list.return_value = []

        stats = collector.collect_history(weeks_back=1)

        assert stats["archives_found"] == 0
        assert stats["inserted"] == 0

    @patch.object(LegifranceRSSCollector, "_list_jorf_archives")
    def test_collect_history_date_filtering(self, mock_list, collector):
        """Archives older than the cutoff should not be processed."""
        # Archive from 2020 should be excluded when looking back 4 weeks
        mock_list.return_value = ["JORF_20200101-060000.tar.gz"]

        stats = collector.collect_history(weeks_back=4)

        assert stats["archives_found"] == 0
        assert stats["archives_processed"] == 0


# ---------------------------------------------------------------------------
# Tests: _extract_date_from_filename
# ---------------------------------------------------------------------------

class TestExtractDateFromFilename:
    """Tests for date extraction from JORF archive filenames."""

    def test_valid_filename(self, collector):
        dt = collector._extract_date_from_filename("JORF_20260310-060000.tar.gz")
        assert dt is not None
        assert dt.year == 2026
        assert dt.month == 3
        assert dt.day == 10

    def test_invalid_filename(self, collector):
        assert collector._extract_date_from_filename("random_file.tar.gz") is None
