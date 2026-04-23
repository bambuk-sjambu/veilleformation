#!/usr/bin/env python3
"""
Cipia - Verificateur d'articles de blog
Verifie que les articles generes aujourd'hui sont accessibles en ligne.

Usage: python scripts/verify_blog.py
"""

import json
import logging
import sqlite3
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Optional
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
DB_PATH = PROJECT_ROOT / "data" / "veille.db"

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
BASE_URL = "https://cipia.fr/blog"
MAX_RETRIES = 3
RETRY_INTERVAL_SECONDS = 60
MIN_CONTENT_LENGTH = 5000
REQUEST_TIMEOUT = 30

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("verify_blog")


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------
def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def get_todays_articles(conn: sqlite3.Connection) -> list[dict]:
    """Return articles created today with status 'published'."""
    rows = conn.execute(
        """
        SELECT id, slug, title, word_count, read_time, funnel, cluster, category
        FROM blog_articles
        WHERE DATE(created_at) = DATE('now')
          AND status = 'published'
        ORDER BY created_at ASC
        """
    ).fetchall()
    return [dict(row) for row in rows]


def update_verification(
    conn: sqlite3.Connection,
    article_id: int,
    status_code: int,
    verified_at: str,
) -> None:
    conn.execute(
        """
        UPDATE blog_articles
        SET verified_at = ?, verified_status_code = ?
        WHERE id = ?
        """,
        (verified_at, status_code, article_id),
    )
    conn.commit()


# ---------------------------------------------------------------------------
# HTTP check
# ---------------------------------------------------------------------------
def check_url(url: str, expected_title: str) -> dict:
    """
    Perform HTTP GET on url and return check result dict.
    Checks: status 200, content length > MIN_CONTENT_LENGTH, title in body.
    """
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Cipia blog verifier; "
            "contact: contact@cipia.fr)"
        )
    }
    req = Request(url, headers=headers)
    try:
        with urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
            status_code = resp.status
            body = resp.read().decode("utf-8", errors="replace")
            content_length = len(body)
            title_found = expected_title[:50].lower() in body.lower()

            ok = (
                status_code == 200
                and content_length >= MIN_CONTENT_LENGTH
                and title_found
            )

            return {
                "url": url,
                "status_code": status_code,
                "content_length": content_length,
                "title_found": title_found,
                "ok": ok,
                "error": None,
            }

    except HTTPError as exc:
        return {
            "url": url,
            "status_code": exc.code,
            "content_length": 0,
            "title_found": False,
            "ok": False,
            "error": str(exc),
        }
    except (URLError, Exception) as exc:
        return {
            "url": url,
            "status_code": 0,
            "content_length": 0,
            "title_found": False,
            "ok": False,
            "error": str(exc),
        }


def verify_with_retries(
    url: str,
    expected_title: str,
    max_retries: int = MAX_RETRIES,
    interval: int = RETRY_INTERVAL_SECONDS,
) -> dict:
    """Try to verify a URL up to max_retries times."""
    for attempt in range(1, max_retries + 1):
        logger.info("Checking %s (attempt %d/%d)", url, attempt, max_retries)
        result = check_url(url, expected_title)

        if result["ok"]:
            logger.info("OK: %s (%d chars)", url, result["content_length"])
            return result

        if attempt < max_retries:
            logger.warning(
                "Not ready yet (status=%s, length=%d, title_found=%s). "
                "Retrying in %ds...",
                result["status_code"],
                result["content_length"],
                result["title_found"],
                interval,
            )
            time.sleep(interval)
        else:
            logger.error(
                "FAILED after %d attempts: %s (status=%s, error=%s)",
                max_retries,
                url,
                result["status_code"],
                result["error"],
            )

    return result


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> dict:
    if not DB_PATH.exists():
        logger.error("Database not found at %s", DB_PATH)
        sys.exit(1)

    conn = get_db_connection()
    articles = get_todays_articles(conn)

    if not articles:
        logger.info("No articles generated today — nothing to verify.")
        result = {
            "verified": [],
            "failed": [],
            "total_published_in_db": 0,
            "date": datetime.now().strftime("%Y-%m-%d"),
        }
        conn.close()
        print("\n--- VERIFY_SUMMARY_JSON ---")
        print(json.dumps(result, ensure_ascii=False, indent=2))
        print("--- END_VERIFY_SUMMARY_JSON ---")
        return result

    logger.info("Verifying %d articles generated today...", len(articles))

    verified = []
    failed = []
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    for article in articles:
        url = f"{BASE_URL}/{article['slug']}"
        check = verify_with_retries(url, article["title"])

        update_verification(
            conn,
            article["id"],
            check["status_code"],
            now,
        )

        entry = {
            "slug": article["slug"],
            "title": article["title"],
            "url": url,
            "word_count": article["word_count"],
            "read_time": article["read_time"],
            "funnel": article["funnel"],
            "cluster": article["cluster"],
            "category": article["category"],
            "status_code": check["status_code"],
            "content_length": check["content_length"],
            "title_found": check["title_found"],
            "ok": check["ok"],
            "error": check["error"],
        }

        if check["ok"]:
            verified.append(entry)
        else:
            failed.append(entry)

    total_row = conn.execute(
        "SELECT COUNT(*) as cnt FROM blog_articles WHERE status = 'published'"
    ).fetchone()
    total_published = total_row[0] if total_row else 0
    conn.close()

    summary = {
        "verified": verified,
        "failed": failed,
        "total_published_in_db": total_published,
        "date": datetime.now().strftime("%Y-%m-%d"),
    }

    logger.info(
        "Verification done. OK: %d, Failed: %d",
        len(verified),
        len(failed),
    )

    print("\n--- VERIFY_SUMMARY_JSON ---")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print("--- END_VERIFY_SUMMARY_JSON ---")

    return summary


if __name__ == "__main__":
    main()
