"""Migration 005: drop 9 legacy columns from articles.

Runs AFTER a 24h+ stable dual-write soak (A.4.b) where both the old and new
columns have been proven identical. Performs a backup and an integrity check
before any ALTER TABLE.

Usage (from repo root):
    python scripts/migrate_005_drop_legacy_columns.py

Exit 0 on success, non-zero on any failure.
"""

import json
import shutil
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
REPO_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = REPO_ROOT / "data" / "veille.db"

LEGACY_COLUMNS = [
    "qualiopi_indicators",
    "qualiopi_justification",
    "theme_formation",
    "typologie_ao",
    "cpv_code",
    "acheteur",
    "montant_estime",
    "region",
    "date_limite",
]

# Minimum SQLite version that supports DROP COLUMN (3.35.0)
MIN_SQLITE = (3, 35, 0)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def abort(msg: str) -> None:
    print(f"\nABORT: {msg}", file=sys.stderr)
    sys.exit(1)


def sqlite_version_tuple(conn: sqlite3.Connection) -> tuple:
    row = conn.execute("SELECT sqlite_version()").fetchone()
    return tuple(int(x) for x in row[0].split("."))


def table_columns(conn: sqlite3.Connection, table: str) -> list[str]:
    rows = conn.execute(f"PRAGMA table_info({table})").fetchall()
    return [r[1] for r in rows]


# ---------------------------------------------------------------------------
# Pre-flight integrity checks
# ---------------------------------------------------------------------------
def check_integrity(conn: sqlite3.Connection) -> None:
    """Abort if any row has divergent old-vs-new values."""
    print("\n--- Pre-flight integrity checks ---")
    errors: list[str] = []

    # qualiopi_indicators vs taxonomy_indicators
    n = conn.execute(
        "SELECT COUNT(*) FROM articles "
        "WHERE COALESCE(qualiopi_indicators,'') != COALESCE(taxonomy_indicators,'')"
    ).fetchone()[0]
    print(f"  qualiopi_indicators != taxonomy_indicators : {n} rows")
    if n > 0:
        errors.append(f"qualiopi_indicators vs taxonomy_indicators: {n} mismatches")

    # qualiopi_justification vs taxonomy_justification
    n = conn.execute(
        "SELECT COUNT(*) FROM articles "
        "WHERE COALESCE(qualiopi_justification,'') != COALESCE(taxonomy_justification,'')"
    ).fetchone()[0]
    print(f"  qualiopi_justification != taxonomy_justification : {n} rows")
    if n > 0:
        errors.append(f"qualiopi_justification vs taxonomy_justification: {n} mismatches")

    # AO text fields vs json_extract
    text_ao_fields = ["acheteur", "region", "theme_formation", "typologie_ao", "cpv_code", "date_limite"]
    for field in text_ao_fields:
        n = conn.execute(
            f"SELECT COUNT(*) FROM articles "
            f"WHERE COALESCE({field},'') != COALESCE(json_extract(extra_meta,'$.{field}'),'')"
        ).fetchone()[0]
        print(f"  {field} vs extra_meta.{field} : {n} rows")
        if n > 0:
            errors.append(f"{field} vs extra_meta.{field}: {n} mismatches")

    # montant_estime (REAL) — compare as REAL with tolerance
    n = conn.execute(
        "SELECT COUNT(*) FROM articles "
        "WHERE ABS(COALESCE(montant_estime,0) - COALESCE(json_extract(extra_meta,'$.montant_estime'),0)) > 0.001"
    ).fetchone()[0]
    print(f"  montant_estime vs extra_meta.montant_estime : {n} rows")
    if n > 0:
        errors.append(f"montant_estime vs extra_meta.montant_estime: {n} mismatches")

    if errors:
        abort("Integrity check FAILED:\n  " + "\n  ".join(errors))
    print("  All checks passed. Proceeding with DROP COLUMN.\n")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> None:
    print(f"Migration 005 — drop legacy columns")
    print(f"DB : {DB_PATH}")

    # 1. DB must exist
    if not DB_PATH.exists():
        abort(f"Database not found: {DB_PATH}")

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row

    # 2. Check SQLite version
    ver = sqlite_version_tuple(conn)
    print(f"SQLite version: {'.'.join(str(x) for x in ver)}")
    if ver < MIN_SQLITE:
        conn.close()
        abort(
            f"SQLite >= {'.'.join(str(x) for x in MIN_SQLITE)} required for DROP COLUMN. "
            f"Found: {'.'.join(str(x) for x in ver)}"
        )

    # 3. Backup
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = DB_PATH.parent / f"veille.db.bak.{ts}"
    conn.close()
    shutil.copy2(str(DB_PATH), str(backup_path))
    print(f"Backup created: {backup_path}")

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row

    # 4. Pre-flight integrity check (only if legacy columns still exist)
    existing = table_columns(conn, "articles")
    if "qualiopi_indicators" in existing:
        check_integrity(conn)
    else:
        print("Legacy columns already absent — skipping integrity check.")

    # 5. DROP each legacy column (idempotent)
    print("--- Dropping legacy columns ---")
    for col in LEGACY_COLUMNS:
        if col in table_columns(conn, "articles"):
            try:
                conn.execute(f"ALTER TABLE articles DROP COLUMN {col}")
                conn.commit()
                print(f"  Dropped: {col}")
            except sqlite3.OperationalError as e:
                if "no such column" in str(e).lower():
                    print(f"  Already absent: {col}")
                else:
                    conn.close()
                    abort(f"Failed to drop {col}: {e}")
        else:
            print(f"  Already absent: {col}")

    # Also drop the deadline index that referenced date_limite
    try:
        conn.execute("DROP INDEX IF EXISTS idx_articles_deadline")
        conn.commit()
        print("  Dropped index: idx_articles_deadline")
    except sqlite3.OperationalError as e:
        print(f"  Warning dropping index: {e}")

    # 6. VACUUM
    print("\n--- VACUUM ---")
    conn.execute("VACUUM")
    print("  Done.")

    # 7. Print final schema
    print("\n--- Final schema: articles ---")
    rows = conn.execute("PRAGMA table_info(articles)").fetchall()
    for r in rows:
        nullable = "" if r[3] else " NOT NULL"
        default = f" DEFAULT {r[4]}" if r[4] is not None else ""
        print(f"  {r[1]:35s} {r[2]}{nullable}{default}")

    conn.close()
    print("\nMigration 005 completed successfully.")
    sys.exit(0)


if __name__ == "__main__":
    main()
