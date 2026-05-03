"""Tests for the BOFiP collector (RSS 2.0 + HTML fallback)."""

import os
import tempfile
from unittest.mock import MagicMock, patch

import pytest
import requests

from collectors.bofip import (
    BOFIP_HTML_FALLBACK_URL,
    BOFIP_RSS_URL,
    BOFiPCollector,
    _category_from_bofip,
    _extract_bofip_id,
    _parse_publi_date,
    _strip_html,
)
from storage.database import init_db


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def db_path():
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    init_db(path)
    yield path
    os.unlink(path)


@pytest.fixture
def collector(db_path):
    return BOFiPCollector(db_path, logger=MagicMock())


# ---------------------------------------------------------------------------
# Sample BOFiP RSS payload (truncated, real schema observed 2026-05-02)
# ---------------------------------------------------------------------------

SAMPLE_RSS = b"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>BOFiP-Imp\xc3\xb4ts - Actualit\xc3\xa9s, rescrits, toutes les publications</title>
    <link>http://bofip.impots.gouv.fr/bofip</link>
    <description>BOFIP-Impots</description>
    <item>
      <title>IF - Pr\xc3\xa9cisions sur le champ de la CFE (loi de finances 2026)</title>
      <link>https://bofip.impots.gouv.fr/bofip/15003-PGP.html/ACTU-2026-00056</link>
      <description>IF - Pr\xc3\xa9cisions sur la CFE&amp;nbsp;(identifiant juridique ACTU-2026-00056; publi\xc3\xa9 le 29/04/2026)</description>
      <category>Actualit\xc3\xa9</category>
    </item>
    <item>
      <title>BIC - R\xc3\xa9gime des plus-values professionnelles</title>
      <link>https://bofip.impots.gouv.fr/bofip/3980-PGP.html/identifiant=BOI-BIC-PVMV-10-20260429</link>
      <description>BIC - Plus-values (identifiant juridique BOI-BIC-PVMV-10; publi\xc3\xa9 le 29/04/2026)</description>
      <category>Publication doctrinale</category>
    </item>
    <item>
      <title>Sans identifiant juridique parsable</title>
      <link>https://bofip.impots.gouv.fr/some/other/path</link>
      <description>Texte sans identifiant ni date</description>
      <category>Actualit\xc3\xa9</category>
    </item>
  </channel>
</rss>
"""


SAMPLE_HTML = """
<html><body>
  <ul>
    <li><a href="/bofip/15003-PGP.html/ACTU-2026-00056"
       title="29/04/2026 : IF - Pr&eacute;cisions sur la CFE">IF - Pr&eacute;cisions CFE</a></li>
    <li><a href="/bofip/14862-PGP.html/ACTU-2025-00179"
       title="29/04/2026 : INT - Conventions fiscales">INT - Conventions fiscales</a></li>
  </ul>
