#!/usr/bin/env python3
"""Migration A.4.a : ajoute des colonnes additives multi-secteur.

Refactor multi-secteur (Cipia / HACCP / avocats...). Cette migration est
purement ADDITIVE : on ajoute 3 nouvelles colonnes a cote des anciennes,
on backfill les donnees, on ne touche PAS au code applicatif.

Nouvelles colonnes :
- taxonomy_indicators TEXT      (futur successeur de qualiopi_indicators)
- taxonomy_justification TEXT   (futur successeur de qualiopi_justification)
- extra_meta TEXT (JSON)        (regroupe theme_formation, typologie_ao,
                                cpv_code, acheteur, montant_estime,
                                region, date_limite)

Le code Python et TS continue d'utiliser les ANCIENNES colonnes. Le
passage au nouveau schema (dual-write/dual-read) est traite en A.4.b.

Securite :
- Backup automatique de la DB dans data/veille.db.bak.<timestamp> avant
  toute modification.
- Idempotente : si une colonne existe deja, on ne re-ALTER pas. Si
  taxonomy_indicators est deja peuplee, on ne re-backfill pas.
- Si quelque chose foire, il suffit de DROP les nouvelles colonnes.

Usage :
    python scripts/migrate_004_taxonomy_extra_meta.py [--db data/veille.db] [--no-backup]
"""

import argparse
import json
import os
import shutil
import sqlite3
import sys
from datetime import datetime

NEW_COLUMNS = [
    ("taxonomy_indicators", "TEXT"),
    ("taxonomy_justification", "TEXT"),
    ("extra_meta", "TEXT"),
]

EXTRA_META_FIELDS = [
    "theme_formation",
    "typologie_ao",
    "cpv_code",
    "acheteur",
    "montant_estime",
    "region",
    "date_limite",
]


def existing_columns(conn: sqlite3.Connection) -> set[str]:
    rows = conn.execute("PRAGMA table_info(articles)").fetchall()
    return {row[1] for row in rows}


def add_missing_columns(conn: sqlite3.Connection) -> int:
    """Ajoute les colonnes manquantes. Retourne le nombre de colonnes ajoutees."""
    cols = existing_columns(conn)
    added = 0
    for name, sqltype in NEW_COLUMNS:
        if name not in cols:
            conn.execute(f"ALTER TABLE articles ADD COLUMN {name} {sqltype}")
            added += 1
            print(f"  + colonne ajoutee : {name} {sqltype}")
        else:
            print(f"  = colonne deja presente : {name}")
    conn.commit()
    return added


def backfill_taxonomy(conn: sqlite3.Connection) -> tuple[int, int]:
    """Copie qualiopi_* vers taxonomy_*. Retourne (rows_indicators, rows_justification)."""
    cur = conn.execute(
        """
        UPDATE articles
        SET taxonomy_indicators = qualiopi_indicators
        WHERE taxonomy_indicators IS NULL
          AND qualiopi_indicators IS NOT NULL
        """
    )
    rows_ind = cur.rowcount

    cur = conn.execute(
        """
        UPDATE articles
        SET taxonomy_justification = qualiopi_justification
        WHERE taxonomy_justification IS NULL
          AND qualiopi_justification IS NOT NULL
        """
    )
    rows_just = cur.rowcount
    conn.commit()
    return rows_ind, rows_just


def backfill_extra_meta(conn: sqlite3.Connection) -> int:
    """Construit le JSON extra_meta pour chaque ligne ou il est NULL.

    Pour chaque ligne :
    - lit les champs EXTRA_META_FIELDS,
    - garde uniquement les non-null,
    - serialise en JSON,
    - update la ligne (vide -> '{}').
    Retourne le nombre de lignes mises a jour.
    """
    fields_csv = ", ".join(EXTRA_META_FIELDS)
    rows = conn.execute(
        f"SELECT id, {fields_csv} FROM articles WHERE extra_meta IS NULL"
    ).fetchall()

    updated = 0
    for row in rows:
        article_id = row[0]
        meta = {}
        for idx, field in enumerate(EXTRA_META_FIELDS, start=1):
            value = row[idx]
            if value is not None and value != "":
                meta[field] = value
        payload = json.dumps(meta, ensure_ascii=False)
        conn.execute(
            "UPDATE articles SET extra_meta = ? WHERE id = ?",
            (payload, article_id),
        )
        updated += 1
    conn.commit()
    return updated


