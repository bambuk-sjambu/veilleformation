#!/usr/bin/env python3
"""Migration C.1 : ajoute sector_id sur articles, subscribers, newsletters.

Contexte : pivot multi-personas (cipia/haccp/medical/avocats/experts-comptables).
Avant cette migration, la base ne sait pas distinguer un article OF Qualiopi
d'un article HACCP, ni un subscriber Avocats d'un Expert-Comptable.

Décision V1 : 1 subscriber = 1 secteur d'intérêt (cohérent avec pricing
Solo 19€/an = 1 secteur, Cabinet 199€/an = multi-secteurs via table dédiée
plus tard si besoin).

Ajoute :
- articles.sector_id TEXT NOT NULL DEFAULT 'cipia' + index
- subscribers.sector_id TEXT NOT NULL DEFAULT 'cipia' + index
- newsletters.sector_id TEXT NOT NULL DEFAULT 'cipia' + index

La valeur 'cipia' = ancien comportement mono-secteur Qualiopi. Le tagging
réel des articles existants par secteur est fait par migrate_008_tag_existing_articles.py.

Idempotent : détecte si les colonnes sont déjà présentes avant d'agir.

Usage :
    python scripts/migrate_007_add_sector_id.py [--db /path/to/veille.db]
"""

import argparse
import os
import sqlite3
import sys


TABLES = ("articles", "subscribers", "newsletters")


def has_sector_id(conn: sqlite3.Connection, table: str) -> bool:
    cols = [c[1] for c in conn.execute(f"PRAGMA table_info({table})").fetchall()]
    return "sector_id" in cols


def migrate(db_path: str) -> dict:
    conn = sqlite3.connect(db_path)
    stats = {"added": [], "skipped": []}

    try:
        conn.execute("BEGIN TRANSACTION")
        for table in TABLES:
            if has_sector_id(conn, table):
                stats["skipped"].append(table)
                continue
            conn.execute(
                f"ALTER TABLE {table} ADD COLUMN sector_id TEXT NOT NULL DEFAULT 'cipia'"
            )
            conn.execute(
                f"CREATE INDEX IF NOT EXISTS idx_{table}_sector_id ON {table}(sector_id)"
            )
            stats["added"].append(table)
        conn.execute("COMMIT")
    except Exception:
        conn.execute("ROLLBACK")
        conn.close()
        raise

    # Verif post-migration
    for table in TABLES:
        if not has_sector_id(conn, table):
            conn.close()
            raise RuntimeError(f"sector_id absent de {table} après migration")

    conn.close()
    return stats


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

    print(f"Migration C.1 : ajoute sector_id sur {args.db}")
    result = migrate(args.db)
    if result["added"]:
        print(f"  Colonnes ajoutées : {', '.join(result['added'])}")
    if result["skipped"]:
        print(f"  Déjà présentes (skip) : {', '.join(result['skipped'])}")
    if not result["added"] and not result["skipped"]:
        print("  Rien à faire")


if __name__ == "__main__":
    main()
