"""Tests for the ANSM RSS collector."""

import os
import tempfile
from unittest.mock import MagicMock, patch

import pytest
import requests

from collectors.ansm import (
    ANSM_FEEDS,
    ANSMCollector,
    _extract_slug,
    _hash_url,
    _strip_html,
)
from storage.database import get_articles, get_connection, init_db


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def db_path():
    """Create a temporary SQLite database for testing."""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    init_db(path)
    yield path
    os.unlink(path)


@pytest.fixture
def collector(db_path):
    """ANSMCollector wired to the test database."""
    return ANSMCollector(db_path, logger=MagicMock())


# ---------------------------------------------------------------------------
# Sample RSS XML
# ---------------------------------------------------------------------------

SAMPLE_RSS_FULL = b"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
 <channel>
  <title>Informations de securite - Ansm.sante.fr</title>
  <link>https://ansm.sante.fr/informations-de-securite/</link>
  <description>Informations de securite du jour de l'ANSM</description>
  <item>
   <title>Mektovi (binimetinib) : ne confondez pas les dosages 15 mg et 45 mg</title>
   <link>https://ansm.sante.fr/actualites/mektovi-binimetinib-dosages</link>
   <guid isPermaLink="true">https://ansm.sante.fr/actualites/mektovi-binimetinib-dosages</guid>
   <pubDate>Fri, 02 May 2026 09:00:00 +0200</pubDate>
   <description>&lt;p&gt;L'ANSM rappelle aux professionnels de sante qu'il est essentiel de bien differencier les dosages de Mektovi.&lt;/p&gt;</description>
  </item>
  <item>
   <title>Indisponibilite d'Alepsal (tous dosages)</title>
   <link>https://ansm.sante.fr/actualites/indisponibilite-alepsal</link>
   <guid isPermaLink="true">https://ansm.sante.fr/actualites/indisponibilite-alepsal</guid>
   <pubDate>Fri, 02 May 2026 11:30:00 +0200</pubDate>
   <description><![CDATA[Tensions d'approvisionnement, des alternatives existent pour les medecins generalistes.]]></description>
  </item>
 </channel>
</rss>
"""

SAMPLE_RSS_EMPTY = b"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
 <channel>
  <title>Actualites - Ansm.sante.fr</title>
  <link>https://ansm.sante.fr/actualites/</link>
  <description>Actualites du jour de l'ANSM</description>
 </channel>
</rss>
"""

SAMPLE_RSS_NO_GUID = b"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
 <channel>
  <title>Actualites - Ansm.sante.fr</title>
  <link>https://ansm.sante.fr/actualites/</link>
  <description>desc</description>
  <item>
   <title>Article sans GUID</title>
   <link>https://ansm.sante.fr/actualites/article-sans-guid</link>
   <pubDate>Mon, 28 Apr 2026 08:00:00 +0200</pubDate>
   <description>Body</description>
  </item>
 </channel>
</rss>
"""


# ---------------------------------------------------------------------------
# Helpers (module-level)
# ---------------------------------------------------------------------------

class TestStripHtml:
    def test_strips_tags(self):
        assert _strip_html("<p>Hello <b>world</b></p>") == "Hello world"

    def test_decodes_entities(self):
        assert _strip_html("rappel m&eacute;dicament") == "rappel médicament"

    def test_handles_none(self):
        assert _strip_html(None) == ""

    def test_handles_empty(self):
        assert _strip_html("") == ""

    def test_collapses_whitespace(self):
        assert _strip_html("a\n\n  b\t c") == "a b c"


class TestExtractSlug:
    def test_extracts_actualites_slug(self):
        url = "https://ansm.sante.fr/actualites/mektovi-binimetinib-dosages"
        assert _extract_slug(url) == "mektovi-binimetinib-dosages"

    def test_returns_none_when_no_match(self):
        assert _extract_slug("https://example.com/random") is None

    def test_returns_none_for_empty(self):
        assert _extract_slug("") is None
        assert _extract_slug(None) is None


class TestHashUrl:
    def test_stable_for_same_input(self):
        assert _hash_url("https://x") == _hash_url("https://x")

    def test_different_for_different_input(self):
        assert _hash_url("a") != _hash_url("b")

    def test_returns_short_hex(self):
        h = _hash_url("https://ansm.sante.fr/actualites/foo")
        assert len(h) == 16
        assert all(c in "0123456789abcdef" for c in h)


# ---------------------------------------------------------------------------
# Test : _parse_pubdate
# ---------------------------------------------------------------------------

class TestParsePubdate:
    def test_rfc822(self):
        assert ANSMCollector._parse_pubdate("Fri, 02 May 2026 09:00:00 +0200") == "2026-05-02"

    def test_rfc822_gmt(self):
        assert ANSMCollector._parse_pubdate("Wed, 01 Jan 2025 00:00:00 GMT") == "2025-01-01"

    def test_iso8601(self):
        assert ANSMCollector._parse_pubdate("2026-05-02T09:00:00+02:00") == "2026-05-02"

    def test_date_only(self):
        assert ANSMCollector._parse_pubdate("2026-05-02") == "2026-05-02"

    def test_empty_returns_none(self):
        assert ANSMCollector._parse_pubdate("") is None
        assert ANSMCollector._parse_pubdate(None) is None

    def test_invalid_returns_none(self):
        assert ANSMCollector._parse_pubdate("not-a-date") is None


# ---------------------------------------------------------------------------
# Test : _parse_rss_item / _parse_rss_feed
# ---------------------------------------------------------------------------

class TestParseRssFeed:
    def test_parses_full_feed(self, collector):
        articles = collector._parse_rss_feed(SAMPLE_RSS_FULL, "informations_securite")

        assert len(articles) == 2
        a0 = articles[0]
        assert a0["source"] == "ansm"
        assert a0["source_id"].startswith("ansm-")
        assert "mektovi" in a0["title"].lower()
        assert a0["url"] == "https://ansm.sante.fr/actualites/mektovi-binimetinib-dosages"
        assert a0["published_date"] == "2026-05-02"
        assert a0["category"] == "reglementaire"
        assert a0["status"] == "new"
        assert "[Alerte securite ANSM]" in a0["content"] or "[Alerte sécurité ANSM]" in a0["content"]
        # No HTML in content
        assert "<p>" not in a0["content"]

    def test_parses_cdata_description(self, collector):
        """CDATA section should be properly extracted as plain text."""
        articles = collector._parse_rss_feed(SAMPLE_RSS_FULL, "actualites")
        # 2nd item uses CDATA
        a1 = articles[1]
        assert "alternatives existent" in a1["content"]
        assert "<![CDATA[" not in a1["content"]

    def test_empty_feed(self, collector):
        articles = collector._parse_rss_feed(SAMPLE_RSS_EMPTY, "actualites")
        assert articles == []

    def test_malformed_xml(self, collector):
        articles = collector._parse_rss_feed(b"<not xml", "actualites")
        assert articles == []

    def test_empty_bytes(self, collector):
        articles = collector._parse_rss_feed(b"", "actualites")
        assert articles == []

    def test_item_without_guid_uses_link_slug(self, collector):
        articles = collector._parse_rss_feed(SAMPLE_RSS_NO_GUID, "actualites")
        assert len(articles) == 1
        assert articles[0]["source_id"].startswith("ansm-")

    def test_feed_label_prefixes_content(self, collector):
        articles = collector._parse_rss_feed(SAMPLE_RSS_FULL, "disponibilite_produits_sante")
        assert "Rupture" in articles[0]["content"] or "rupture" in articles[0]["content"].lower()


# ---------------------------------------------------------------------------
# Test : _fetch_feed (mocked HTTP)
# ---------------------------------------------------------------------------

class TestFetchFeed:
    def test_returns_bytes_on_success(self, collector):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.content = SAMPLE_RSS_FULL
        mock_resp.raise_for_status = MagicMock()

        with patch.object(collector._session, "get", return_value=mock_resp) as g:
            data = collector._fetch_feed("https://ansm.sante.fr/rss/actualites")
            assert data == SAMPLE_RSS_FULL
            assert g.call_count == 1

    def test_returns_none_on_404(self, collector):
        mock_resp = MagicMock()
        mock_resp.status_code = 404
        mock_resp.raise_for_status.side_effect = requests.HTTPError("404")

        with patch.object(collector._session, "get", return_value=mock_resp):
            data = collector._fetch_feed("https://ansm.sante.fr/rss/actualites")
            assert data is None

    def test_retry_on_5xx(self, collector):
        """500 should trigger retries up to MAX_RETRIES."""
        mock_resp = MagicMock()
        mock_resp.status_code = 500
        mock_resp.raise_for_status = MagicMock()

        with patch.object(collector._session, "get", return_value=mock_resp) as g, \
                patch("collectors.ansm.time.sleep"):
            data = collector._fetch_feed("https://ansm.sante.fr/rss/actualites")
            assert data is None
            assert g.call_count == collector.MAX_RETRIES

    def test_retry_on_request_exception(self, collector):
        with patch.object(collector._session, "get", side_effect=requests.ConnectionError("nope")) as g, \
                patch("collectors.ansm.time.sleep"):
            data = collector._fetch_feed("https://ansm.sante.fr/rss/actualites")
            assert data is None
            assert g.call_count == collector.MAX_RETRIES


# ---------------------------------------------------------------------------
# Test : collect() — fusion des 3 flux + dedup
# ---------------------------------------------------------------------------

class TestCollect:
    def test_aggregates_three_feeds(self, collector):
        """Three different feeds with three different items -> 3 articles."""
        feeds = {
            ANSM_FEEDS[0][1]: SAMPLE_RSS_FULL,  # informations_securite : 2 items
            ANSM_FEEDS[1][1]: SAMPLE_RSS_EMPTY,  # actualites : 0 items
            ANSM_FEEDS[2][1]: SAMPLE_RSS_NO_GUID,  # disponibilite : 1 item
        }

        def fake_fetch(url):
            return feeds.get(url)

        with patch.object(collector, "_fetch_feed", side_effect=fake_fetch), \
                patch("collectors.ansm.time.sleep"):
            articles = collector.collect()

        assert len(articles) == 3
        sources = {a["source"] for a in articles}
        assert sources == {"ansm"}

    def test_dedup_across_feeds(self, collector):
        """Same article in 2 feeds -> kept once (1st-priority feed wins)."""
        # Both feeds return the same SAMPLE_RSS_FULL → 2 items dans chaque
        # mais ils doivent être dédupliqués entre les flux.
        feeds = {
            ANSM_FEEDS[0][1]: SAMPLE_RSS_FULL,  # informations_securite
            ANSM_FEEDS[1][1]: SAMPLE_RSS_FULL,  # actualites — mêmes items
            ANSM_FEEDS[2][1]: SAMPLE_RSS_EMPTY,
        }

        with patch.object(collector, "_fetch_feed", side_effect=lambda u: feeds.get(u)), \
                patch("collectors.ansm.time.sleep"):
            articles = collector.collect()

        # 2 items uniques (pas 4)
        assert len(articles) == 2
        # Le préfixe doit être celui du premier flux (informations_securite)
        assert all(("Alerte" in a["content"] or "alerte" in a["content"].lower())
                   for a in articles)

    def test_collect_empty_when_all_feeds_empty(self, collector):
        """All feeds empty (jour sans publication) -> [], pas d'erreur."""
        with patch.object(collector, "_fetch_feed", return_value=SAMPLE_RSS_EMPTY), \
                patch("collectors.ansm.time.sleep"):
            articles = collector.collect()
        assert articles == []

    def test_collect_resilient_to_one_feed_failure(self, collector):
        """If one feed returns None (HTTP error), others still processed."""
        def fake_fetch(url):
            if url == ANSM_FEEDS[0][1]:
                return None  # informations_securite KO
            return SAMPLE_RSS_FULL  # 2 autres flux OK

        with patch.object(collector, "_fetch_feed", side_effect=fake_fetch), \
                patch("collectors.ansm.time.sleep"):
            articles = collector.collect()

        # Le 2e flux donne 2 items, le 3e flux donne 0 (déjà vus -> dedup)
        # = 2 articles uniques
        assert len(articles) == 2

    def test_keyword_filter_when_enabled(self, db_path):
        """With apply_keyword_filter=True, only items matching MEDICAL_KEYWORDS are kept."""
        collector = ANSMCollector(db_path, logger=MagicMock(), apply_keyword_filter=True)
        feeds = {
            ANSM_FEEDS[0][1]: SAMPLE_RSS_FULL,  # contient "professionnels de sante"
            ANSM_FEEDS[1][1]: SAMPLE_RSS_EMPTY,
            ANSM_FEEDS[2][1]: SAMPLE_RSS_EMPTY,
        }
        with patch.object(collector, "_fetch_feed", side_effect=lambda u: feeds.get(u)), \
                patch("collectors.ansm.time.sleep"):
            articles = collector.collect()

        # Les 2 items contiennent des keywords ("professionnels de sante",
        # "medecins generalistes")
        assert len(articles) == 2

    def test_keyword_filter_drops_irrelevant(self, db_path):
        """Item without medical keywords is dropped when filter is on."""
        irrelevant = b"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
 <channel>
  <title>x</title>
  <description>y</description>
  <item>
   <title>Information generique sur la batisse</title>
   <link>https://ansm.sante.fr/actualites/batisse</link>
   <guid>https://ansm.sante.fr/actualites/batisse</guid>
   <pubDate>Fri, 02 May 2026 09:00:00 +0200</pubDate>
   <description>Aucun mot-cle medical ici.</description>
  </item>
 </channel>
</rss>
"""
        collector = ANSMCollector(db_path, logger=MagicMock(), apply_keyword_filter=True)
        feeds = {
            ANSM_FEEDS[0][1]: irrelevant,
            ANSM_FEEDS[1][1]: SAMPLE_RSS_EMPTY,
            ANSM_FEEDS[2][1]: SAMPLE_RSS_EMPTY,
        }
        with patch.object(collector, "_fetch_feed", side_effect=lambda u: feeds.get(u)), \
                patch("collectors.ansm.time.sleep"):
            articles = collector.collect()

        assert articles == []


# ---------------------------------------------------------------------------
# Test : run() — pipeline complet -> DB
# ---------------------------------------------------------------------------

class TestRun:
    def test_run_persists_to_db(self, db_path, collector):
        feeds = {
            ANSM_FEEDS[0][1]: SAMPLE_RSS_FULL,
            ANSM_FEEDS[1][1]: SAMPLE_RSS_EMPTY,
            ANSM_FEEDS[2][1]: SAMPLE_RSS_EMPTY,
        }
        with patch.object(collector, "_fetch_feed", side_effect=lambda u: feeds.get(u)), \
                patch("collectors.ansm.time.sleep"):
            stats = collector.run()

        assert stats["source"] == "ansm"
        assert stats["collected"] == 2
        assert stats["inserted"] == 2

        conn = get_connection(db_path)
        rows = get_articles(conn, source="ansm")
        assert len(rows) == 2
        for r in rows:
            assert r["source"] == "ansm"
            assert r["category"] == "reglementaire"
            assert r["status"] == "new"
        conn.close()

    def test_run_dedups_on_repeated_collect(self, db_path, collector):
        """Running collect twice should not double-insert (UNIQUE source_id)."""
        feeds = {
            ANSM_FEEDS[0][1]: SAMPLE_RSS_FULL,
            ANSM_FEEDS[1][1]: SAMPLE_RSS_EMPTY,
            ANSM_FEEDS[2][1]: SAMPLE_RSS_EMPTY,
        }
        with patch.object(collector, "_fetch_feed", side_effect=lambda u: feeds.get(u)), \
                patch("collectors.ansm.time.sleep"):
            collector.run()
            stats2 = collector.run()

        assert stats2["inserted"] == 0
        assert stats2["duplicates"] == 2
