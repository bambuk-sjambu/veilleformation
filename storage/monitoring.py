"""Monitoring module for VeilleFormation.fr.

Provides health checks, alert sending, and data cleanup functions.
Aligned with Cahier des Charges v1.2 - Module 9.
"""

import json
import logging
import os
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional

from storage.database import get_connection
from publishers.brevo import BrevoClient

logger = logging.getLogger("veille.monitoring")

# ------------------------------------------------------------
# Configuration
# ------------------------------------------------------------
DB_PATH = os.environ.get("DB_PATH", "data/veille.db")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "stephane@sja.digital")
ALERT_ENABLED = os.environ.get("ALERT_ENABLED", "true").lower() == "true"


# ------------------------------------------------------------
# Health Check
# ------------------------------------------------------------
def check_health(db_path: str = None) -> dict:
    """Check system health and return status and issues, and recommendations.

    Args:
        db_path: Path to database

    Returns:
        dict with keys:
        - status: 'healthy', 'degraded', or critical'
        - issues: list of problem descriptions
        - recommendations: list of recommended actions
        - stats: basic stats about articles
    """
    conn = get_connection(db_path)
    try:
        # Check total articles
        total_articles = conn.execute(
            "SELECT COUNT(*) as cnt FROM articles"
        ).fetchone()["cnt"]

        # Check recent collection
        recent_articles = conn.execute(
            """SELECT COUNT(*) as cnt FROM articles
               WHERE collected_at > datetime('now', '-3 days')"""
        ).fetchone()["cnt"]

        # Check unprocessed articles
        pending_articles = conn.execute(
            """SELECT COUNT(*) as cnt FROM articles
               WHERE status = 'new'"""
        ).fetchone()["cnt"]

        # Check failed articles
        failed_articles = conn.execute(
            """SELECT COUNT(*) as cnt FROM articles
               WHERE status = 'failed'"""
        ).fetchone()["cnt"]

        # Check database size
        db_size = Path(db_path).stat().st_size
        db_size_mb = db_size / (1024 * 1024)

        # Check last collection
        last_collected = conn.execute(
            """SELECT MAX(collected_at) as last FROM articles"""
        ).fetchone()
        last_collected = last_collected["last"] if last_collected else None

        # Determine status
        issues = []
        recommendations = []

        # Critical checks
        if total_articles == 0:
            issues.append("Aucun article dans la base")
            recommendations.append("Lancer 'python main.py collect' pour collecter des donnees")

        if recent_articles == 0:
            issues.append("Aucune collecte depuis 3 jours")
            recommendations.append("Verifier les collecteurs (BOAMP, Legifrance)")

        if failed_articles > 10:
            issues.append(f"{failed_articles} articles en echec")
            recommendations.append("Relancer 'python main.py retry'")

        # Warning checks
        if db_size_mb > 500:
            issues.append(f"Base de donnees volumineuse ({db_size_mb:.1f} MB)")
            recommendations.append("Lancer 'python main.py cleanup' ou envisager archivage")

        # Determine overall status
        if len([i for i in issues if "Aucun" in i or "Base" in i]) >= 2:
            status = "critical"
        elif len([i for i in issues if "Aucune" not in i]) == 1:
            status = "degraded"
        else:
            status = "healthy"

        return {
            "status": status,
            "issues": [i for i in issues if i != "Aucun"],
            "recommendations": recommendations,
            "stats": {
                "total_articles": total_articles,
                "recent_articles": recent_articles,
                "pending_articles": pending_articles,
                "failed_articles": failed_articles,
                "db_size_mb": round(db_size_mb, 2),
                "last_collected": last_collected,
            },
        }
    finally:
        conn.close()


# ------------------------------------------------------------
# Alert Sending
# ------------------------------------------------------------
def send_monitoring_alert(
    severity: str,
    alert_type: str,
    source: str,
    message: str,
    details: Optional[dict] = None,
    db_path: Optional[str] = None,
) -> bool:
    """Send monitoring alert via email and log to alert_logs table.

    Args:
        severity: 'info', 'warning', or 'critical'
        alert_type: Type of alert (e.g., 'zero_articles', 'api_error')
        source: Source that triggered the alert (e.g., 'boamp', 'legifrance')
        message: Alert message
        details: Optional additional details
        db_path: Database path (uses env var if not provided)

    Returns:
        True if alert was sent successfully, False otherwise
    """
    db_path = db_path or DB_PATH

    conn = get_connection(db_path)
    try:
        # Check for recent duplicate alerts (dedup within 24h)
        recent_alert = conn.execute(
            """SELECT id FROM alert_logs
               WHERE alert_type = ?
               AND source = ?
               AND datetime(sent_at) > datetime('now', '-24 hours')
               LIMIT 1""",
            (alert_type, source),
        ).fetchone()

        if recent_alert:
            logger.info(f"Skipping duplicate alert: {alert_type}/{source}")
            return True  # Consider it sent for dedup purposes

        # Log alert to database
        conn.execute(
            """INSERT INTO alert_logs
               (alert_type, source, message, sent_at)
               VALUES (?, ?, ?, datetime('now'))""",
            (alert_type, source, message),
        )

        # Send email alert
        if ALERT_ENABLED:
            brevo = BrevoClient()
            if brevo.api_key:
                subject = f"[VeilleFormation] {severity.upper()}: {alert_type}"
                # Build details HTML first
                if details:
                    details_html = f"<p><strong>Details:</strong></p><pre>{json.dumps(details, indent=2)}</pre>"
                else:
                    details_html = ""

                html = f"""
                <h2>Alerte VeilleFormation.fr</h2>
                <p><strong>Severite:</strong> {severity}</p>
                <p><strong>Source:</strong> {source}</p>
                <p><strong>Message:</strong> {message}</p>
                {details_html}
                <p><em>Alerte generee automatiquement le {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</em></p>
                """

                success = brevo.send_transactional_email(
                    to_email=ADMIN_EMAIL,
                    subject=subject,
                    html_content=html,
                )
                if not success:
                    logger.error("Failed to send alert email")
                    return False
        conn.commit()
        logger.info(f"Alert sent: {alert_type}/{source}")
        return True
    except Exception as e:
        logger.error(f"Error sending alert: {e}")
        return False
    finally:
        conn.close()


