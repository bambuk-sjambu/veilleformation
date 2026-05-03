"""Tests for the Judilibre collector and the PisteAuth helper."""

import os
import tempfile
from unittest.mock import MagicMock, patch

import pytest
import requests

from collectors.judilibre import (
    API_BASE_PROD,
    ARTICLE_CATEGORY,
    JudilibreCollector,
    _build_title,
    _format_date,
)
from collectors.piste_auth import PisteAuth
from storage.database import get_articles, get_connection, init_db


# ----------------------------------------------------------------
# Fixtures
# ----------------------------------------------------------------

@pytest.fixture
def db_path():
    """Crée une base SQLite temporaire pour chaque test."""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    init_db(path)
    yield path
    os.unlink(path)


@pytest.fixture
def fake_auth():
    """PisteAuth pré-authentifié (skip OAuth en test)."""
    auth = PisteAuth("test-id", "test-secret", logger=MagicMock())
    # Pré-charge un token pour court-circuiter _get_token() dans le collector.
    auth._token = "fake-token-123"
    auth._expires_at = float("inf")
    return auth


# ----------------------------------------------------------------
# Sample data (schema réel observé Judilibre, condensé pour tests)
# ----------------------------------------------------------------

SAMPLE_DECISION = {
    "id": "61234abcdef0123456789abc",
    "chamber": "soc",
    "decision_date": "2026-04-22",
    "date_creation": "2026-04-25T08:00:00+00:00",
    "number": "22-12.345",
    "publication": ["b"],
    "formation": "Formation de section",
    "solution": "Cassation partielle",
    "themes": [{"label": "Contrat de travail, exécution"}],
    "summary": "Le licenciement sans cause réelle et sérieuse ouvre droit à indemnité.",
    "text": "LA COUR DE CASSATION, CHAMBRE SOCIALE, a rendu l'arrêt suivant: ...",
}

SAMPLE_RESPONSE_PAGE_1 = {
    "page": 1,
    "page_size": 50,
    "total": 1,
    "results": [SAMPLE_DECISION],
}

SAMPLE_RESPONSE_EMPTY = {"page": 2, "page_size": 50, "total": 0, "results": []}


def _mock_response(json_payload, status_code=200):
    """Construit un MagicMock requests.Response."""
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = json_payload
    if status_code >= 400:
        resp.raise_for_status.side_effect = requests.HTTPError(f"HTTP {status_code}")
    else:
        resp.raise_for_status = MagicMock()
    return resp


# ----------------------------------------------------------------
# PisteAuth unit tests
# ----------------------------------------------------------------


class TestPisteAuth:
    """Tests unitaires pour le helper OAuth2 PisteAuth."""

    def test_has_credentials_false_when_empty(self):
        auth = PisteAuth("", "", logger=MagicMock())
        assert auth.has_credentials() is False

    def test_has_credentials_true_when_set(self):
        auth = PisteAuth("id", "sec", logger=MagicMock())
        assert auth.has_credentials() is True

    def test_get_token_returns_none_without_credentials(self):
        auth = PisteAuth("", "", logger=MagicMock())
        assert auth.get_token() is None

    @patch("collectors.piste_auth.requests.post")
    def test_get_token_caches_until_expiry(self, mock_post):
        mock_post.return_value = _mock_response(
            {"access_token": "abc", "expires_in": 3600}
        )
        auth = PisteAuth("id", "sec", logger=MagicMock())

        t1 = auth.get_token()
        t2 = auth.get_token()  # second call should hit the cache

        assert t1 == "abc"
        assert t2 == "abc"
        assert mock_post.call_count == 1

    @patch("collectors.piste_auth.requests.post")
    def test_get_token_force_refresh_calls_again(self, mock_post):
        mock_post.return_value = _mock_response(
            {"access_token": "first", "expires_in": 3600}
        )
        auth = PisteAuth("id", "sec", logger=MagicMock())
        auth.get_token()

        mock_post.return_value = _mock_response(
            {"access_token": "second", "expires_in": 3600}
        )
        token = auth.get_token(force_refresh=True)

        assert token == "second"
        assert mock_post.call_count == 2

    @patch("collectors.piste_auth.requests.post")
    def test_get_token_returns_none_on_network_error(self, mock_post):
        mock_post.side_effect = requests.RequestException("network down")
        auth = PisteAuth("id", "sec", logger=MagicMock())
        assert auth.get_token() is None

    def test_from_env_prefers_piste_vars(self, monkeypatch):
        monkeypatch.setenv("PISTE_CLIENT_ID", "piste-id")
        monkeypatch.setenv("PISTE_CLIENT_SECRET", "piste-secret")
        monkeypatch.setenv("LEGIFRANCE_CLIENT_ID", "legi-id")
        monkeypatch.setenv("LEGIFRANCE_CLIENT_SECRET", "legi-secret")

        auth = PisteAuth.from_env(logger=MagicMock())
        assert auth.client_id == "piste-id"
        assert auth.client_secret == "piste-secret"

    def test_from_env_falls_back_to_legifrance_vars(self, monkeypatch):
        monkeypatch.delenv("PISTE_CLIENT_ID", raising=False)
        monkeypatch.delenv("PISTE_CLIENT_SECRET", raising=False)
        monkeypatch.setenv("LEGIFRANCE_CLIENT_ID", "legi-id")
        monkeypatch.setenv("LEGIFRANCE_CLIENT_SECRET", "legi-secret")

        auth = PisteAuth.from_env(logger=MagicMock())
        assert auth.client_id == "legi-id"
        assert auth.client_secret == "legi-secret"


