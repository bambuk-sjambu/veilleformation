// Chargeur de la config secteur pour le frontend Next.js.
//
// Le secteur actif est determine par la variable d'env `SECTOR` au build time
// (default: "cipia"). Le JSON correspondant est importe statiquement -- pas de
// chargement dynamique a runtime, donc tree-shakable et SSR-safe.
//
// Pour ajouter un nouveau secteur :
//   1. Creer `frontend/src/config/sectors/<id>.json` conforme a SectorConfig.
//   2. Ajouter une entree dans le switch ci-dessous.
//   3. Au deploy, fixer `SECTOR=<id>` dans les env vars.
//
// Le JSON est volontairement dans frontend/ (Next.js Turbopack refuse les
// imports hors de la racine du projet). Le loader Python (`config/loader.py`)
// lit le meme fichier via chemin relatif pour garantir l'unicite.

import cipiaConfig from "./sectors/cipia.json";
import type { SectorConfig } from "./types";

const SECTORS: Record<string, SectorConfig> = {
  cipia: cipiaConfig as SectorConfig,
};

const ACTIVE_SECTOR_ID = process.env.SECTOR || "cipia";

const active = SECTORS[ACTIVE_SECTOR_ID];
if (!active) {
  throw new Error(
    `Secteur inconnu: "${ACTIVE_SECTOR_ID}". Secteurs disponibles: ${Object.keys(SECTORS).join(", ")}`
  );
}

export const sector: SectorConfig = active;
export type { SectorConfig, BrandConfig, VocabConfig, TaxonomyConfig, TaxonomyIndicator, AuditPdfConfig, NewsletterConfig } from "./types";
