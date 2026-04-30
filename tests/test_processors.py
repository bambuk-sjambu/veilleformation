"""Tests for the AI processing pipeline."""

import json
import os
import sqlite3
import tempfile
from unittest.mock import MagicMock, patch

import pytest

from processors.pipeline import AIProcessor, COST_INPUT_PER_TOKEN, COST_OUTPUT_PER_TOKEN
from processors.prompts import (
    SYSTEM_PROMPT_AO,
    SYSTEM_PROMPT_REGLEMENTAIRE,
    build_user_prompt,
    get_system_prompt,
)
from storage.database import get_connection, init_db, insert_article


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def db_path():
    """Create a temporary database file for testing."""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    init_db(path)
    yield path
    os.unlink(path)


@pytest.fixture
def conn(db_path):
    """Return a connection to the test database."""
    connection = get_connection(db_path)
    yield connection
    connection.close()


def _sample_boamp_article(**overrides) -> dict:
    """Create a sample BOAMP article dict."""
    base = {
        "source": "boamp",
        "source_id": "boamp-12345",
        "title": "Formation management pour agents de la FPT",
        "url": "https://www.boamp.fr/avis/detail/12345",
        "content": "Marche de formation management pour les agents territoriaux",
        "published_date": "2026-03-01",
        "category": "ao",
        "status": "new",
        "acheteur": "Mairie de Lyon",
        "region": "Auvergne-Rhone-Alpes",
        "montant_estime": 75000.0,
        "date_limite": "2026-04-15",
        "cpv_code": "80500000",
    }
    base.update(overrides)
    return base


def _sample_legifrance_article(**overrides) -> dict:
    """Create a sample Legifrance article dict."""
    base = {
        "source": "legifrance",
        "source_id": "legi-67890",
        "title": "Decret relatif a la certification Qualiopi",
        "url": "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT00067890",
        "content": "Decret modifiant les conditions de certification des OF",
        "published_date": "2026-03-01",
        "category": "reglementaire",
        "status": "new",
    }
    base.update(overrides)
    return base


def _mock_claude_response_ao() -> dict:
    """Return a valid AI response for an AO article."""
    return {
        "summary": "Cet appel d'offres concerne une formation en management. "
                   "Le public cible est les agents de la FPT. "
                   "Le marche est regional en Auvergne-Rhone-Alpes.",
        "impact_level": "moyen",
        "impact_justification": "Marche regional de 75k EUR.",
        "qualiopi_indicators": ["23"],
        "qualiopi_justification": "Appel d'offres identifie dans le cadre de la veille reglementaire (indicateur 23).",
        "relevance_score": 8,
        "category": "ao",
        "typologie_ao": "formation",
    }


def _mock_claude_response_reglementaire() -> dict:
    """Return a valid AI response for a regulatory article."""
    return {
        "summary": "Ce decret modifie les conditions de certification Qualiopi. "
                   "Les OF devront se conformer aux nouvelles exigences. "
                   "L'entree en vigueur est prevue pour le 1er janvier 2027.",
        "impact_level": "fort",
        "impact_justification": "Modification directe des criteres de certification Qualiopi.",
        "qualiopi_indicators": ["23", "24"],
        "qualiopi_justification": "Concerne directement la veille reglementaire et les competences.",
        "relevance_score": 9,
        "category": "reglementaire",
    }


def _create_mock_anthropic_response(response_dict: dict, input_tokens=500, output_tokens=150):
    """Create a mock Anthropic API response object."""
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text=json.dumps(response_dict, ensure_ascii=False))]
    mock_response.usage = MagicMock(input_tokens=input_tokens, output_tokens=output_tokens)
    return mock_response


# ---------------------------------------------------------------------------
# Tests: Prompt selection
# ---------------------------------------------------------------------------

