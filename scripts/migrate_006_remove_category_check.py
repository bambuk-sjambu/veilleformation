#!/usr/bin/env python3
"""Migration A.4.e : retire la contrainte CHECK sur articles.category.

Contexte : la table articles avait CHECK(category IN ('reglementaire', 'ao',
'metier', 'handicap', 'financement')) qui rejetait les nouvelles catégories
issues des collectors V2 multi-secteurs : `alerte_sanitaire` (RappelConso, ANSM),
`fiscal` (BOFiP), `jurisprudence` (Judilibre), etc.

Plutôt que d'ajouter à la liste à chaque nouveau secteur, on retire la
contrainte (cohérent avec ce qu'on a fait pour `source` dans migrate_remove_source_check.py).

SQLite ne supporte pas DROP CHECK. On recrée la table sans la contrainte
puis on copie les données. Idempotent.

Usage :
    python scripts/migrate_006_remove_category_check.py [--db /path/to/veille.db]
"""

import argparse
import os
import sqlite3
import sys


def is_migrated(conn: sqlite3.Connection) -> bool:
    """Détecte si la migration est déjà appliquée.

    On regarde le SQL de création de la table : si 'CHECK(category IN' est présent,
    on n'est pas migré.
    """
    row = conn.execute(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='articles'"
    ).fetchone()
    if not row:
        return True
    sql = row[0] or ""
    return "CHECK(category IN" not in sql


def migrate(db_path: str) -> dict:
    """Applique la migration. Retourne les stats."""
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys=OFF")

    if is_migrated(conn):
        conn.close()
        return {"status": "already_migrated", "rows_copied": 0}

    before = conn.execute("SELECT COUNT(*) FROM articles").fetchone()[0]

    cols_info = conn.execute("PRAGMA table_info(articles)").fetchall()
    col_names = [c[1] for c in cols_info]
    cols_csv = ", ".join(col_names)

    # Récupérer le SQL actuel pour préserver les autres contraintes
    cur_sql = conn.execute(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='articles'"
    ).fetchone()[0]

    try:
        conn.execute("BEGIN TRANSACTION")
        conn.execute("ALTER TABLE articles RENAME TO _articles_old_v6")

        # Recréer sans CHECK(category) — on garde les autres CHECK (status, impact_level, relevance_score)
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
              category TEXT,
              status TEXT DEFAULT 'new' CHECK(status IN ('new', 'processing', 'done', 'failed', 'sent')),
              summary TEXT,
              titre_reformule TEXT,
              impact_level TEXT CHECK(impact_level IN ('fort', 'moyen', 'faible')),
              impact_justification TEXT,
              impact_phrase TEXT,
              relevance_score INTEGER CHECK(relevance_score BETWEEN 1 AND 10),
              mots_cles TEXT,
              date_entree_vigueur DATE,
              processed_at DATETIME,
              sent_in_newsletter_id INTEGER,
              is_read INTEGER DEFAULT 0,
              is_starred INTEGER DEFAULT 0,
              read_status TEXT DEFAULT 'a_lire',
              taxonomy_indicators TEXT,
              taxonomy_justification TEXT,
              extra_meta TEXT
            )
        """)

        conn.execute(f"INSERT INTO articles ({cols_csv}) SELECT {cols_csv} FROM _articles_old_v6")

        conn.execute("CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_articles_status on articles(status)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_articles_category on articles(category)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_date DESC)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_articles_impact on articles(impact_level)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_articles_source_id ON articles(source_id)")

        conn.execute("DROP TABLE _articles_old_v6")
        conn.execute("COMMIT")
    except Exception:
        conn.execute("ROLLBACK")
        conn.close()
        raise

    after = conn.execute("SELECT COUNT(*) FROM articles").fetchone()[0]
    conn.execute("PRAGMA foreign_keys=ON")
    conn.close()

    return {
        "status": "migrated",
        "rows_before": before,
        "rows_after": after,
        "previous_sql_excerpt": cur_sql[:200] if cur_sql else "",
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

    print(f"Migration A.4.e : retire CHECK(category) sur {args.db}")
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
