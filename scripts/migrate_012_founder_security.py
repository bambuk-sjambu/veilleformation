#!/usr/bin/env python3
"""Migration X.7 : sécurisation du flow Founder pour le lancement public.

Audit pré-lancement 2026-05-08 a identifié 4 CRITICAL :
- Pas d'idempotence native sur founder_stripe_session_id
- Pas d'idempotence sur Stripe event.id
- TOCTOU sur le cap 250 (sessions créées avant DB persist)
- Aucun mécanisme d'activation post-paiement

Cette migration ajoute :

1. UNIQUE INDEX partiel sur users.founder_stripe_session_id (idempotence DB)
2. Table `processed_events` : idempotence Stripe event.id
3. Table `password_reset_tokens` : magic links activation Founders
4. Colonne users.password_set : flag explicite (le hash bcrypt-invalide n'est plus
   suffisant, on le rend explicite)
5. Table `founder_reservations` : réservation de place 30 min pour éviter le TOCTOU

Idempotente (CREATE IF NOT EXISTS partout).
"""

import argparse
import os
import sqlite3
import sys


def has_col(conn, table, col):
    return col in [c[1] for c in conn.execute(f"PRAGMA table_info({table})").fetchall()]


def has_index(conn, name):
    row = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='index' AND name=?", (name,)
    ).fetchone()
    return row is not None


def has_table(conn, name):
    row = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?", (name,)
    ).fetchone()
    return row is not None


def migrate(db_path: str) -> dict:
    conn = sqlite3.connect(db_path)
    actions = []
    try:
        conn.execute("BEGIN TRANSACTION")

        # 1. UNIQUE INDEX partiel founder_stripe_session_id
        if not has_index(conn, "idx_users_founder_session_unique"):
            conn.execute(
                """
                CREATE UNIQUE INDEX idx_users_founder_session_unique
                ON users(founder_stripe_session_id)
                WHERE founder_stripe_session_id IS NOT NULL
                """
            )
            actions.append("UNIQUE INDEX idx_users_founder_session_unique created")

        # 2. Table processed_events (idempotence Stripe event.id)
        if not has_table(conn, "processed_events"):
            conn.execute(
                """
                CREATE TABLE processed_events (
                    event_id TEXT PRIMARY KEY,
                    event_type TEXT NOT NULL,
                    received_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            actions.append("table processed_events created")

        # 3. Table password_reset_tokens (magic links Founder activation)
        if not has_table(conn, "password_reset_tokens"):
            conn.execute(
                """
                CREATE TABLE password_reset_tokens (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    token_hash TEXT NOT NULL,
                    purpose TEXT NOT NULL DEFAULT 'set_password',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    expires_at DATETIME NOT NULL,
                    used_at DATETIME,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
                """
            )
            conn.execute(
                "CREATE INDEX idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash)"
            )
            conn.execute(
                "CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens(user_id)"
            )
            actions.append("table password_reset_tokens created")

        # 4. Colonne users.password_set (1 = mot de passe défini par le user, 0 = placeholder)
        if not has_col(conn, "users", "password_set"):
            conn.execute("ALTER TABLE users ADD COLUMN password_set INTEGER NOT NULL DEFAULT 1")
            # Backfill : tous les users existants ont déjà un mot de passe set
            # sauf les founders pending (password_hash starts with FOUNDER_PENDING_)
            conn.execute(
                """
                UPDATE users SET password_set = 0
                WHERE password_hash LIKE 'FOUNDER_PENDING_%'
                """
            )
            actions.append("users.password_set added + backfilled")

        # 5. Table founder_reservations (anti-TOCTOU sur cap)
        if not has_table(conn, "founder_reservations"):
            conn.execute(
                """
                CREATE TABLE founder_reservations (
                    stripe_session_id TEXT PRIMARY KEY,
                    phase INTEGER NOT NULL,
                    expires_at DATETIME NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            conn.execute(
                "CREATE INDEX idx_founder_reservations_phase_expires ON founder_reservations(phase, expires_at)"
            )
            actions.append("table founder_reservations created")

        conn.execute("COMMIT")
    except Exception:
        conn.execute("ROLLBACK")
        conn.close()
        raise

    # Stats post-migration
    stats = {
        "actions": actions,
        "founder_phase_1_users": conn.execute(
            "SELECT COUNT(*) FROM users WHERE founder_phase = 1"
        ).fetchone()[0],
        "users_password_pending": conn.execute(
            "SELECT COUNT(*) FROM users WHERE password_set = 0"
        ).fetchone()[0],
    }
    conn.close()
    return stats


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
    print(f"Migration X.7 : sécurisation Founder sur {args.db}")
    r = migrate(args.db)
    for a in r["actions"]:
        print(f"  - {a}")
    print(f"  Founders phase 1 : {r['founder_phase_1_users']}")
    print(f"  Users password pending : {r['users_password_pending']}")


if __name__ == "__main__":
    main()
