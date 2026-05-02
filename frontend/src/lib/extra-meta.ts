// Helpers pour la lecture multi-secteur (refactor A.4.c → A.4.d).
//
// Depuis A.4.d, les 9 colonnes legacy (qualiopi_*, acheteur, region, etc.)
// sont supprimées. Toutes les données AO vivent dans `extra_meta` (JSON)
// et les indicateurs dans `taxonomy_indicators`.

export interface ExtraMeta {
  theme_formation?: string | null;
  typologie_ao?: string | null;
  cpv_code?: string | null;
  acheteur?: string | null;
  montant_estime?: number | null;
  region?: string | null;
  date_limite?: string | null;
}

/**
 * Parse le champ JSON `extra_meta` (col TEXT). Tolerant aux null/undefined
 * et au JSON invalide (retourne {} dans ce cas).
 */
export function parseExtraMeta(raw: string | null | undefined): ExtraMeta {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as ExtraMeta;
    }
    return {};
  } catch {
    return {};
  }
}

/**
 * Lit un champ AO depuis `extra_meta`.
 * Retourne null si rien n'est trouve.
 */
type NonNil<T> = Exclude<T, null | undefined>;

export function getMetaField<K extends keyof ExtraMeta>(
  article: { extra_meta?: string | null },
  field: K
): NonNil<ExtraMeta[K]> | null {
  const meta = parseExtraMeta(article.extra_meta);
  const fromMeta = meta[field];
  if (fromMeta !== undefined && fromMeta !== null) {
    return fromMeta as NonNil<ExtraMeta[K]>;
  }
  return null;
}

/**
 * Lit la liste des indicateurs taxonomiques depuis `taxonomy_indicators`.
 * Retourne la chaine brute (CSV ou JSON), c'est au consumer de la parser.
 */
export function getIndicators(article: {
  taxonomy_indicators?: string | null;
}): string | null {
  return article.taxonomy_indicators ?? null;
}

/**
 * Lit la justification taxonomique depuis `taxonomy_justification`.
 */
export function getJustification(article: {
  taxonomy_justification?: string | null;
}): string | null {
  return article.taxonomy_justification ?? null;
}
