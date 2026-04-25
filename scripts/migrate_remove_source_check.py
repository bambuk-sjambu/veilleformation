#!/usr/bin/env python3
"""Migration : retire la contrainte CHECK sur articles.source.

Contexte : la table articles avait CHECK(source IN ('boamp', 'legifrance', ...))
qui rejetait silencieusement les nouvelles sources (centre_inffo, jorf).

SQLite ne supporte pas DROP CHECK. On recrée la table sans la contrainte
puis on copie les données.

Idempotent : detecte si deja migre via PRAGMA table_info.

Usage :
    python scripts/migrate_remove_source_check.py [--db /path/to/veille.db]
"""

import argparse
import os
import sqlite3
import sys


def is_migrated(conn: sqlite3.Connection) -> bool:
    """Detecte si la migration a deja ete appliquee.

    On regarde le SQL de creation de la table : si 'CHECK(source IN' est present,
    on n'est pas migre.
    """
    row = conn.execute(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='articles'"
    ).fetchone()
    if not row:
        return True  # Pas de table, rien a migrer
    sql = row[0] or ""
    return "CHECK(source IN" not in sql


def migrate(db_path: str) -> dict:
    """Applique la migration. Retourne les stats."""
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys=OFF")

    if is_migrated(conn):
        conn.close()
        return {"status": "already_migrated", "rows_copied": 0}

    # Compter avant
    before = conn.execute("SELECT COUNT(*) FROM articles").fetchone()[0]

    # Recuperer les colonnes actuelles dans l'ordre
    cols_info = conn.execute("PRAGMA table_info(articles)").fetchall()
    col_names = [c[1] for c in cols_info]
    cols_csv = ", ".join(col_names)

    try:
        conn.execute("BEGIN TRANSACTION")
        conn.execute("ALTER TABLE articles RENAME TO _articles_old")

        # Recreer la table sans la contrainte CHECK source
        # (on garde toutes les autres contraintes du schema)
        conn.execute("""
            CREATE TABLE articles (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              source TEXT NOT NULL,
              source_id TEXT UNIQUE NOT NULL,
              title TEXT NOT NULL,
              url TEXT,
              content TEXT,
              published_date DATE,
              collected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              category TEXT CHECK(category IN ('reglementaire', 'ao', 'metier', 'handicap', 'financement')),
              status TEXT DEFAULT 'new' CHECK(status IN ('new', 'processing', 'done', 'failed', 'sent')),
              summary TEXT,
              titre_reformule TEXT,
              impact_level TEXT CHECK(impact_level IN ('fort', 'moyen', 'faible')),
              impact_justification TEXT,
              impact_phrase TEXT,
              qualiopi_indicators TEXT,
              qualiopi_justification TEXT,
              relevance_score INTEGER CHECK(relevance_score BETWEEN 1 AND 10),
              theme_formation TEXT,
              mots_cles TEXT,
              date_entree_vigueur DATE,
              typologie_ao TEXT CHECK(typologie_ao IN ('formation', 'bilan_competences', 'vae', 'conseil', NULL)),
              acheteur TEXT,
              region TEXT,
              montant_estime REAL,
              date_limite DATE,
              cpv_code TEXT,
              processed_at DATETIME,
              sent_in_newsletter_id INTEGER,
              is_read INTEGER DEFAULT 0,
              is_starred INTEGER DEFAULT 0,
              read_status TEXT DEFAULT 'a_lire'
            )
        """)

        # Copier les donnees
        conn.execute(f"INSERT INTO articles ({cols_csv}) SELECT {cols_csv} FROM _articles_old")

        # Recreer les indexes
        conn.execute("CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_articles_status on articles(status)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_articles_category on articles(category)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_date DESC)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_articles_impact on articles(impact_level)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_articles_deadline on articles(date_limite)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_articles_source_id ON articles(source_id)")

        # Drop ancienne table
        conn.execute("DROP TABLE _articles_old")
        conn.execute("COMMIT")
    except Exception:
        conn.execute("ROLLBACK")
        conn.close()
        raise

    # Compter apres
    after = conn.execute("SELECT COUNT(*) FROM articles").fetchone()[0]
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

    print(f"Migration : {args.db}")
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
