#!/usr/bin/env python3
"""Migration 013 : tracking des connexions.

Ajoute users.last_login_at + users.login_count pour répondre à
"combien de connexions ce user a-t-il faites et quand pour la dernière".

Idempotente.
"""

import argparse
import os
import sqlite3
import sys


def has_col(conn, table, col):
    return col in [c[1] for c in conn.execute(f"PRAGMA table_info({table})").fetchall()]


def migrate(db_path: str) -> dict:
    conn = sqlite3.connect(db_path)
    actions = []
    try:
        conn.execute("BEGIN TRANSACTION")
        if not has_col(conn, "users", "last_login_at"):
            conn.execute("ALTER TABLE users ADD COLUMN last_login_at DATETIME")
            actions.append("users.last_login_at added")
        if not has_col(conn, "users", "login_count"):
            conn.execute("ALTER TABLE users ADD COLUMN login_count INTEGER NOT NULL DEFAULT 0")
            actions.append("users.login_count added")
        conn.execute("COMMIT")
    except Exception:
        conn.execute("ROLLBACK")
        conn.close()
        raise
    conn.close()
    return {"actions": actions}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default=os.environ.get("DB_PATH", "data/veille.db"))
    args = parser.parse_args()
    if not os.path.exists(args.db):
        print(f"ERROR: DB {args.db} introuvable", file=sys.stderr)
        sys.exit(1)
    print(f"Migration 013 : login tracking sur {args.db}")
    r = migrate(args.db)
    if not r["actions"]:
        print("  - rien à faire (colonnes déjà présentes)")
    for a in r["actions"]:
        print(f"  - {a}")


if __name__ == "__main__":
    main()
