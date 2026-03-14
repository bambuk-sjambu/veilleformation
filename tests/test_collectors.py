"""Tests for the collectors (BOAMP + Legifrance)."""

import json
import os
import tempfile
from unittest.mock import MagicMock, patch

import pytest

from collectors.base import BaseCollector
from collectors.boamp import BOAMPCollector
from collectors.legifrance import LegifranceCollector
from storage.database import get_connection, init_db, get_articles


@pytest.fixture
def db_path():
    """Create a temporary database for testing."""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    init_db(path)
    yield path
    os.unlink(path)


# --- Sample API responses ---

BOAMP_SAMPLE_RESPONSE = {
    "total_count": 2,
    "results": [
        {
            "idweb": "24-56789",
            "objet": "Formation professionnelle continue pour agents territoriaux",
            "descripteurs": "Prestation de formation professionnelle continue",
            "dateparution": "2026-03-10",
            "nomacheteur": "Conseil Departemental du Rhone",
            "lieu_exec_nom": "Auvergne-Rhone-Alpes",
            "datelimiteremiseoffres": "2026-04-15",
            "codecpv": "80500000",
            "montant": 150000.0,
        },
        {
            "idweb": "24-56790",
            "objet": "Bilan de competences pour salaries en reconversion",
            "descripteurs": "Bilan de competences et accompagnement VAE",
            "dateparution": "2026-03-09",
            "nomacheteur": "Region Ile-de-France",
            "lieu_exec_nom": "Ile-de-France",
            "datelimiteremiseoffres": "2026-04-20",
            "codecpv": "80500000",
        },
    ],
}

BOAMP_EXCLUDED_RESPONSE = {
    "total_count": 1,
    "results": [
        {
            "idweb": "24-99999",
            "objet": "Travaux de nettoyage des locaux de formation",
            "descripteurs": "Nettoyage et entretien",
            "dateparution": "2026-03-08",
            "nomacheteur": "Commune de Marseille",
        },
    ],
}


class TestBaseCollector:
    """Tests for the BaseCollector abstract class."""

    def test_collect_raises_not_implemented(self, db_path):
        collector = BaseCollector(db_path)
        with pytest.raises(NotImplementedError):
            collector.collect()

    def test_save_empty_list(self, db_path):
        collector = BaseCollector(db_path)
        result = collector.save([])
        assert result == 0

    def test_save_inserts_articles(self, db_path):
        collector = BaseCollector(db_path)
        articles = [
            {
                "source": "boamp",
                "source_id": "test-001",
                "title": "Test article 1",
                "category": "ao",
            },
            {
                "source": "boamp",
                "source_id": "test-002",
                "title": "Test article 2",
                "category": "ao",
            },
        ]
        count = collector.save(articles)
        assert count == 2

        conn = get_connection(db_path)
        rows = get_articles(conn)
        assert len(rows) == 2
        conn.close()

    def test_save_deduplicates(self, db_path):
        collector = BaseCollector(db_path)
        articles = [
            {
                "source": "boamp",
                "source_id": "test-dup",
                "title": "Duplicate article",
                "category": "ao",
            },
        ]
        collector.save(articles)
        count = collector.save(articles)
        assert count == 0

    def test_run_returns_stats(self, db_path):
        class TestCollector(BaseCollector):
            SOURCE_NAME = "test"
            def collect(self):
                return [
                    {"source": "boamp", "source_id": "run-1", "title": "Test", "category": "ao"},
                ]

        collector = TestCollector(db_path)
        stats = collector.run()

        assert stats["source"] == "test"
        assert stats["collected"] == 1
        assert stats["inserted"] == 1
        assert stats["errors"] == []
        assert "duration_seconds" in stats


