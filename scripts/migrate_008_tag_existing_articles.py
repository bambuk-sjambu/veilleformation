#!/usr/bin/env python3
"""Migration C.2 : tagge les articles existants par sector_id selon leur source.

Contexte : après migrate_007_add_sector_id, tous les articles ont sector_id='cipia'.
Cette migration met à jour ce sector_id sur les articles dont la source pointe
clairement vers un autre secteur du pivot (ANSM=medical, BOFiP=EC, RappelConso=HACCP,
Judilibre=avocats).

Les sources génériques (boamp, legifrance, jorf, opco_*, region, france_*,
travail_gouv, education_gouv) restent sur 'cipia' (Qualiopi) car c'était le
comportement pré-pivot et ces sources concernent majoritairement la formation pro.
Un classement plus fin par mots-clés viendra dans une étape ultérieure si besoin
(ex: un décret JORF santé peut concerner 'medical' plutôt que 'cipia').

Idempotente : ne met à jour que les articles dont sector_id='cipia' actuellement
ET dont la source matche une règle de tagging ciblée.

Usage :
    python scripts/migrate_008_tag_existing_articles.py [--db /path/to/veille.db]
                                                       [--dry-run]
"""

import argparse
import os
import sqlite3
import sys


# Mapping source → secteur cible. Seules les sources qui pointent CLAIREMENT
# vers un autre secteur que cipia sont listées ici.
SOURCE_TO_SECTOR = {
    "ansm": "medical",
    "bofip": "experts-comptables",
    "rappel_conso": "haccp",
    "judilibre": "avocats",
}


def migrate(db_path: str, dry_run: bool = False) -> dict:
    conn = sqlite3.connect(db_path)
    stats = {"by_sector": {}, "total_updated": 0, "dry_run": dry_run}

    try:
        if not dry_run:
            conn.execute("BEGIN TRANSACTION")
        for source, sector in SOURCE_TO_SECTOR.items():
            count = conn.execute(
                "SELECT COUNT(*) FROM articles WHERE source = ? AND sector_id = 'cipia'",
                (source,),
            ).fetchone()[0]
            if count == 0:
                stats["by_sector"][sector] = stats["by_sector"].get(sector, 0)
                continue
            if not dry_run:
                conn.execute(
                    "UPDATE articles SET sector_id = ? WHERE source = ? AND sector_id = 'cipia'",
                    (sector, source),
                )
            stats["by_sector"][sector] = stats["by_sector"].get(sector, 0) + count
            stats["total_updated"] += count
        if not dry_run:
            conn.execute("COMMIT")
    except Exception:
        if not dry_run:
            conn.execute("ROLLBACK")
        conn.close()
        raise

    # Distribution finale par secteur
    final = {
        row[0]: row[1]
        for row in conn.execute(
            "SELECT sector_id, COUNT(*) FROM articles GROUP BY sector_id"
        ).fetchall()
    }
    stats["final_distribution"] = final
    conn.close()
    return stats


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--db",
        default=os.environ.get("DB_PATH", "data/veille.db"),
        help="Chemin vers la base SQLite",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Affiche ce qui serait fait sans modifier la base",
    )
    args = parser.parse_args()

    if not os.path.exists(args.db):
        print(f"ERROR: DB {args.db} introuvable", file=sys.stderr)
        sys.exit(1)

    mode = "DRY-RUN" if args.dry_run else "LIVE"
    print(f"Migration C.2 [{mode}] : tagging articles par sector_id sur {args.db}")
    result = migrate(args.db, dry_run=args.dry_run)
    print(f"  Articles re-taggés : {result['total_updated']}")
    if result["by_sector"]:
        for sec, n in sorted(result["by_sector"].items()):
            if n > 0:
                print(f"    → {sec}: {n}")
    print(f"  Distribution finale : {result['final_distribution']}")


if __name__ == "__main__":
    main()
