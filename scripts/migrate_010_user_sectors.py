#!/usr/bin/env python3
"""Migration X.1.a : multi-secteurs côté users.

Contexte : pivot multi-personas. Un user peut être abonné à 1 secteur (Solo)
ou plusieurs (Cabinet jusqu'à 5). Le secteur "actif" (= univers affiché dans
le dashboard) est stocké à part pour permettre le switch sans modifier les
abonnements eux-mêmes.

Ajoute :
- users.active_sector_id TEXT NOT NULL DEFAULT 'cipia' + index
- table user_sectors(user_id, sector_id, is_primary, subscribed_at)
  + UNIQUE(user_id, sector_id) + index user_id, sector_id

Backfill :
- chaque user existant reçoit 1 ligne user_sectors avec sector_id='cipia',
  is_primary=1, subscribed_at=now (cohérent avec le fait qu'avant le pivot,
  100 % des users étaient sur la verticale Qualiopi).

Idempotente : détecte les colonnes/tables déjà présentes avant d'agir.

Usage :
    python scripts/migrate_010_user_sectors.py [--db /path/to/veille.db]
"""

import argparse
import os
import sqlite3
import sys


def has_column(conn: sqlite3.Connection, table: str, col: str) -> bool:
    cols = [c[1] for c in conn.execute(f"PRAGMA table_info({table})").fetchall()]
    return col in cols


def has_table(conn: sqlite3.Connection, name: str) -> bool:
    row = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        (name,),
    ).fetchone()
    return row is not None


def migrate(db_path: str) -> dict:
    conn = sqlite3.connect(db_path)
    stats = {"actions": [], "backfilled": 0}

    try:
        conn.execute("BEGIN TRANSACTION")

        if not has_column(conn, "users", "active_sector_id"):
            conn.execute(
                "ALTER TABLE users ADD COLUMN active_sector_id TEXT NOT NULL DEFAULT 'cipia'"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_users_active_sector ON users(active_sector_id)"
            )
            stats["actions"].append("users.active_sector_id added")
        else:
            stats["actions"].append("users.active_sector_id already present")

        if not has_table(conn, "user_sectors"):
            conn.execute(
                """
                CREATE TABLE user_sectors (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    sector_id TEXT NOT NULL,
                    is_primary INTEGER NOT NULL DEFAULT 0,
                    subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, sector_id),
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_user_sectors_user ON user_sectors(user_id)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_user_sectors_sector ON user_sectors(sector_id)"
            )
            stats["actions"].append("user_sectors table created")
        else:
            stats["actions"].append("user_sectors table already present")

        # Backfill : chaque user sans ligne user_sectors reçoit cipia primary.
        rows = conn.execute(
            """
            SELECT u.id FROM users u
            LEFT JOIN user_sectors us ON us.user_id = u.id
            WHERE us.id IS NULL
            """
        ).fetchall()
        for (uid,) in rows:
            conn.execute(
                "INSERT INTO user_sectors (user_id, sector_id, is_primary) VALUES (?, 'cipia', 1)",
                (uid,),
            )
            stats["backfilled"] += 1

        conn.execute("COMMIT")
    except Exception:
        conn.execute("ROLLBACK")
        conn.close()
        raise

    # Verif post-migration
    if not has_column(conn, "users", "active_sector_id"):
        conn.close()
        raise RuntimeError("users.active_sector_id absent après migration")
    if not has_table(conn, "user_sectors"):
        conn.close()
        raise RuntimeError("user_sectors absent après migration")

    final = {
        row[0]: row[1]
        for row in conn.execute(
            "SELECT sector_id, COUNT(*) FROM user_sectors GROUP BY sector_id"
        ).fetchall()
    }
    stats["distribution_user_sectors"] = final

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

    print(f"Migration X.1.a : multi-secteurs users sur {args.db}")
    result = migrate(args.db)
    for action in result["actions"]:
        print(f"  - {action}")
    print(f"  Backfilled user_sectors lignes : {result['backfilled']}")
    print(f"  Distribution user_sectors : {result['distribution_user_sectors']}")


if __name__ == "__main__":
    main()
