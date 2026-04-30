// Types de la config secteur — source unique de vérité.
// Le JSON `/config/sectors/<sector>.json` doit conformer à SectorConfig.
//
// Usage côté Next.js : `import { sector } from "@/config";`
// Usage côté Python : `config.loader.load_sector()` (lit le même JSON).

export interface TaxonomyIndicator {
  /** ID stable utilisé en DB et dans les prompts (ex: "23", "ccp", "social"). */
  id: string;
  /** Label court pour les pills/badges UI (ex: "Légal"). */
  short: string;
  /** Label long pour les pages explicatives (ex: "Veille légale et réglementaire"). */
  label: string;
  /** Description longue pour les prompts IA + tooltips. */
  description: string;
}

export interface BrandConfig {
  /** Nom commercial affiché dans les meta, header, footer. */
  name: string;
  /** Nom légal (peut différer du nom commercial). Default = name. */
  legalName?: string;
  /** Domaine principal sans protocole (ex: "cipia.fr"). */
  domain: string;
  /** Tagline courte (~10 mots) pour meta description, hero. */
  tagline: string;
  /** Description longue (~30 mots) pour meta description, about. */
  description: string;
  /** URL absolue ou chemin relatif vers le logo principal. */
  logoUrl: string;
  /** Couleur primaire (CSS hex ou nom Tailwind). */
  colorPrimary: string;
  /** Couleur d'accent. */
  colorAccent: string;
}

export interface VocabConfig {
  /** Audience cible plurielle (ex: "organismes de formation", "restaurateurs"). */
  audience: string;
  /** Forme abrégée (ex: "OF", "restaurants"). */
  audienceShort: string;
  /** Nom de la certification/régulation (ex: "Qualiopi", "HACCP", "RGPD"). */
  regulatorName: string;
  /** Nom de l'audit cible (ex: "audit Qualiopi", "contrôle DDPP"). */
  auditName: string;
  /** Nom du référentiel (ex: "référentiel Qualiopi", "réglementation HACCP"). */
  regulatorRefName: string;
}

export interface TaxonomyConfig {
  /** Liste des indicateurs de classification (ex: Qualiopi 23-26). */
  indicators: TaxonomyIndicator[];
  /** Catégories métier (ex: "reglementaire", "ao", "metier"). */
  categories: string[];
}

export interface SectorConfig {
  /** ID stable du secteur (ex: "cipia", "haccp", "avocats"). */
  id: string;
  brand: BrandConfig;
  vocab: VocabConfig;
  taxonomy: TaxonomyConfig;
}
