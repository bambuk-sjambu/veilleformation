"""Tests for the round-robin article scheduler.

Regression tests for the fix that prevents JORF (high volume, recent dates)
from starving Centre Inffo (lower volume, older dates) in the AI pipeline.
"""

import datetime
import os
import sqlite3
import tempfile

import pytest

from storage.database import get_articles_round_robin, get_connection, init_db


@pytest.fixture
def db_path():
    path = tempfile.mktemp(suffix=".db")
    init_db(path)
    yield path
    if os.path.exists(path):
        os.unlink(path)


def _insert(conn: sqlite3.Connection, source: str, n: int, published: str, status: str = "new"):
    """Helper to insert n articles for a given source."""
    now = datetime.datetime.now().isoformat()
    # Use status in source_id to avoid UNIQUE collisions when test mixes statuses
    for i in range(n):
        sid = f"{source}-{status}-{i}"
        conn.execute(
            """INSERT INTO articles (source, source_id, url, title, status,
                                     collected_at, published_date, category)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (source, sid, f"http://x/{source}/{i}",
             f"Titre {source} {i}", status, now, published, "reglementaire"),
        )
    conn.commit()


class TestRoundRobin:
    def test_interleaves_sources(self, db_path):
        """Limit=6 with 10 jorf + 3 centre_inffo should give 3+3, not 6+0."""
        conn = get_connection(db_path)
        _insert(conn, "jorf", 10, "2026-04-25")
        _insert(conn, "centre_inffo", 3, "2026-04-15")  # older
        results = get_articles_round_robin(conn, "new", limit=6)
        conn.close()

        sources = [r["source"] for r in results]
        assert sources.count("jorf") == 3
        assert sources.count("centre_inffo") == 3

    def test_starvation_prevented(self, db_path):
        """Centre Inffo (older dates, smaller volume) must appear in top results."""
        conn = get_connection(db_path)
        # Reproduce the prod situation: jorf monopolizes by published_date
        _insert(conn, "jorf", 268, "2026-04-24")
        _insert(conn, "centre_inffo", 56, "2026-03-15")
        _insert(conn, "boamp", 3, "2026-04-27")
        results = get_articles_round_robin(conn, "new", limit=50)
        conn.close()

        sources = {r["source"] for r in results}
        assert "centre_inffo" in sources, "Centre Inffo starved -> bug regression"
        assert "jorf" in sources
        assert "boamp" in sources

    def test_filters_status(self, db_path):
        """Only articles with the requested status are returned."""
        conn = get_connection(db_path)
        _insert(conn, "jorf", 5, "2026-04-25", status="new")
        _insert(conn, "jorf", 5, "2026-04-25", status="done")
        results = get_articles_round_robin(conn, "new", limit=20)
        conn.close()

        assert len(results) == 5
        assert all(r["status"] == "new" for r in results)

    def test_empty_db_returns_empty_list(self, db_path):
        conn = get_connection(db_path)
        results = get_articles_round_robin(conn, "new", limit=50)
        conn.close()
        assert results == []

    def test_limit_respected(self, db_path):
        conn = get_connection(db_path)
        _insert(conn, "jorf", 100, "2026-04-25")
        results = get_articles_round_robin(conn, "new", limit=10)
        conn.close()
        assert len(results) == 10

    def test_no_helper_rn_column_in_output(self, db_path):
        """The internal ROW_NUMBER alias 'rn' must not leak into result dicts."""
        conn = get_connection(db_path)
        _insert(conn, "jorf", 3, "2026-04-25")
        results = get_articles_round_robin(conn, "new", limit=10)
        conn.close()
        assert all("rn" not in r for r in results)

    def test_within_source_ordered_by_recency(self, db_path):
        """Within a source, the most recently collected article comes first."""
        conn = get_connection(db_path)
        # Two centre_inffo articles, oldest collected first
        old_collected = "2026-04-20T10:00:00"
        new_collected = "2026-04-25T10:00:00"
        conn.execute(
            "INSERT INTO articles (source, source_id, url, title, status, collected_at, published_date, category) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            ("centre_inffo", "ci-old", "http://x/old", "Old", "new", old_collected, "2026-04-15", "reglementaire"),
        )
        conn.execute(
            "INSERT INTO articles (source, source_id, url, title, status, collected_at, published_date, category) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            ("centre_inffo", "ci-new", "http://x/new", "New", "new", new_collected, "2026-04-20", "reglementaire"),
        )
        conn.commit()
        results = get_articles_round_robin(conn, "new", limit=2)
        conn.close()

        assert results[0]["source_id"] == "ci-new", "Most recent collected should come first"
        assert results[1]["source_id"] == "ci-old"