class TestPromptSelection:
    """Tests for selecting the correct system prompt."""

    def test_boamp_source_gets_ao_prompt(self):
        article = {"source": "boamp", "category": "ao"}
        assert get_system_prompt(article) == SYSTEM_PROMPT_AO

    def test_ao_category_gets_ao_prompt(self):
        article = {"source": "opco", "category": "ao"}
        assert get_system_prompt(article) == SYSTEM_PROMPT_AO

    def test_legifrance_source_gets_reglementaire_prompt(self):
        article = {"source": "legifrance", "category": "reglementaire"}
        assert get_system_prompt(article) == SYSTEM_PROMPT_REGLEMENTAIRE

    def test_unknown_source_gets_reglementaire_prompt(self):
        article = {"source": "france_travail", "category": "metier"}
        assert get_system_prompt(article) == SYSTEM_PROMPT_REGLEMENTAIRE

    def test_boamp_prompt_mentions_typologie_ao(self):
        assert "typologie_ao" in SYSTEM_PROMPT_AO

    def test_reglementaire_prompt_does_not_mention_typologie(self):
        assert "typologie_ao" not in SYSTEM_PROMPT_REGLEMENTAIRE


class TestBuildUserPrompt:
    """Tests for building user prompts from article data."""

    def test_basic_prompt(self):
        article = {
            "title": "Test titre",
            "content": "Test contenu",
            "source": "legifrance",
            "published_date": "2026-03-01",
        }
        prompt = build_user_prompt(article)
        assert "Titre : Test titre" in prompt
        assert "Contenu :\nTest contenu" in prompt
        assert "Source : legifrance" in prompt
        assert "Date de publication : 2026-03-01" in prompt

    def test_ao_extra_fields(self):
        article = _sample_boamp_article()
        prompt = build_user_prompt(article)
        assert "Acheteur : Mairie de Lyon" in prompt
        assert "Auvergne-Rhone-Alpes" in prompt  # Region appears in prompt
        assert "75,000 EUR" in prompt  # Formatted with comma
        assert "Date limite" in prompt
        assert "Code CPV : 80500000" in prompt

    def test_legifrance_no_extra_fields(self):
        article = _sample_legifrance_article()
        prompt = build_user_prompt(article)
        assert "Acheteur" not in prompt
        assert "Montant" not in prompt

    def test_missing_content_falls_back_to_title(self):
        article = {
            "title": "Titre fallback",
            "content": None,
            "source": "boamp",
            "published_date": "2026-03-01",
        }
        prompt = build_user_prompt(article)
        assert "Titre fallback" in prompt


# ---------------------------------------------------------------------------
# Tests: JSON response parsing
# ---------------------------------------------------------------------------

class TestParseJsonResponse:
    """Tests for parsing Claude's JSON responses."""

    def test_valid_json(self):
        data = {"summary": "Test", "impact_level": "fort"}
        result = AIProcessor.parse_json_response(json.dumps(data))
        assert result == data

    def test_json_wrapped_in_markdown(self):
        data = {"summary": "Test", "impact_level": "fort"}
        raw = f"```json\n{json.dumps(data)}\n```"
        result = AIProcessor.parse_json_response(raw)
        assert result == data

    def test_json_wrapped_in_markdown_no_lang(self):
        data = {"summary": "Test"}
        raw = f"```\n{json.dumps(data)}\n```"
        result = AIProcessor.parse_json_response(raw)
        assert result == data

    def test_json_with_whitespace(self):
        raw = '  \n  {"summary": "Test"}  \n  '
        result = AIProcessor.parse_json_response(raw)
        assert result["summary"] == "Test"

    def test_invalid_json_raises(self):
        with pytest.raises(ValueError, match="Invalid JSON"):
            AIProcessor.parse_json_response("this is not json")

    def test_empty_string_raises(self):
        with pytest.raises(ValueError):
            AIProcessor.parse_json_response("")

    def test_unicode_content(self):
        data = {"summary": "Formation a la prevoyance des organismes"}
        raw = json.dumps(data, ensure_ascii=False)
        result = AIProcessor.parse_json_response(raw)
        assert result["summary"] == data["summary"]


# ---------------------------------------------------------------------------
# Tests: Response validation
# ---------------------------------------------------------------------------

