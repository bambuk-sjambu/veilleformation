// Helpers pour la lecture multi-secteur (refactor A.4.c).
//
// Le frontend doit lire preferentiellement les nouvelles colonnes
// (`taxonomy_indicators`, `taxonomy_justification`, `extra_meta`) avec
// fallback sur les anciennes (`qualiopi_indicators`, `qualiopi_justification`,
// colonnes AO dediees comme `acheteur`, `region`, etc.).
//
// Pour Cipia : les deux jeux de colonnes sont peuples (dual-write Python),
// donc le comportement est identique. Pour les futurs secteurs (HACCP,
// avocats), seules les nouvelles colonnes seront peuplees.

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
 * Lit un champ AO en preferant `extra_meta`, fallback sur la colonne dediee
 * (acheteur, region, montant_estime, date_limite, cpv_code, typologie_ao,
 * theme_formation). Retourne null si rien n'est trouve.
 */
// Strip undefined+null wrapping pour le type retour : meme si ExtraMeta[K]
// inclut undefined (champ optionnel), getMetaField ne renvoie jamais
// undefined — uniquement le type "valeur" ou null.
type NonNil<T> = Exclude<T, null | undefined>;

export function getMetaField<K extends keyof ExtraMeta>(
  article: { extra_meta?: string | null } & Partial<Record<K, ExtraMeta[K]>>,
  field: K
): NonNil<ExtraMeta[K]> | null {
  const meta = parseExtraMeta(article.extra_meta);
  const fromMeta = meta[field];
  if (fromMeta !== undefined && fromMeta !== null) {
    return fromMeta as NonNil<ExtraMeta[K]>;
  }
  const fromColumn = article[field];
  if (fromColumn !== undefined && fromColumn !== null) {
    return fromColumn as NonNil<ExtraMeta[K]>;
  }
  return null;
}

/**
 * Lit la liste des indicateurs taxonomiques en preferant la nouvelle colonne
 * `taxonomy_indicators`, fallback sur `qualiopi_indicators`. Retourne la
 * chaine brute (CSV ou JSON), c'est au consumer de la parser.
 */
export function getIndicators(article: {
  taxonomy_indicators?: string | null;
  qualiopi_indicators?: string | null;
}): string | null {
  return article.taxonomy_indicators ?? article.qualiopi_indicators ?? null;
}

/**
 * Lit la justification taxonomique en preferant la nouvelle colonne
 * `taxonomy_justification`, fallback sur `qualiopi_justification`.
 */
export function getJustification(article: {
  taxonomy_justification?: string | null;
  qualiopi_justification?: string | null;
}): string | null {
  return article.taxonomy_justification ?? article.qualiopi_justification ?? null;
}