def show_sample(conn: sqlite3.Connection, limit: int = 3) -> None:
    print(f"\n--- Sample de {limit} lignes (random, taxonomy_* peuplees) ---")
    rows = conn.execute(
        """
        SELECT id, qualiopi_indicators, taxonomy_indicators, extra_meta
        FROM articles
        WHERE taxonomy_indicators IS NOT NULL
        ORDER BY RANDOM()
        LIMIT ?
        """,
        (limit,),
    ).fetchall()
    for row in rows:
        article_id, qi, ti, em = row
        print(f"  id={article_id}")
        print(f"    qualiopi_indicators  = {qi}")
        print(f"    taxonomy_indicators  = {ti}")
        print(f"    extra_meta           = {em}")


def integrity_check(conn: sqlite3.Connection) -> bool:
    """Verifie qu'aucune ligne n'a qualiopi_indicators non-null mais taxonomy_indicators null."""
    row = conn.execute(
        """
        SELECT COUNT(*) FROM articles
        WHERE qualiopi_indicators IS NOT NULL
          AND taxonomy_indicators IS NULL
        """
    ).fetchone()
    leak = row[0]
    if leak > 0:
        print(f"  ERREUR integrite : {leak} lignes avec qualiopi_indicators non-null mais taxonomy_indicators NULL")
        return False
    print("  OK integrite : 0 ligne avec qualiopi non-migre")
    return True


def backup_db(db_path: str) -> str:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{db_path}.bak.{ts}"
    shutil.copy2(db_path, backup_path)
    print(f"Backup : {backup_path}")
    return backup_path


def migrate(db_path: str, do_backup: bool = True) -> dict:
    if not os.path.exists(db_path):
        print(f"ERROR: DB {db_path} introuvable", file=sys.stderr)
        sys.exit(1)

    backup_path = None
    if do_backup:
        backup_path = backup_db(db_path)

    conn = sqlite3.connect(db_path)
    try:
        print(f"\nMigration : {db_path}")

        # 1. Colonnes
        print("\n[1/3] Ajout des colonnes manquantes")
        added = add_missing_columns(conn)

        # 2. Backfill taxonomy_*
        print("\n[2/3] Backfill taxonomy_indicators / taxonomy_justification")
        rows_ind, rows_just = backfill_taxonomy(conn)
        print(f"  taxonomy_indicators backfille    : {rows_ind} lignes")
        print(f"  taxonomy_justification backfille : {rows_just} lignes")

        # 3. Backfill extra_meta (JSON)
        print("\n[3/3] Backfill extra_meta (JSON)")
        rows_em = backfill_extra_meta(conn)
        print(f"  extra_meta backfille             : {rows_em} lignes")

        # Verifs
        print("\n--- Verifications ---")
        ok = integrity_check(conn)
        if not ok:
            sys.exit(2)

        show_sample(conn, limit=3)

        return {
            "columns_added": added,
            "rows_taxonomy_indicators": rows_ind,
            "rows_taxonomy_justification": rows_just,
            "rows_extra_meta": rows_em,
            "backup_path": backup_path,
        }
    finally:
        conn.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--db",
        default=os.environ.get("DB_PATH", "data/veille.db"),
        help="Chemin vers la base SQLite (defaut: data/veille.db)",
    )
    parser.add_argument(
        "--no-backup",
        action="store_true",
        help="Ne pas creer de backup (deconseille en prod)",
    )
    args = parser.parse_args()

    result = migrate(args.db, do_backup=not args.no_backup)

    print("\n=== Migration terminee ===")
    print(f"  Colonnes ajoutees                : {result['columns_added']}")
    print(f"  Lignes taxonomy_indicators       : {result['rows_taxonomy_indicators']}")
    print(f"  Lignes taxonomy_justification    : {result['rows_taxonomy_justification']}")
    print(f"  Lignes extra_meta                : {result['rows_extra_meta']}")
    if result["backup_path"]:
        print(f"  Backup                           : {result['backup_path']}")


if __name__ == "__main__":
    main()