class TestValidateResponse:
    """Tests for validating AI response structure."""

    def test_valid_ao_response(self):
        data = _mock_claude_response_ao()
        assert AIProcessor.validate_response(data, is_ao=True) is True

    def test_valid_reglementaire_response(self):
        data = _mock_claude_response_reglementaire()
        assert AIProcessor.validate_response(data, is_ao=False) is True

    def test_missing_field_raises(self):
        data = _mock_claude_response_ao()
        del data["summary"]
        with pytest.raises(ValueError, match="Missing required fields.*summary"):
            AIProcessor.validate_response(data, is_ao=True)

    def test_missing_typologie_ao_for_ao_raises(self):
        data = _mock_claude_response_ao()
        del data["typologie_ao"]
        with pytest.raises(ValueError, match="Missing required fields.*typologie_ao"):
            AIProcessor.validate_response(data, is_ao=True)

    def test_typologie_ao_not_required_for_non_ao(self):
        data = _mock_claude_response_reglementaire()
        # Should not raise even without typologie_ao
        assert AIProcessor.validate_response(data, is_ao=False) is True

    def test_invalid_impact_level_raises(self):
        data = _mock_claude_response_ao()
        data["impact_level"] = "enorme"
        with pytest.raises(ValueError, match="Invalid impact_level"):
            AIProcessor.validate_response(data, is_ao=True)

    def test_invalid_relevance_score_too_high(self):
        data = _mock_claude_response_ao()
        data["relevance_score"] = 15
        with pytest.raises(ValueError, match="Invalid relevance_score"):
            AIProcessor.validate_response(data, is_ao=True)

    def test_invalid_relevance_score_too_low(self):
        data = _mock_claude_response_ao()
        data["relevance_score"] = 0
        with pytest.raises(ValueError, match="Invalid relevance_score"):
            AIProcessor.validate_response(data, is_ao=True)


# ---------------------------------------------------------------------------
# Tests: process_article with mocked API
# ---------------------------------------------------------------------------

