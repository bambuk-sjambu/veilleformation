#!/usr/bin/env python3
"""Telecharge tous les OF Qualiopi (~26755) depuis data.gouv.fr (DGEFP).

L'API Opendatasoft a un offset hard-cap à 9900. On contourne en paginant
par code_region (max ~7910 OF par région), avec écriture incrémentale
pour ne rien perdre en cas d'erreur réseau.
"""

import csv
import sys
import time
from urllib import request, parse

API = "https://dgefp.opendatasoft.com/api/explore/v2.1/catalog/datasets/liste-publique-des-of-v2/records"
PAGE_SIZE = 100
OUT = "data/of_prospects_full.csv"

# Filtre commun : Qualiopi actions de formation + adresse renseignée
WHERE_BASE = (
    "certifications_actionsdeformation=\"true\" AND "
    "adressephysiqueorganismeformation_ville IS NOT NULL"
)

FIELDNAMES = [
    "nda", "siret", "siren", "denomination", "adresse",
    "code_postal", "ville", "code_region",
    "formation", "bilan_competences", "vae", "apprentissage",
    "date_derniere_declaration",
]


def fetch_regions() -> list[tuple[str, int]]:
    """Liste les codes régions et leur volume d'OF Qualiopi."""
    params = {
        "where": WHERE_BASE,
        "select": "adressephysiqueorganismeformation_coderegion, count(*) as cnt",
        "group_by": "adressephysiqueorganismeformation_coderegion",
        "order_by": "cnt DESC",
        "limit": 100,
    }
    url = f"{API}?{parse.urlencode(params)}"
    with request.urlopen(url, timeout=30) as r:
        import json as _json
        rows = _json.loads(r.read().decode()).get("results", [])
    return [(r["adressephysiqueorganismeformation_coderegion"], r["cnt"]) for r in rows if r.get("adressephysiqueorganismeformation_coderegion")]


def fetch_page(region: str, offset: int, limit: int) -> list[dict]:
    where = f"{WHERE_BASE} AND adressephysiqueorganismeformation_coderegion=\"{region}\""
    params = {
        "where": where,
        "limit": limit,
        "offset": offset,
        "order_by": "informationsdeclarees_datedernieredeclaration DESC",
    }
    url = f"{API}?{parse.urlencode(params)}"
    with request.urlopen(url, timeout=30) as r:
        import json as _json
        return _json.loads(r.read().decode()).get("results", [])


def to_row(r: dict) -> dict:
    return {
        "nda": r.get("numerodeclarationactivite"),
        "siret": r.get("siretetablissementdeclarant"),
        "siren": r.get("siren"),
        "denomination": r.get("denomination"),
        "adresse": r.get("adressephysiqueorganismeformation_voie"),
        "code_postal": r.get("adressephysiqueorganismeformation_codepostal"),
        "ville": r.get("adressephysiqueorganismeformation_ville"),
        "code_region": r.get("adressephysiqueorganismeformation_coderegion"),
        "formation": r.get("certifications_actionsdeformation") == "true",
        "bilan_competences": r.get("certifications_bilansdecompetences") == "true",
        "vae": r.get("certifications_vae") == "true",
        "apprentissage": r.get("certifications_actionsdeformationparapprentissage") == "true",
        "date_derniere_declaration": r.get("informationsdeclarees_datedernieredeclaration"),
    }


def main():
    print("[1/2] Liste des régions...", flush=True)
    regions = fetch_regions()
    total_expected = sum(c for _, c in regions)
    print(f"  {len(regions)} régions, {total_expected} OF Qualiopi attendus", flush=True)

    print(f"[2/2] Download par région → {OUT} (écriture incrémentale)...", flush=True)
    seen_siret = set()  # dédup
    written = 0
    with open(OUT, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FIELDNAMES)
        w.writeheader()
        for region, expected in regions:
            print(f"  région {region} ({expected} attendus)", flush=True)
            count_region = 0
            for offset in range(0, min(expected + 100, 9900), PAGE_SIZE):
                try:
                    batch = fetch_page(region, offset, PAGE_SIZE)
                except Exception as e:
                    print(f"    ⚠️  offset={offset} erreur : {e} — skip page", flush=True)
                    time.sleep(2.0)
                    continue
                for r in batch:
                    siret = r.get("siretetablissementdeclarant")
                    if not siret or siret in seen_siret:
                        continue
                    seen_siret.add(siret)
                    w.writerow(to_row(r))
                    written += 1
                    count_region += 1
                f.flush()
                if len(batch) < PAGE_SIZE:
                    break
                time.sleep(0.3)
            print(f"    → {count_region} OF écrits (total cumulé {written})", flush=True)

    print(f"OK : {OUT} ({written} OF uniques sur {total_expected} attendus)")


if __name__ == "__main__":
    main()
