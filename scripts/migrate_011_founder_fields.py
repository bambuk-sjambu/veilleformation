#!/usr/bin/env python3
"""Migration X.6 : champs Founder sur la table users.

Pivot Founders 2026-05-08 : phase 1 = 250 places lifetime à 100€ HT pour OF
Qualiopi, phase 2 = 1000 places sur 5 ans à 150€ HT.

Ajoute :
- users.founder_phase INTEGER NULL (1 ou 2)
- users.founder_purchased_at DATETIME NULL
- users.founder_until_date DATE NULL (NULL = lifetime, sinon date+5y pour phase 2)
- users.founder_stripe_session_id TEXT NULL (idempotence webhook)
- index idx_users_founder_phase

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
        if not has_col(conn, "users", "founder_phase"):
            conn.execute("ALTER TABLE users ADD COLUMN founder_phase INTEGER")
            actions.append("users.founder_phase added")
        if not has_col(conn, "users", "founder_purchased_at"):
            conn.execute("ALTER TABLE users ADD COLUMN founder_purchased_at DATETIME")
            actions.append("users.founder_purchased_at added")
        if not has_col(conn, "users", "founder_until_date"):
            conn.execute("ALTER TABLE users ADD COLUMN founder_until_date DATE")
            actions.append("users.founder_until_date added")
        if not has_col(conn, "users", "founder_stripe_session_id"):
            conn.execute("ALTER TABLE users ADD COLUMN founder_stripe_session_id TEXT")
            actions.append("users.founder_stripe_session_id added")
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_users_founder_phase ON users(founder_phase)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_users_founder_session ON users(founder_stripe_session_id)"
        )
        conn.execute("COMMIT")
    except Exception:
        conn.execute("ROLLBACK")
        conn.close()
        raise

    counts = {
        "phase_1": conn.execute(
            "SELECT COUNT(*) FROM users WHERE founder_phase = 1"
        ).fetchone()[0],
        "phase_2": conn.execute(
            "SELECT COUNT(*) FROM users WHERE founder_phase = 2"
        ).fetchone()[0],
    }
    conn.close()
    return {"actions": actions, "counts": counts}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--db",
        default=os.environ.get("DB_PATH", "data/veille.db"),
    )
    args = parser.parse_args()
    if not os.path.exists(args.db):
        print(f"ERROR: DB {args.db} introuvable", file=sys.stderr)
        sys.exit(1)
    print(f"Migration X.6 : champs Founder sur {args.db}")
    r = migrate(args.db)
    for a in r["actions"]:
        print(f"  - {a}")
    print(f"  Founders existants : phase 1 = {r['counts']['phase_1']}, phase 2 = {r['counts']['phase_2']}")


if __name__ == "__main__":
    main()