class TestProcessArticle:
    """Tests for the main article processing logic with mocked Claude API."""

    def test_process_boamp_article_success(self, db_path, conn):
        """Process a BOAMP article and verify DB is updated."""
        article_data = _sample_boamp_article()
        insert_article(conn, article_data)
        row = conn.execute("SELECT * FROM articles WHERE source_id = ?",
                           (article_data["source_id"],)).fetchone()
        article = dict(row)

        mock_response = _create_mock_anthropic_response(_mock_claude_response_ao())

        processor = AIProcessor(db_path=db_path, api_key="test-key")
        processor.client = MagicMock()
        processor.client.messages.create.return_value = mock_response

        result = processor.process_article(article)

        assert result["success"] is True
        assert result["impact_level"] == "moyen"
        assert result["relevance_score"] == 8
        assert result["input_tokens"] == 500
        assert result["output_tokens"] == 150

        # Verify DB was updated
        updated = conn.execute(
            "SELECT * FROM articles WHERE id = ?", (article["id"],)
        ).fetchone()
        assert updated["status"] == "done"
        assert updated["impact_level"] == "moyen"
        assert updated["relevance_score"] == 8
        assert updated["summary"] is not None
        assert updated["processed_at"] is not None
        assert updated["typologie_ao"] == "formation"

    def test_process_legifrance_article_success(self, db_path, conn):
        """Process a Legifrance article and verify DB is updated."""
        article_data = _sample_legifrance_article()
        insert_article(conn, article_data)
        row = conn.execute("SELECT * FROM articles WHERE source_id = ?",
                           (article_data["source_id"],)).fetchone()
        article = dict(row)

        mock_response = _create_mock_anthropic_response(
            _mock_claude_response_reglementaire()
        )

        processor = AIProcessor(db_path=db_path, api_key="test-key")
        processor.client = MagicMock()
        processor.client.messages.create.return_value = mock_response

        result = processor.process_article(article)

        assert result["success"] is True
        assert result["impact_level"] == "fort"
        assert result["relevance_score"] == 9

        # Verify correct prompt was used
        call_args = processor.client.messages.create.call_args
        assert call_args.kwargs["system"] == SYSTEM_PROMPT_REGLEMENTAIRE

    def test_process_article_api_error_sets_failed(self, db_path, conn):
        """API error should set article status to 'failed'."""
        article_data = _sample_boamp_article()
        insert_article(conn, article_data)
        row = conn.execute("SELECT * FROM articles WHERE source_id = ?",
                           (article_data["source_id"],)).fetchone()
        article = dict(row)

        processor = AIProcessor(db_path=db_path, api_key="test-key")
        processor.client = MagicMock()
        processor.client.messages.create.side_effect = Exception("API rate limit")

        result = processor.process_article(article)

        assert result["success"] is False
        assert "API rate limit" in result["error"]

        updated = conn.execute(
            "SELECT status FROM articles WHERE id = ?", (article["id"],)
        ).fetchone()
        assert updated["status"] == "failed"

    def test_process_article_invalid_json_sets_failed(self, db_path, conn):
        """Invalid JSON from Claude should set article status to 'failed'."""
        article_data = _sample_boamp_article()
        insert_article(conn, article_data)
        row = conn.execute("SELECT * FROM articles WHERE source_id = ?",
                           (article_data["source_id"],)).fetchone()
        article = dict(row)

        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="This is not JSON at all")]
        mock_response.usage = MagicMock(input_tokens=500, output_tokens=50)

        processor = AIProcessor(db_path=db_path, api_key="test-key")
        processor.client = MagicMock()
        processor.client.messages.create.return_value = mock_response

        result = processor.process_article(article)

        assert result["success"] is False
        assert result["error"] is not None

    def test_process_article_tracks_tokens(self, db_path, conn):
        """Token tracking should accumulate across calls."""
        article_data = _sample_boamp_article()
        insert_article(conn, article_data)
        row = conn.execute("SELECT * FROM articles WHERE source_id = ?",
                           (article_data["source_id"],)).fetchone()
        article = dict(row)

        mock_response = _create_mock_anthropic_response(
            _mock_claude_response_ao(), input_tokens=400, output_tokens=120
        )

        processor = AIProcessor(db_path=db_path, api_key="test-key")
        processor.client = MagicMock()
        processor.client.messages.create.return_value = mock_response

        processor.process_article(article)

        assert processor.total_input_tokens == 400
        assert processor.total_output_tokens == 120

    def test_qualiopi_indicators_stored_as_json(self, db_path, conn):
        """qualiopi_indicators should be stored as a JSON string."""
        article_data = _sample_legifrance_article()
        insert_article(conn, article_data)
        row = conn.execute("SELECT * FROM articles WHERE source_id = ?",
                           (article_data["source_id"],)).fetchone()
        article = dict(row)

        mock_response = _create_mock_anthropic_response(
            _mock_claude_response_reglementaire()
        )

        processor = AIProcessor(db_path=db_path, api_key="test-key")
        processor.client = MagicMock()
        processor.client.messages.create.return_value = mock_response

        processor.process_article(article)

        updated = conn.execute(
            "SELECT qualiopi_indicators FROM articles WHERE id = ?",
            (article["id"],),
        ).fetchone()
        indicators = json.loads(updated["qualiopi_indicators"])
        assert indicators == ["23", "24"]

    def test_taxonomy_indicators_dual_write(self, db_path, conn):
        """A.4.b : apres UPDATE par le pipeline IA, taxonomy_indicators et
        taxonomy_justification doivent avoir la meme valeur que les
        anciennes colonnes qualiopi_*."""
        article_data = _sample_legifrance_article()
        insert_article(conn, article_data)
        row = conn.execute(
            "SELECT * FROM articles WHERE source_id = ?",
            (article_data["source_id"],),
        ).fetchone()
        article = dict(row)

        mock_response = _create_mock_anthropic_response(
            _mock_claude_response_reglementaire()
        )

        processor = AIProcessor(db_path=db_path, api_key="test-key")
        processor.client = MagicMock()
        processor.client.messages.create.return_value = mock_response

        processor.process_article(article)

        updated = conn.execute(
            """SELECT qualiopi_indicators, taxonomy_indicators,
                      qualiopi_justification, taxonomy_justification
               FROM articles WHERE id = ?""",
            (article["id"],),
        ).fetchone()
        # Les deux colonnes doivent etre strictement egales
        assert updated["taxonomy_indicators"] == updated["qualiopi_indicators"]
        assert updated["taxonomy_justification"] == updated["qualiopi_justification"]
        # Et bien sur non-null
        assert updated["taxonomy_indicators"] is not None
        assert json.loads(updated["taxonomy_indicators"]) == ["23", "24"]

    def test_extra_meta_built_on_insert(self, db_path, conn):
        """A.4.b : INSERT initial d'un article BOAMP doit peupler extra_meta
        avec les champs AO presents (cpv_code, acheteur, region, montant,
        date_limite)."""
        article_data = _sample_boamp_article()
        insert_article(conn, article_data)
        row = conn.execute(
            "SELECT extra_meta FROM articles WHERE source_id = ?",
            (article_data["source_id"],),
        ).fetchone()
        assert row["extra_meta"] is not None
        meta = json.loads(row["extra_meta"])
        # Les 5 champs presents dans _sample_boamp_article doivent etre la
        assert meta.get("acheteur") == "Mairie de Lyon"
        assert meta.get("region") == "Auvergne-Rhone-Alpes"
        assert meta.get("montant_estime") == 75000.0
        assert meta.get("date_limite") == "2026-04-15"
        assert meta.get("cpv_code") == "80500000"

    def test_extra_meta_built_on_update(self, db_path, conn):
        """A.4.b : UPDATE par le pipeline IA doit recalculer extra_meta avec
        les champs AO existants (poses a l'INSERT par le collector) +
        ceux que l'IA ajoute (theme_formation, typologie_ao)."""
        article_data = _sample_boamp_article()
        insert_article(conn, article_data)
        row = conn.execute(
            "SELECT * FROM articles WHERE source_id = ?",
            (article_data["source_id"],),
        ).fetchone()
        article = dict(row)

        # Reponse IA AO inclut typologie_ao mais pas theme_formation
        mock_response = _create_mock_anthropic_response(_mock_claude_response_ao())
        processor = AIProcessor(db_path=db_path, api_key="test-key")
        processor.client = MagicMock()
        processor.client.messages.create.return_value = mock_response
        processor.process_article(article)

        updated = conn.execute(
            "SELECT extra_meta FROM articles WHERE id = ?",
            (article["id"],),
        ).fetchone()
        meta = json.loads(updated["extra_meta"])
        # Champs AO du collector preserves
        assert meta.get("acheteur") == "Mairie de Lyon"
        assert meta.get("region") == "Auvergne-Rhone-Alpes"
        assert meta.get("cpv_code") == "80500000"
        # Champ ajoute par l'IA
        assert meta.get("typologie_ao") == "formation"