class TestBOAMPCollector:
    """Tests for the BOAMP collector."""

    @patch("collectors.boamp.requests.get")
    def test_parses_sample_response(self, mock_get, db_path):
        """Test that the collector correctly parses a BOAMP API response."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = BOAMP_SAMPLE_RESPONSE
        mock_response.raise_for_status = MagicMock()
        mock_get.return_value = mock_response

        collector = BOAMPCollector(db_path)
        articles = collector.collect()

        assert len(articles) == 2

        # Verify first article
        a1 = articles[0]
        assert a1["source"] == "boamp"
        assert a1["source_id"] == "boamp-24-56789"
        assert "formation professionnelle" in a1["title"].lower()
        assert a1["category"] == "ao"
        assert a1["acheteur"] == "Conseil Departemental du Rhone"
        assert a1["region"] == "Auvergne-Rhone-Alpes"
        assert a1["montant_estime"] == 150000.0
        assert a1["date_limite"] == "2026-04-15"

        # Verify second article
        a2 = articles[1]
        assert a2["source_id"] == "boamp-24-56790"
        assert "bilan" in a2["title"].lower() or "competences" in a2["title"].lower()

    @patch("collectors.boamp.requests.get")
    def test_excludes_irrelevant(self, mock_get, db_path):
        """Test that exclusion filters work."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = BOAMP_EXCLUDED_RESPONSE
        mock_response.raise_for_status = MagicMock()
        mock_get.return_value = mock_response

        collector = BOAMPCollector(db_path)
        articles = collector.collect()

        assert len(articles) == 0

    @patch("collectors.boamp.requests.get")
    def test_handles_api_error(self, mock_get, db_path):
        """Test graceful handling of API errors."""
        import requests as req
        mock_get.side_effect = req.RequestException("Connection timeout")

        collector = BOAMPCollector(db_path)
        articles = collector.collect()

        assert articles == []

    @patch("collectors.boamp.requests.get")
    def test_handles_empty_response(self, mock_get, db_path):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"total_count": 0, "results": []}
        mock_response.raise_for_status = MagicMock()
        mock_get.return_value = mock_response

        collector = BOAMPCollector(db_path)
        articles = collector.collect()
        assert articles == []

    @patch("collectors.boamp.requests.get")
    def test_run_saves_to_db(self, mock_get, db_path):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = BOAMP_SAMPLE_RESPONSE
        mock_response.raise_for_status = MagicMock()
        mock_get.return_value = mock_response

        collector = BOAMPCollector(db_path)
        stats = collector.run()

        assert stats["inserted"] == 2

        conn = get_connection(db_path)
        rows = get_articles(conn, source="boamp")
        assert len(rows) == 2
        conn.close()


class TestLegifranceCollector:
    """Tests for the Legifrance collector."""

    def test_missing_credentials_returns_empty(self, db_path):
        """Without credentials, the collector should log a warning and return []."""
        # Ensure env vars are not set
        env = {
            "LEGIFRANCE_CLIENT_ID": "",
            "LEGIFRANCE_CLIENT_SECRET": "",
        }
        with patch.dict(os.environ, env, clear=False):
            collector = LegifranceCollector(db_path)
            collector.client_id = ""
            collector.client_secret = ""
            articles = collector.collect()
            assert articles == []

    @patch("collectors.legifrance.requests.post")
    def test_token_failure_returns_empty(self, mock_post, db_path):
        """If token acquisition fails, collect should return []."""
        import requests as req
        mock_post.side_effect = req.RequestException("Auth server down")

        collector = LegifranceCollector(db_path)
        collector.client_id = "test_id"
        collector.client_secret = "test_secret"
        articles = collector.collect()
        assert articles == []

    @patch("collectors.legifrance.requests.post")
    def test_parses_results(self, mock_post, db_path):
        """Test parsing of Legifrance API results."""
        # First call: token, subsequent calls: search results
        token_response = MagicMock()
        token_response.status_code = 200
        token_response.json.return_value = {"access_token": "test-token-123"}
        token_response.raise_for_status = MagicMock()

        search_response = MagicMock()
        search_response.status_code = 200
        search_response.json.return_value = {
            "results": [
                {
                    "id": "JORFTEXT000049012345",
                    "titles": [{"title": "Decret relatif a la formation professionnelle"}],
                    "abstract": "Modification du code du travail",
                    "nor": "MTRD2400001D",
                    "signatureDate": "2026-03-01",
                },
            ]
        }
        search_response.raise_for_status = MagicMock()

        # Token first, then search calls
        mock_post.side_effect = [token_response] + [search_response] * 20

        collector = LegifranceCollector(db_path)
        collector.client_id = "test_id"
        collector.client_secret = "test_secret"
        articles = collector.collect()

        assert len(articles) >= 1

        a = articles[0]
        assert a["source"] == "legifrance"
        assert a["source_id"] == "legi-JORFTEXT000049012345"
        assert "formation" in a["title"].lower()
        assert a["category"] == "reglementaire"
        assert "legifrance.gouv.fr" in a["url"]

    @patch("collectors.legifrance.requests.post")
    def test_deduplicates_across_keywords(self, mock_post, db_path):
        """Same text found by multiple keywords should appear only once."""
        token_response = MagicMock()
        token_response.status_code = 200
        token_response.json.return_value = {"access_token": "test-token"}
        token_response.raise_for_status = MagicMock()

        # Return the same result for every keyword search
        same_result = {
            "results": [
                {
                    "id": "JORFTEXT000049099999",
                    "titles": [{"title": "Texte unique"}],
                    "signatureDate": "2026-03-05",
                },
            ]
        }
        search_response = MagicMock()
        search_response.status_code = 200
        search_response.json.return_value = same_result
        search_response.raise_for_status = MagicMock()

        mock_post.side_effect = [token_response] + [search_response] * 20

        collector = LegifranceCollector(db_path)
        collector.client_id = "test_id"
        collector.client_secret = "test_secret"
        articles = collector.collect()

        # Despite being returned by every keyword, the article should appear once
        assert len(articles) == 1
