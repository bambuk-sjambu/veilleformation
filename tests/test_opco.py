"""Tests for OPCO collectors."""

import pytest
from unittest.mock import patch, MagicMock
from collectors.opco import (
    OPCOSanteCollector,
    OPCOmmerceCollector,
    AKTOCollector,
    OPCO2iCollector,
    UniformationCollector,
    collect_all_opco,
    make_source_id,
    extract_date_fr,
)


class TestHelpers:
    def test_make_source_id_deterministic(self):
        id1 = make_source_id("opco_sante", "https://example.com/page1")
        id2 = make_source_id("opco_sante", "https://example.com/page1")
        assert id1 == id2

    def test_make_source_id_different_urls(self):
        id1 = make_source_id("opco_sante", "https://example.com/page1")
        id2 = make_source_id("opco_sante", "https://example.com/page2")
        assert id1 != id2

    def test_make_source_id_format(self):
        sid = make_source_id("akto", "https://example.com")
        assert sid.startswith("akto-")
        assert len(sid) == len("akto-") + 12

    def test_extract_date_fr_standard(self):
        assert extract_date_fr("12 mars 2025") == "2025-03-12"

    def test_extract_date_fr_accents(self):
        assert extract_date_fr("5 février 2025") == "2025-02-05"
        assert extract_date_fr("1 décembre 2024") == "2024-12-01"

    def test_extract_date_fr_slashes(self):
        assert extract_date_fr("15/06/2025") == "2025-06-15"

    def test_extract_date_fr_none(self):
        assert extract_date_fr(None) is None

    def test_extract_date_fr_no_match(self):
        assert extract_date_fr("pas de date") is None

    def test_extract_date_fr_in_text(self):
        assert extract_date_fr("Publie le 20 janvier 2025 par Admin") == "2025-01-20"


SAMPLE_HTML_WITH_ARTICLES = """
<html><body>
<article>
  <a href="/ao/formation-2025">
    <h3>Appel a projets formation professionnelle 2025</h3>
  </a>
  <time datetime="2025-03-01">1 mars 2025</time>
  <div class="description">Formation pour les entreprises du secteur sante</div>
</article>
<article>
  <a href="/ao/bilan-competences">
    <h3>Marche prestations bilan de competences</h3>
  </a>
  <time datetime="2025-02-15">15 fevrier 2025</time>
</article>
</body></html>
"""

SAMPLE_HTML_EMPTY = """
<html><body>
<div class="content">
  <p>Aucun appel d'offres en cours.</p>
</div>
</body></html>
"""


class TestOPCOSanteCollector:
    def test_source_name(self):
        c = OPCOSanteCollector("test.db")
        assert c.SOURCE_NAME == "opco"
        assert c.OPCO_NAME == "opco_sante"

    @patch("collectors.opco.httpx.Client")
    def test_collect_parses_articles(self, mock_client_cls):
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_resp = MagicMock()
        mock_resp.text = SAMPLE_HTML_WITH_ARTICLES
        mock_resp.raise_for_status = MagicMock()
        mock_client.get.return_value = mock_resp

        c = OPCOSanteCollector("test.db")
        articles = c.collect()

        assert len(articles) >= 1
        for a in articles:
            assert a["source"] == "opco"
            assert a["category"] == "financement"
            assert a["acheteur"] == "OPCO Sante"

    @patch("collectors.opco.httpx.Client")
    def test_collect_empty_page(self, mock_client_cls):
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_resp = MagicMock()
        mock_resp.text = SAMPLE_HTML_EMPTY
        mock_resp.raise_for_status = MagicMock()
        mock_client.get.return_value = mock_resp

        c = OPCOSanteCollector("test.db")
        articles = c.collect()
        assert len(articles) == 0

    @patch("collectors.opco.httpx.Client")
    def test_collect_handles_http_error(self, mock_client_cls):
        import httpx
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_client.get.side_effect = httpx.HTTPError("Connection refused")

        c = OPCOSanteCollector("test.db")
        articles = c.collect()
        assert articles == []


class TestAKTOCollector:
    def test_source_name(self):
        c = AKTOCollector("test.db")
        assert c.OPCO_NAME == "akto"

    @patch("collectors.opco.httpx.Client")
    def test_collect_parses_cards(self, mock_client_cls):
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_resp = MagicMock()
        mock_resp.text = SAMPLE_HTML_WITH_ARTICLES
        mock_resp.raise_for_status = MagicMock()
        mock_client.get.return_value = mock_resp

        c = AKTOCollector("test.db")
        articles = c.collect()

        for a in articles:
            assert a["acheteur"] == "AKTO"
            assert a["category"] == "financement"
            assert a["source_id"].startswith("akto-")


class TestUniformationCollector:
    def test_source_name(self):
        c = UniformationCollector("test.db")
        assert c.OPCO_NAME == "uniformation"

    @patch("collectors.opco.httpx.Client")
    def test_collect_handles_error(self, mock_client_cls):
        import httpx
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_client.get.side_effect = httpx.HTTPError("Timeout")

        c = UniformationCollector("test.db")
        articles = c.collect()
        assert articles == []


class TestCollectAllOpco:
    @patch("collectors.opco.OPCO_COLLECTORS")
    def test_collect_all_returns_stats(self, mock_registry):
        mock_cls = MagicMock()
        mock_cls.return_value.run.return_value = {
            "source": "opco",
            "collected": 3,
            "inserted": 2,
            "duplicates": 1,
            "errors": [],
        }
        mock_registry.items.return_value = [
            ("opco_sante", mock_cls),
            ("akto", mock_cls),
        ]

        stats = collect_all_opco("test.db")
        assert len(stats) == 2
        assert all(s["collected"] == 3 for s in stats)

    def test_collect_all_handles_exceptions(self):
        # With a bad db_path, collectors should still not crash
        stats = collect_all_opco("/nonexistent/path/db.sqlite")
        assert isinstance(stats, list)


class TestArticleFormat:
    """Verify article dicts match the database schema."""

    @patch("collectors.opco.httpx.Client")
    def test_article_has_required_fields(self, mock_client_cls):
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_resp = MagicMock()
        mock_resp.text = SAMPLE_HTML_WITH_ARTICLES
        mock_resp.raise_for_status = MagicMock()
        mock_client.get.return_value = mock_resp

        c = AKTOCollector("test.db")
        articles = c.collect()

        required_fields = ["source", "source_id", "title", "url", "category", "status"]
        for a in articles:
            for field in required_fields:
                assert field in a, f"Missing field: {field}"
            assert a["source"] == "opco"
            assert a["status"] == "new"
            assert a["category"] == "financement"