# ----------------------------------------------------------------
# Judilibre parsing helpers
# ----------------------------------------------------------------


class TestJudilibreParsing:
    """Tests purs sur le mapping décision → article Cipia (sans HTTP)."""

    def test_parses_single_decision(self, db_path, fake_auth):
        collector = JudilibreCollector(db_path, logger=MagicMock(), auth=fake_auth)
        article = collector._parse_decision(SAMPLE_DECISION)

        assert article is not None
        assert article["source"] == "judilibre"
        assert article["source_id"] == "judilibre-61234abcdef0123456789abc"
        assert article["status"] == "new"
        assert article["category"] == ARTICLE_CATEGORY  # "reglementaire" pour l'instant
        assert article["url"] == (
            "https://www.courdecassation.fr/decision/61234abcdef0123456789abc"
        )
        assert article["published_date"] == "2026-04-22"

    def test_title_includes_chamber_and_theme(self):
        title = _build_title(SAMPLE_DECISION)
        assert "Soc." in title
        assert "Contrat de travail" in title
        assert "22-12.345" in title

    def test_returns_none_when_id_missing(self, db_path, fake_auth):
        collector = JudilibreCollector(db_path, logger=MagicMock(), auth=fake_auth)
        bad = {"chamber": "soc", "decision_date": "2026-04-01"}
        assert collector._parse_decision(bad) is None

    def test_format_date_handles_iso_and_epoch(self):
        assert _format_date("2026-04-22T08:00:00+00:00") == "2026-04-22"
        assert _format_date("2026-04-22") == "2026-04-22"
        # epoch ms
        ts = 1714000000000
        assert _format_date(ts) is not None
        assert _format_date(None) is None
        assert _format_date("") is None

    def test_extra_meta_populated(self, db_path, fake_auth):
        import json as _json
        collector = JudilibreCollector(db_path, logger=MagicMock(), auth=fake_auth)
        article = collector._parse_decision(SAMPLE_DECISION)
        assert "extra_meta" in article
        # Stocké en JSON string pour passer le bind SQLite (TEXT column).
        meta = _json.loads(article["extra_meta"])
        assert meta["chamber"] == "soc"
        assert meta["solution"] == "Cassation partielle"


# ----------------------------------------------------------------
# Judilibre HTTP / pagination / auth flow
# ----------------------------------------------------------------


