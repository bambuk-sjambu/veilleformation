#!/usr/bin/env python3
"""Telecharge 1000 OF Qualiopi depuis data.gouv.fr (DGEFP) dans un CSV."""

import csv
import sys
import time
from urllib import request, parse

API = "https://dgefp.opendatasoft.com/api/explore/v2.1/catalog/datasets/liste-publique-des-of-v2/records"
PAGE_SIZE = 100
TOTAL = 1000
OUT = "data/of_prospects_1000.csv"

# Filtre : Qualiopi actions de formation + donnees adresse presentes
WHERE = (
    "certifications_actionsdeformation=\"true\" AND "
    "adressephysiqueorganismeformation_ville IS NOT NULL"
)


def fetch(offset: int, limit: int) -> list[dict]:
    params = {
        "where": WHERE,
        "limit": limit,
        "offset": offset,
        "order_by": "informationsdeclarees_datedernieredeclaration DESC",
    }
    url = f"{API}?{parse.urlencode(params)}"
    with request.urlopen(url, timeout=30) as r:
        import json as _json
        return _json.loads(r.read().decode()).get("results", [])


def main():
    print(f"[1/2] Download {TOTAL} OF Qualiopi depuis DGEFP...")
    all_rows = []
    for offset in range(0, TOTAL, PAGE_SIZE):
        print(f"  page offset={offset}", end="", flush=True)
        batch = fetch(offset, PAGE_SIZE)
        all_rows.extend(batch)
        print(f" -> {len(batch)} items (total {len(all_rows)})")
        if len(batch) < PAGE_SIZE:
            break
        time.sleep(0.3)

    print(f"[2/2] Ecriture {len(all_rows)} lignes dans {OUT}...")
    # Extract key fields + flatten for CSV
    fieldnames = [
        "nda",
        "siret",
        "siren",
        "denomination",
        "adresse",
        "code_postal",
        "ville",
        "code_region",
        "formation",
        "bilan_competences",
        "vae",
        "apprentissage",
        "date_derniere_declaration",
    ]

    with open(OUT, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in all_rows:
            w.writerow({
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
            })

    print(f"OK : {OUT} ({len(all_rows)} OF)")


if __name__ == "__main__":
    main()