# ------------------------------------------------------------
# Data Cleanup
# ------------------------------------------------------------
def cleanup_old_data(
    db_path: Optional[str] = None,
    retention_days: int = 180,
    vacuum: bool = True,
) -> dict:
    """Clean up old data to keep database size manageable.

    Args:
        db_path: Path to database
        retention_days: Days to keep data (default 180 = ~6 months)
        vacuum: Whether to run VACUUM after cleanup

    Returns:
        dict with cleanup stats:
        - deleted_articles: Number of articles deleted
        - deleted_logs: Number of log entries deleted
        - db_size_before: Database size before cleanup
        - db_size_after: Database size after cleanup
        - freed_mb: Space freed in MB
    """
    db_path = db_path or DB_PATH

    conn = get_connection(db_path)
    try:
        # Get size before
        db_size_before = Path(db_path).stat().st_size / (1024 * 1024)

        # Delete old non-pertinent articles (keep their status but allow future reprocessing)
        deleted_articles = conn.execute(
            """DELETE FROM articles
               WHERE status = 'done'
               AND relevance_score < 3
               AND collected_at < datetime('now', '-' || ? || ' days')""",
            (retention_days,),
        ).rowcount

        # Delete old logs (keep recent ones)
        deleted_logs = conn.execute(
            """DELETE FROM logs
               WHERE timestamp < datetime('now', '-' || ? || ' days')""",
            (retention_days,),
        ).rowcount

        # Delete old collection logs
        deleted_collection_logs = conn.execute(
            """DELETE FROM collection_logs
               WHERE started_at < datetime('now', '-' || ? || ' days')""",
            (retention_days,),
        ).rowcount

        # Delete old processing logs
        deleted_processing_logs = conn.execute(
            """DELETE FROM processing_logs
               WHERE started_at < datetime('now', '-' || ? || ' days')""",
            (retention_days,),
        ).rowcount

        # Delete acknowledged alerts older than 30 days
        deleted_alerts = conn.execute(
            """DELETE FROM alert_logs
               WHERE acknowledged = 1
               AND sent_at < datetime('now', '-30 days')""",
        ).rowcount

        conn.commit()

        # Run VACUUM if requested
        if vacuum:
            logger.info("Running VACUUM...")
            conn.execute("VACUUM")
            conn.commit()

        # Get size after
        db_size_after = Path(db_path).stat().st_size / (1024 * 1024)
        freed_mb = db_size_before - db_size_after

        return {
            "deleted_articles": deleted_articles,
            "deleted_logs": deleted_logs,
            "deleted_collection_logs": deleted_collection_logs,
            "deleted_processing_logs": deleted_processing_logs,
            "deleted_alerts": deleted_alerts,
            "db_size_before_mb": round(db_size_before, 2),
            "db_size_after_mb": round(db_size_after, 2),
            "freed_mb": round(freed_mb, 2),
        }
    except Exception as e:
        logger.error(f"Cleanup error: {e}")
        return {
            "deleted_articles": 0,
            "deleted_logs": 0,
            "deleted_collection_logs": 0,
            "deleted_processing_logs": 0,
            "deleted_alerts": 0,
            "db_size_before_mb": 0,
            "db_size_after_mb": 0,
            "freed_mb": 0,
            "error": str(e),
        }
    finally:
        conn.close()


# ------------------------------------------------------------
# Status Printing
# ------------------------------------------------------------
def print_status(db_path: Optional[str] = None) -> None:
    """Print a human-readable status summary to console."""
    db_path = db_path or DB_PATH

    if not Path(db_path).exists():
        print(f"Database not found: {db_path}")
        return

    health = check_health(db_path)

    print("\n" + "=" * 60)
    print("  VeilleFormation.fr Status")
    print("=" * 60)
    print(f"Status: {health['status'].upper()}")
    print(f"Total articles: {health['stats']['total_articles']}")
    print(f"Recent (3 days): {health['stats']['recent_articles']}")
    print(f"Pending: {health['stats']['pending_articles']}")
    print(f"Failed: {health['stats']['failed_articles']}")
    print(f"DB size: {health['stats']['db_size_mb']:.1f} MB")
    print(f"Last collected: {health['stats']['last_collected'] or 'Never'}")

    if health['issues']:
        print("\nIssues:")
        for issue in health['issues']:
            print(f"  - {issue}")

    if health['recommendations']:
        print("\nRecommendations:")
        for rec in health['recommendations']:
            print(f"  - {rec}")