# ---------------------------------------------------------------------------
# Tests: retry_failed
# ---------------------------------------------------------------------------

class TestRetryFailed:
    """Tests for retrying failed articles."""

    def test_retry_picks_up_failed_articles(self, db_path, conn):
        """retry_failed should reprocess articles with status='failed'."""
        article_data = _sample_boamp_article(status="failed")
        # Insert directly with failed status
        insert_article(conn, article_data)
        conn.execute(
            "UPDATE articles SET status = 'failed' WHERE source_id = ?",
            (article_data["source_id"],),
        )
        conn.commit()

        mock_response = _create_mock_anthropic_response(_mock_claude_response_ao())

        processor = AIProcessor(db_path=db_path, api_key="test-key")
        processor.client = MagicMock()
        processor.client.messages.create.return_value = mock_response
        processor.rate_limit_delay = 0  # No delay in tests

        stats = processor.retry_failed(limit=10)

        assert stats["total"] == 1
        assert stats["processed"] == 1
        assert stats["failed"] == 0

    def test_retry_no_failed_articles(self, db_path, conn):
        """retry_failed with no failed articles should return zero stats."""
        processor = AIProcessor(db_path=db_path, api_key="test-key")
        stats = processor.retry_failed()

        assert stats["total"] == 0
        assert stats["processed"] == 0


