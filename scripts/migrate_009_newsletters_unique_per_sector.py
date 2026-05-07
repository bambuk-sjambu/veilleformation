#!/usr/bin/env python3
"""Migration C.3 : remplace UNIQUE(edition_number) par UNIQUE(sector_id, edition_number)
sur la table newsletters.

Contexte : pivot multi-personas. Avec 5 secteurs, chaque secteur démarre à #1
indépendamment. Sans cette migration, deux newsletters concurrentes (ex
"Cipia HACCP #1" et "Cipia Avocats #1") déclenchent UNIQUE constraint failed.

SQLite ne supporte pas DROP CONSTRAINT. On recrée la table sans l'UNIQUE
sur edition_number, on ajoute UNIQUE(sector_id, edition_number), on copie
les données.

Idempotent : détecte si la nouvelle contrainte est déjà en place.

Usage :
    python scripts/migrate_009_newsletters_unique_per_sector.py [--db /path/to/veille.db]
"""

import argparse
import os
import sqlite3
import sys


def is_migrated(conn: sqlite3.Connection) -> bool:
    """Détecte si la nouvelle contrainte UNIQUE composite est en place."""
    row = conn.execute(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='newsletters'"
    ).fetchone()
    if not row:
        return True
    sql = row[0] or ""
    return (
        "UNIQUE(sector_id, edition_number)" in sql
        or "UNIQUE (sector_id, edition_number)" in sql
    )


def migrate(db_path: str) -> dict:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys=OFF")

    if is_migrated(conn):
        conn.close()
        return {"status": "already_migrated", "rows_copied": 0}

    before = conn.execute("SELECT COUNT(*) FROM newsletters").fetchone()[0]
    cols_info = conn.execute("PRAGMA table_info(newsletters)").fetchall()
    col_names = [c[1] for c in cols_info]
    cols_csv = ", ".join(col_names)

    try:
        conn.execute("BEGIN TRANSACTION")
        conn.execute("ALTER TABLE newsletters RENAME TO _newsletters_old_v9")

        conn.execute("""
            CREATE TABLE newsletters (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              edition_number INTEGER NOT NULL,
              subject TEXT NOT NULL,
              html_content TEXT,
              week_start DATE,
              week_end DATE,
              articles_reglementaire INTEGER DEFAULT 0,
              articles_ao INTEGER DEFAULT 0,
              articles_metier INTEGER DEFAULT 0,
              articles_handicap INTEGER DEFAULT 0,
              articles_total INTEGER DEFAULT 0,
              brevo_campaign_id TEXT,
              sent_at DATETIME,
              recipients_count INTEGER DEFAULT 0,
              status TEXT DEFAULT 'draft',
              open_rate REAL,
              click_rate REAL,
              unsubscribe_count INTEGER DEFAULT 0,
              bounce_count INTEGER DEFAULT 0,
              stats_fetched_at DATETIME,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              archive_url TEXT,
              sector_id TEXT NOT NULL DEFAULT 'cipia',
              UNIQUE(sector_id, edition_number)
            )
        """)

        conn.execute(
            f"INSERT INTO newsletters ({cols_csv}) SELECT {cols_csv} FROM _newsletters_old_v9"
        )

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_newsletters_edition ON newsletters(edition_number)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_newsletters_sent ON newsletters(sent_at)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_newsletters_status on newsletters(status)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_newsletters_sector_id ON newsletters(sector_id)"
        )

        conn.execute("DROP TABLE _newsletters_old_v9")
        conn.execute("COMMIT")
    except Exception:
        conn.execute("ROLLBACK")
        conn.close()
        raise

    after = conn.execute("SELECT COUNT(*) FROM newsletters").fetchone()[0]
    conn.execute("PRAGMA foreign_keys=ON")
    conn.close()

    return {
        "status": "migrated",
        "rows_before": before,
        "rows_after": after,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--db",
        default=os.environ.get("DB_PATH", "data/veille.db"),
        help="Chemin vers la base SQLite",
    )
    args = parser.parse_args()

    if not os.path.exists(args.db):
        print(f"ERROR: DB {args.db} introuvable", file=sys.stderr)
        sys.exit(1)

    print(f"Migration C.3 : UNIQUE(sector_id, edition_number) sur {args.db}")
    result = migrate(args.db)
    print(f"  Statut : {result['status']}")
    if result["status"] == "migrated":
        print(f"  Lignes avant : {result['rows_before']}")
        print(f"  Lignes apres : {result['rows_after']}")
        if result["rows_before"] != result["rows_after"]:
            print("  ERREUR : nb de lignes different !", file=sys.stderr)
            sys.exit(1)


if __name__ == "__main__":
    main()