class TestJudilibreHTTP:
    """Tests d'intégration HTTP avec mocks pour /search."""

    def test_no_credentials_returns_empty(self, db_path, monkeypatch):
        monkeypatch.delenv("PISTE_CLIENT_ID", raising=False)
        monkeypatch.delenv("PISTE_CLIENT_SECRET", raising=False)
        monkeypatch.delenv("LEGIFRANCE_CLIENT_ID", raising=False)
        monkeypatch.delenv("LEGIFRANCE_CLIENT_SECRET", raising=False)

        collector = JudilibreCollector(db_path, logger=MagicMock())
        assert collector.collect() == []

    @patch("collectors.judilibre.requests.get")
    def test_collect_parses_sample_response(self, mock_get, db_path, fake_auth):
        # Page 1 = 1 résultat, len < PAGE_SIZE → arrêt après cette page.
        mock_get.return_value = _mock_response(SAMPLE_RESPONSE_PAGE_1)

        collector = JudilibreCollector(
            db_path, logger=MagicMock(), auth=fake_auth, days_back=14
        )
        articles = collector.collect()

        assert len(articles) == 1
        assert articles[0]["source"] == "judilibre"
        assert "courdecassation.fr/decision/" in articles[0]["url"]
        # Vérifie qu'on a bien envoyé le bearer.
        sent_headers = mock_get.call_args.kwargs["headers"]
        assert sent_headers["Authorization"] == "Bearer fake-token-123"

    @patch("collectors.judilibre.requests.get")
    def test_pagination_two_pages_then_stop(self, mock_get, db_path, fake_auth):
        # Construit une page 1 pleine (50 décisions) puis page 2 vide.
        full_page_results = []
        for i in range(50):
            d = dict(SAMPLE_DECISION)
            d["id"] = f"id-{i:03d}"
            full_page_results.append(d)
        # total > 50 pour que le collector demande la page 2 (qui sera vide).
        page1 = {"page": 1, "page_size": 50, "total": 120, "results": full_page_results}

        mock_get.side_effect = [
            _mock_response(page1),
            _mock_response(SAMPLE_RESPONSE_EMPTY),
        ]
        collector = JudilibreCollector(
            db_path, logger=MagicMock(), auth=fake_auth, days_back=14
        )
        articles = collector.collect()

        assert len(articles) == 50
        assert mock_get.call_count == 2

    @patch("collectors.judilibre.time.sleep", lambda *_: None)
    @patch("collectors.judilibre.requests.get")
    def test_401_triggers_token_refresh(self, mock_get, db_path):
        """Un 401 doit déclencher exactement un refresh + retry, puis renvoyer les data."""
        auth = PisteAuth("id", "sec", logger=MagicMock())
        auth._token = "stale-token"
        auth._expires_at = float("inf")

        mock_get.side_effect = [
            _mock_response({}, status_code=401),
            _mock_response(SAMPLE_RESPONSE_PAGE_1),
        ]
        with patch.object(auth, "get_token", side_effect=[
            "stale-token",  # première lecture du cache pour la requête initiale
            "fresh-token",  # force_refresh après 401
        ]) as mock_get_token:
            collector = JudilibreCollector(db_path, logger=MagicMock(), auth=auth)
            articles = collector.collect()

        assert len(articles) == 1
        # 1 appel initial + 1 appel après refresh = 2 GET.
        assert mock_get.call_count == 2
        # Le 2e appel doit utiliser le token rafraîchi.
        last_headers = mock_get.call_args.kwargs["headers"]
        assert last_headers["Authorization"] == "Bearer fresh-token"
        assert mock_get_token.call_count >= 2

    @patch("collectors.judilibre.time.sleep", lambda *_: None)
    @patch("collectors.judilibre.requests.get")
    def test_collect_returns_empty_on_persistent_failure(
        self, mock_get, db_path, fake_auth
    ):
        mock_get.side_effect = requests.RequestException("network down")
        collector = JudilibreCollector(
            db_path, logger=MagicMock(), auth=fake_auth, days_back=14
        )
        articles = collector.collect()
        assert articles == []

    @patch("collectors.judilibre.requests.get")
    def test_chamber_param_passed_as_list(self, mock_get, db_path, fake_auth):
        mock_get.return_value = _mock_response(SAMPLE_RESPONSE_PAGE_1)
        collector = JudilibreCollector(
            db_path,
            logger=MagicMock(),
            auth=fake_auth,
            chambers=("soc", "civ1"),
            days_back=7,
        )
        collector.collect()

        params = mock_get.call_args.kwargs["params"]
        assert params["chamber"] == ["soc", "civ1"]
        assert params["sort"] == "date"
        assert params["order"] == "desc"
        assert params["page_size"] == 50
        assert params["page"] == 1
        assert "date_start" in params


# ----------------------------------------------------------------
# Save flow
# ----------------------------------------------------------------


class TestJudilibreSave:
    """Test que les articles passent bien le CHECK constraint et atterrissent en DB."""

    @patch("collectors.judilibre.requests.get")
    def test_run_inserts_articles(self, mock_get, db_path, fake_auth):
        mock_get.return_value = _mock_response(SAMPLE_RESPONSE_PAGE_1)
        collector = JudilibreCollector(db_path, logger=MagicMock(), auth=fake_auth)
        stats = collector.run()

        assert stats["inserted"] == 1
        assert stats["errors"] == []

        conn = get_connection(db_path)
        rows = get_articles(conn, source="judilibre")
        conn.close()
        assert len(rows) == 1
        assert rows[0]["category"] == ARTICLE_CATEGORY