# ---------------------------------------------------------------------------
# Tests: Cost estimation
# ---------------------------------------------------------------------------

class TestCostEstimation:
    """Tests for token cost estimation."""

    def test_cost_with_zero_tokens(self):
        processor = AIProcessor(db_path=":memory:", api_key="test-key")
        processor.total_input_tokens = 0
        processor.total_output_tokens = 0
        assert processor.estimated_cost() == 0.0

    def test_cost_calculation(self):
        processor = AIProcessor(db_path=":memory:", api_key="test-key")
        processor.total_input_tokens = 50000
        processor.total_output_tokens = 15000
        cost = processor.estimated_cost()
        # Input: 50000 * 1.00/1M = 0.05 USD
        # Output: 15000 * 5.00/1M = 0.075 USD
        # Total: 0.125 USD * 0.92 = 0.115 EUR
        assert cost == pytest.approx(0.115, abs=0.001)

    def test_cost_accumulates(self, db_path, conn):
        """Cost should accumulate across multiple process_article calls."""
        for i in range(3):
            article_data = _sample_boamp_article(source_id=f"boamp-cost-{i}")
            insert_article(conn, article_data)

        articles = conn.execute("SELECT * FROM articles").fetchall()
        articles = [dict(a) for a in articles]

        mock_response = _create_mock_anthropic_response(
            _mock_claude_response_ao(), input_tokens=500, output_tokens=150
        )

        processor = AIProcessor(db_path=db_path, api_key="test-key")
        processor.client = MagicMock()
        processor.client.messages.create.return_value = mock_response

        for article in articles:
            processor.process_article(article)

        assert processor.total_input_tokens == 1500
        assert processor.total_output_tokens == 450
        assert processor.estimated_cost() > 0


# ---------------------------------------------------------------------------
# Tests: run() method
# ---------------------------------------------------------------------------

class TestRun:
    """Tests for the main run() method."""

    def test_run_with_no_articles(self, db_path):
        """run() with no pending articles should return zero stats."""
        processor = AIProcessor(db_path=db_path, api_key="test-key")
        stats = processor.run()

        assert stats["total"] == 0
        assert stats["processed"] == 0
        assert stats["results"] == []

    def test_run_processes_pending(self, db_path, conn):
        """run() should process all pending articles."""
        for i in range(3):
            insert_article(conn, _sample_boamp_article(source_id=f"boamp-run-{i}"))

        mock_response = _create_mock_anthropic_response(_mock_claude_response_ao())

        processor = AIProcessor(db_path=db_path, api_key="test-key")
        processor.client = MagicMock()
        processor.client.messages.create.return_value = mock_response
        processor.rate_limit_delay = 0

        stats = processor.run(limit=10)

        assert stats["total"] == 3
        assert stats["processed"] == 3
        assert stats["failed"] == 0
        assert stats["input_tokens"] > 0
        assert stats["output_tokens"] > 0
        assert stats["cost_eur"] > 0
        assert stats["duration_seconds"] >= 0
        assert len(stats["results"]) == 3

    def test_run_respects_limit(self, db_path, conn):
        """run() should respect the limit parameter."""
        for i in range(5):
            insert_article(conn, _sample_boamp_article(source_id=f"boamp-lim-{i}"))

        mock_response = _create_mock_anthropic_response(_mock_claude_response_ao())

        processor = AIProcessor(db_path=db_path, api_key="test-key")
        processor.client = MagicMock()
        processor.client.messages.create.return_value = mock_response
        processor.rate_limit_delay = 0

        stats = processor.run(limit=2)

        assert stats["total"] == 2
        assert stats["processed"] == 2
