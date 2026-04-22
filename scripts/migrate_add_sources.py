"""Migration: Add new sources to CHECK constraint.

New sources:
- france_competences
- travail_gouv
- education_gouv

SQLite doesn't support ALTER TABLE for CHECK constraints,
so we need to recreate the articles table.
"""

import sqlite3
import sys
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "data" / "veille.db"

NEW_SOURCES_CHECK = "'boamp', 'legifrance', 'opco_atlas', 'opco_akto', 'opco_ep', 'opco_mobilites', 'constructys', 'opcommerce', 'ocapiat', 'opco_2i', 'opco_sante', 'uniformation', 'afdas', 'france_travail', 'region', 'france_competences', 'travail_gouv', 'education_gouv'"


def migrate():
    """Run the migration."""
    if not DB_PATH.exists():
        print(f"Database not found: {DB_PATH}")
        return False

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Check current state
        cursor.execute("SELECT COUNT(*) FROM articles")
        count_before = cursor.fetchone()[0]
        print(f"Articles before migration: {count_before}")

        # Step 1: Create new table with updated CHECK constraint
        print("Creating new articles table...")
        cursor.execute(f"""
            CREATE TABLE IF NOT EXISTS articles_new (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              source TEXT NOT NULL CHECK(source IN ({NEW_SOURCES_CHECK})),
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
              is_starred INTEGER DEFAULT 0
            )
        """)

        # Step 2: Copy data from old table
        print("Copying data...")
        cursor.execute("""
            INSERT INTO articles_new SELECT * FROM articles
        """)

        # Step 3: Drop old table
        print("Dropping old table...")
        cursor.execute("DROP TABLE articles")

        # Step 4: Rename new table
        print("Renaming table...")
        cursor.execute("ALTER TABLE articles_new RENAME TO articles")

        # Step 5: Recreate indexes
        print("Recreating indexes...")
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source)",
            "CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status)",
            "CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category)",
            "CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_date DESC)",
            "CREATE INDEX IF NOT EXISTS idx_articles_impact ON articles(impact_level)",
            "CREATE INDEX IF NOT EXISTS idx_articles_deadline ON articles(date_limite)",
            "CREATE INDEX IF NOT EXISTS idx_articles_source_id ON articles(source_id)",
        ]
        for idx_sql in indexes:
            cursor.execute(idx_sql)

        # Verify
        cursor.execute("SELECT COUNT(*) FROM articles")
        count_after = cursor.fetchone()[0]
        print(f"Articles after migration: {count_after}")

        if count_after != count_before:
            print(f"ERROR: Article count mismatch! Before: {count_before}, After: {count_after}")
            conn.rollback()
            return False

        conn.commit()
        print("Migration completed successfully!")
        return True

    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()


if __name__ == "__main__":
    success = migrate()
    sys.exit(0 if success else 1)
