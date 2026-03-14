"""Tests for the monitoring module."""

import os
import sqlite3
import tempfile
from unittest.mock import MagicMock, patch

import pytest

from storage.database import get_connection, init_db
from storage.monitoring import (
    check_health,
    cleanup_old_data,
    send_monitoring_alert,
    print_status,
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


def _insert_article(conn, **kwargs):
    """Insert a test article."""
    base = {
        "source": "legifrance",
        "source_id": "test-1",
        "title": "Test article",
        "status": "new",
    }
    base.update(kwargs)
    cols = ", ".join(base.keys())
    placeholders = ", ".join(["?"] * len(base))
    conn.execute(f"INSERT INTO articles ({cols}) VALUES ({placeholders})", list(base.values()))
    conn.commit()


# ---------------------------------------------------------------------------
# Tests: Health Check
# ---------------------------------------------------------------------------

class TestCheckHealth:
    """Tests for the check_health function."""

    def test_empty_database_is_critical(self, db_path):
        """Empty database should return critical status."""
        health = check_health(db_path)
        assert health["status"] == "critical"
        assert "Aucun article" in " ".join(health["issues"])

    def test_healthy_database_with_recent_articles(self, db_path, conn):
        """Database with recent articles should be healthy."""
        for i in range(5):
            _insert_article(conn, source_id=f"test-{i}", status="done")

        health = check_health(db_path)
        assert health["status"] == "healthy"
        assert health["stats"]["total_articles"] == 5

    def test_degraded_with_many_failed(self, db_path, conn):
        """Many failed articles should result in degraded status."""
        for i in range(15):
            _insert_article(conn, source_id=f"fail-{i}", status="failed")

        health = check_health(db_path)
        # Should have issue about failed articles
        assert any("echec" in issue.lower() for issue in health["issues"])

    def test_stats_are_accurate(self, db_path, conn):
        """Health check should return accurate stats."""
        _insert_article(conn, source_id="new-1", status="new")
        _insert_article(conn, source_id="done-1", status="done")
        _insert_article(conn, source_id="fail-1", status="failed")

        health = check_health(db_path)
        assert health["stats"]["total_articles"] == 3
        assert health["stats"]["pending_articles"] == 1
        assert health["stats"]["failed_articles"] == 1

    def test_recommendations_provided(self, db_path):
        """Empty database should provide recommendations."""
        health = check_health(db_path)
        assert len(health["recommendations"]) > 0


# ---------------------------------------------------------------------------
# Tests: Alert Sending
# ---------------------------------------------------------------------------

class TestSendMonitoringAlert:
    """Tests for the send_monitoring_alert function."""

    def test_alert_logged_to_database(self, db_path):
        """Alert should be logged in alert_logs table."""
        # Temporarily disable email sending
        with patch.dict(os.environ, {"ALERT_ENABLED": "false"}):
            from storage.monitoring import send_monitoring_alert
            result = send_monitoring_alert(
                severity="warning",
                alert_type="zero_articles",
                source="boamp",
                message="No articles collected",
                db_path=db_path,
            )

        assert result is True

        # Check database
        conn = get_connection(db_path)
        row = conn.execute("SELECT * FROM alert_logs LIMIT 1").fetchone()
        conn.close()

        assert row is not None
        assert row["alert_type"] == "zero_articles"
        assert row["source"] == "boamp"

    def test_dedup_within_24h(self, db_path):
        """Duplicate alerts within 24h should be skipped."""
        with patch.dict(os.environ, {"ALERT_ENABLED": "false"}):
            from storage.monitoring import send_monitoring_alert
            result1 = send_monitoring_alert(
                severity="warning",
                alert_type="api_error",
                source="legifrance",
                message="API error",
                db_path=db_path,
            )
            result2 = send_monitoring_alert(
                severity="warning",
                alert_type="api_error",
                source="legifrance",
                message="API error again",
                db_path=db_path,
            )

        assert result1 is True
        assert result2 is True  # Returns True for dedup

        # Check only one logged
        conn = get_connection(db_path)
        count = conn.execute(
            "SELECT COUNT(*) as cnt FROM alert_logs WHERE alert_type = 'api_error'"
        ).fetchone()["cnt"]
        conn.close()

        assert count == 1

    def test_alert_with_details(self, db_path):
        """Alert can include additional details."""
        with patch.dict(os.environ, {"ALERT_ENABLED": "false"}):
            from storage.monitoring import send_monitoring_alert
            result = send_monitoring_alert(
                severity="critical",
                alert_type="system_error",
                source="pipeline",
                message="Processing failed",
                details={"error_code": 500, "count": 10},
                db_path=db_path,
            )

        assert result is True


# ---------------------------------------------------------------------------
# Tests: Cleanup
# ---------------------------------------------------------------------------

class TestCleanupOldData:
    """Tests for the cleanup_old_data function."""

    def test_cleanup_removes_old_done_articles(self, db_path, conn):
        """Cleanup should remove old done articles with low relevance."""
        # Insert article with low relevance and old date
        conn.execute("""
            INSERT INTO articles (source, source_id, title, status, relevance_score, collected_at)
            VALUES ('legifrance', 'old-1', 'Old article', 'done', 2, datetime('now', '-200 days'))
        """)
        conn.execute("""
            INSERT INTO articles (source, source_id, title, status, relevance_score, collected_at)
            VALUES ('legifrance', 'new-1', 'New article', 'done', 8, datetime('now', '-10 days'))
        """)
        conn.commit()

        result = cleanup_old_data(db_path, retention_days=180, vacuum=False)

        assert result["deleted_articles"] >= 1

        # Check new article still exists
        remaining = conn.execute("SELECT COUNT(*) as cnt FROM articles").fetchone()["cnt"]
        assert remaining == 1

    def test_cleanup_keeps_high_relevance_articles(self, db_path, conn):
        """Cleanup should keep articles with high relevance score."""
        conn.execute("""
            INSERT INTO articles (source, source_id, title, status, relevance_score, collected_at)
            VALUES ('legifrance', 'keep-1', 'Important article', 'done', 8, datetime('now', '-200 days'))
        """)
        conn.commit()

        result = cleanup_old_data(db_path, retention_days=180, vacuum=False)

        # Article should still exist
        remaining = conn.execute("SELECT COUNT(*) as cnt FROM articles").fetchone()["cnt"]
        assert remaining == 1

    def test_cleanup_removes_old_logs(self, db_path, conn):
        """Cleanup should remove old log entries."""
        conn.execute("""
            INSERT INTO logs (timestamp, level, module, message)
            VALUES (datetime('now', '-200 days'), 'INFO', 'test', 'old log')
        """)
        conn.execute("""
            INSERT INTO logs (timestamp, level, module, message)
            VALUES (datetime('now', '-1 day'), 'INFO', 'test', 'new log')
        """)
        conn.commit()

        result = cleanup_old_data(db_path, retention_days=180, vacuum=False)

        assert result["deleted_logs"] >= 1

    def test_cleanup_returns_stats(self, db_path):
        """Cleanup should return statistics."""
        result = cleanup_old_data(db_path, retention_days=180, vacuum=False)

        assert "db_size_before_mb" in result
        assert "db_size_after_mb" in result
        assert "freed_mb" in result

    def test_cleanup_with_vacuum(self, db_path):
        """Cleanup with vacuum=True should run VACUUM."""
        result = cleanup_old_data(db_path, retention_days=180, vacuum=True)
        # VACUUM should succeed
        assert "error" not in result or result.get("error") is None


# ---------------------------------------------------------------------------
# Tests: Print Status
# ---------------------------------------------------------------------------

class TestPrintStatus:
    """Tests for the print_status function."""

    def test_print_status_empty_db(self, db_path, capsys):
        """print_status should handle empty database."""
        print_status(db_path)
        captured = capsys.readouterr()
        assert "critical" in captured.out.lower() or "CRITICAL" in captured.out

    def test_print_status_with_articles(self, db_path, conn):
        """print_status should show article counts."""
        _insert_article(conn, source_id="test-1", status="done")
        print_status(db_path)
        captured = capsys.readouterr()
        assert "Total articles" in captured.out or "1" in captured.out

    def test_print_status_missing_db(self):
        """print_status should handle missing database gracefully."""
        import io
        import sys
        old_stdout = sys.stdout
        sys.stdout = buffer = io.StringIO()
        try:
            print_status("/nonexistent/path.db")
        finally:
            sys.stdout = old_stdout
        output = buffer.getvalue()
        assert "not found" in output.lower()