</body></html>
"""


# ---------------------------------------------------------------------------
# Pure helpers
# ---------------------------------------------------------------------------

class TestStripHtml:
    def test_strips_tags(self):
        assert _strip_html("<p>Hello <b>world</b></p>") == "Hello world"

    def test_decodes_entities_and_nbsp(self):
        assert "loi" in _strip_html("loi&nbsp;n&deg;&nbsp;2026-103")

    def test_handles_empty(self):
        assert _strip_html("") == ""
        assert _strip_html(None) == ""


class TestExtractBofipId:
    def test_actu_from_url(self):
        url = "https://bofip.impots.gouv.fr/bofip/15003-PGP.html/ACTU-2026-00056"
        assert _extract_bofip_id(url) == "ACTU-2026-00056"

    def test_boi_from_url_with_identifiant(self):
        url = "https://bofip.impots.gouv.fr/bofip/3980-PGP.html/identifiant=BOI-IF-CFE-40-30-20-40-20260429"
        assert _extract_bofip_id(url) == "BOI-IF-CFE-40-30-20-40-20260429"

    def test_fallback_on_description(self):
        url = "https://bofip.impots.gouv.fr/some/other/path"
        desc = "BIC - foo (identifiant juridique BOI-BIC-PVMV-10; publié le 29/04/2026)"
        assert _extract_bofip_id(url, desc) == "BOI-BIC-PVMV-10"

    def test_returns_none(self):
        assert _extract_bofip_id("", "") is None


class TestParsePubliDate:
    def test_extracts_iso(self):
        assert _parse_publi_date("foo (publié le 29/04/2026)") == "2026-04-29"

    def test_handles_unaccented(self):
        assert _parse_publi_date("publie le 01/01/2026") == "2026-01-01"

    def test_returns_none_when_missing(self):
        assert _parse_publi_date("pas de date ici") is None

    def test_returns_none_for_invalid_date(self):
        assert _parse_publi_date("publié le 32/13/2026") is None


class TestCategoryMapping:
    def test_actualite(self):
        assert _category_from_bofip("Actualité") == "reglementaire"

    def test_publication_doctrinale(self):
        assert _category_from_bofip("Publication doctrinale") == "reglementaire"

    def test_unknown(self):
        assert _category_from_bofip("") == "reglementaire"


# ---------------------------------------------------------------------------
# RSS parsing
# ---------------------------------------------------------------------------

class TestParseRssFeed:
    def test_parses_three_items(self, collector):
        articles = collector._parse_rss_feed(SAMPLE_RSS)
        assert len(articles) == 3

    def test_first_item_actualite(self, collector):
        article = collector._parse_rss_feed(SAMPLE_RSS)[0]
        assert article["source"] == "bofip"
        assert article["source_id"] == "bofip-ACTU-2026-00056"
        assert "CFE" in article["title"]
        assert article["url"].endswith("ACTU-2026-00056")
        assert article["published_date"] == "2026-04-29"
        assert article["category"] == "reglementaire"
        assert article["status"] == "new"
        assert article["extra_meta_payload"]["bofip_identifier"] == "ACTU-2026-00056"
        assert article["extra_meta_payload"]["bofip_category"] == "Actualité"

    def test_second_item_boi(self, collector):
        # BOI identifier in URL includes the YYYYMMDD revision suffix, so each
        # revision is treated as a distinct article (intentional dedup behaviour).
        article = collector._parse_rss_feed(SAMPLE_RSS)[1]
        assert article["source_id"] == "bofip-BOI-BIC-PVMV-10-20260429"
        assert article["extra_meta_payload"]["bofip_identifier"].startswith("BOI-BIC-PVMV-10")
        assert article["extra_meta_payload"]["bofip_category"] == "Publication doctrinale"

    def test_third_item_no_id_falls_back_to_hash(self, collector):
        article = collector._parse_rss_feed(SAMPLE_RSS)[2]
        # No ACTU/BOI id → must still produce a unique source_id
        assert article["source_id"].startswith("bofip-")
        assert article["published_date"] is None  # no "publié le ..."
        assert article["category"] == "reglementaire"

    def test_handles_empty_xml(self, collector):
        assert collector._parse_rss_feed(b"") == []

    def test_handles_malformed_xml(self, collector):
        assert collector._parse_rss_feed(b"<<not xml>>") == []

    def test_handles_xml_without_channel(self, collector):
        assert collector._parse_rss_feed(
            b'<?xml version="1.0"?><rss version="2.0"></rss>'
        ) == []


class TestParseHtmlFallback:
    def test_extracts_actu_links(self, collector):
        articles = collector._parse_html_fallback(SAMPLE_HTML)
        assert len(articles) == 2
        a0 = articles[0]
        assert a0["source"] == "bofip"
        assert a0["source_id"] == "bofip-ACTU-2026-00056"
        assert a0["url"].startswith("https://bofip.impots.gouv.fr/bofip/")
        assert a0["published_date"] == "2026-04-29"
        assert "CFE" in a0["title"] or "Précisions" in a0["title"]
        assert a0["category"] == "reglementaire"

    def test_dedupes_repeated_actu_ids(self, collector):
        # Same ACTU id twice → only one article
        html = SAMPLE_HTML + SAMPLE_HTML
        articles = collector._parse_html_fallback(html)
        assert len(articles) == 2

    def test_handles_empty_html(self, collector):
        assert collector._parse_html_fallback("") == []


# ---------------------------------------------------------------------------
# Collect orchestration with mocked HTTP
# ---------------------------------------------------------------------------

class TestCollectMocked:
    def test_collect_uses_rss_when_available(self, collector):
        fake_response = MagicMock()
        fake_response.content = SAMPLE_RSS
        fake_response.raise_for_status = MagicMock()
        with patch.object(collector._session, "get", return_value=fake_response) as mock_get:
            articles = collector.collect()
        assert len(articles) == 3
        # RSS only, no HTML fallback when RSS works
        assert mock_get.call_count == 1
        assert mock_get.call_args[0][0] == BOFIP_RSS_URL

    def test_collect_falls_back_to_html_on_rss_failure(self, collector):
        # RSS raises, HTML fallback returns 2 items.
        fake_html_response = MagicMock()
        fake_html_response.text = SAMPLE_HTML
        fake_html_response.raise_for_status = MagicMock()

        def fake_get(url, **kwargs):
            if url == BOFIP_RSS_URL:
                raise requests.ConnectionError("simulated outage")
            if url == BOFIP_HTML_FALLBACK_URL:
                return fake_html_response
            raise AssertionError(f"unexpected URL {url}")

        with patch.object(collector._session, "get", side_effect=fake_get):
            articles = collector.collect()

        assert len(articles) == 2
        assert all(a["source"] == "bofip" for a in articles)

    def test_collect_dedupes_identical_source_ids(self, collector):
        # Sanity: two RSS feeds back-to-back with same items must dedupe.
        fake_response = MagicMock()
        fake_response.content = SAMPLE_RSS
        fake_response.raise_for_status = MagicMock()
        with patch.object(collector._session, "get", return_value=fake_response):
            articles = collector.collect()
        ids = [a["source_id"] for a in articles]
        assert len(ids) == len(set(ids))


# ---------------------------------------------------------------------------
# Live test (skipped by default — set CIPIA_LIVE_TESTS=1 to enable)
# ---------------------------------------------------------------------------

@pytest.mark.skipif(
    os.environ.get("CIPIA_LIVE_TESTS") != "1",
    reason="Live test against bofip.impots.gouv.fr disabled (set CIPIA_LIVE_TESTS=1)",
)
def test_live_bofip_rss(db_path):
    """End-to-end live test: fetch the real BOFiP RSS feed."""
    collector = BOFiPCollector(db_path)
    articles = collector.collect()
    assert len(articles) > 0, "BOFiP RSS feed returned 0 articles"
    first = articles[0]
    assert first["source"] == "bofip"
    assert first["source_id"].startswith("bofip-")
    assert first["title"]
    assert first["category"] == "reglementaire"
