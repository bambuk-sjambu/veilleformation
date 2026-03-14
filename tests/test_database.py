"""Tests for the SQLite database layer."""

import os
import sqlite3
import tempfile

import pytest

from storage.database import (
    get_connection,
    get_articles,
    get_stats,
    init_db,
    insert_article,
    update_article_status,
)


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


def _sample_article(**overrides) -> dict:
    """Create a sample article dict with optional overrides."""
    base = {
        "source": "boamp",
        "source_id": "boamp-12345",
        "title": "Marche de formation professionnelle",
        "url": "https://www.boamp.fr/avis/detail/12345",
        "content": "Formation continue pour agents",
        "published_date": "2026-03-01",
        "category": "ao",
        "status": "new",
        "acheteur": "Mairie de Lyon",
        "region": "Auvergne-Rhone-Alpes",
    }
    base.update(overrides)
    return base


class TestInitDb:
    """Tests for database initialization."""

    def test_creates_all_tables(self, db_path):
        conn = get_connection(db_path)
        tables = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        ).fetchall()
        table_names = sorted([row["name"] for row in tables])
        assert "articles" in table_names
        assert "newsletters" in table_names
        assert "subscribers" in table_names
        assert "logs" in table_names
        conn.close()

    def test_creates_indexes(self, db_path):
        conn = get_connection(db_path)
        indexes = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'"
        ).fetchall()
        index_names = [row["name"] for row in indexes]
        assert "idx_articles_source" in index_names
        assert "idx_articles_status" in index_names
        assert "idx_articles_category" in index_names
        assert "idx_articles_published" in index_names
        assert "idx_articles_source_id" in index_names
        conn.close()

    def test_idempotent(self, db_path):
        """Calling init_db twice should not raise."""
        init_db(db_path)
        init_db(db_path)


class TestInsertArticle:
    """Tests for article insertion."""

    def test_insert_valid_article(self, conn):
        article = _sample_article()
        result = insert_article(conn, article)
        assert result is True

        rows = conn.execute("SELECT * FROM articles").fetchall()
        assert len(rows) == 1
        assert rows[0]["title"] == "Marche de formation professionnelle"
        assert rows[0]["source"] == "boamp"

    def test_dedup_same_source_id(self, conn):
        article = _sample_article()
        insert_article(conn, article)
        result = insert_article(conn, article)
        assert result is False

        rows = conn.execute("SELECT COUNT(*) as cnt FROM articles").fetchone()
        assert rows["cnt"] == 1

    def test_different_source_ids(self, conn):
        insert_article(conn, _sample_article(source_id="boamp-111"))
        insert_article(conn, _sample_article(source_id="boamp-222"))

        rows = conn.execute("SELECT COUNT(*) as cnt FROM articles").fetchone()
        assert rows["cnt"] == 2

    def test_minimal_fields(self, conn):
        article = {
            "source": "legifrance",
            "source_id": "legi-001",
            "title": "Decret test",
            "category": "reglementaire",
        }
        result = insert_article(conn, article)
        assert result is True

    def test_collected_at_auto_filled(self, conn):
        insert_article(conn, _sample_article())
        row = conn.execute("SELECT collected_at FROM articles").fetchone()
        assert row["collected_at"] is not None


class TestGetArticles:
    """Tests for article retrieval with filters."""

    def _insert_test_data(self, conn):
        articles = [
            _sample_article(source_id="boamp-1", source="boamp", status="new", category="ao"),
            _sample_article(source_id="boamp-2", source="boamp", status="done", category="ao"),
            _sample_article(
                source_id="legi-1", source="legifrance", status="new",
                category="reglementaire", title="Decret formation",
            ),
        ]
        for a in articles:
            insert_article(conn, a)

    def test_get_all(self, conn):
        self._insert_test_data(conn)
        results = get_articles(conn)
        assert len(results) == 3

    def test_filter_by_source(self, conn):
        self._insert_test_data(conn)
        results = get_articles(conn, source="boamp")
        assert len(results) == 2
        assert all(r["source"] == "boamp" for r in results)

    def test_filter_by_status(self, conn):
        self._insert_test_data(conn)
        results = get_articles(conn, status="new")
        assert len(results) == 2

    def test_filter_by_category(self, conn):
        self._insert_test_data(conn)
        results = get_articles(conn, category="reglementaire")
        assert len(results) == 1
        assert results[0]["source"] == "legifrance"

    def test_combined_filters(self, conn):
        self._insert_test_data(conn)
        results = get_articles(conn, source="boamp", status="new")
        assert len(results) == 1

    def test_limit(self, conn):
        self._insert_test_data(conn)
        results = get_articles(conn, limit=2)
        assert len(results) == 2

    def test_returns_dicts(self, conn):
        self._insert_test_data(conn)
        results = get_articles(conn)
        assert isinstance(results[0], dict)
        assert "title" in results[0]


class TestUpdateArticleStatus:
    """Tests for status updates."""

    def test_update_existing(self, conn):
        insert_article(conn, _sample_article())
        row = conn.execute("SELECT id FROM articles").fetchone()
        result = update_article_status(conn, row["id"], "done")
        assert result is True

        updated = conn.execute("SELECT status FROM articles WHERE id = ?", (row["id"],)).fetchone()
        assert updated["status"] == "done"

    def test_update_nonexistent(self, conn):
        result = update_article_status(conn, 9999, "done")
        assert result is False


class TestGetStats:
    """Tests for statistics."""

    def test_empty_db(self, conn):
        stats = get_stats(conn)
        assert stats["total"] == 0
        assert stats["by_source"] == {}
        assert stats["by_status"] == {}
        assert stats["last_collected"] is None

    def test_with_data(self, conn):
        insert_article(conn, _sample_article(source_id="boamp-1", source="boamp", category="ao"))
        insert_article(conn, _sample_article(source_id="boamp-2", source="boamp", category="ao"))
        insert_article(conn, _sample_article(
            source_id="legi-1", source="legifrance", category="reglementaire"
        ))

        stats = get_stats(conn)
        assert stats["total"] == 3
        assert stats["by_source"]["boamp"] == 2
        assert stats["by_source"]["legifrance"] == 1
        assert stats["by_status"]["new"] == 3
        assert stats["by_category"]["ao"] == 2
        assert stats["by_category"]["reglementaire"] == 1
        assert stats["last_collected"] is not None
