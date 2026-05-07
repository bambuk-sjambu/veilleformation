/**
 * Métadonnées d'affichage par secteur (pivot multi-personas X.3).
 *
 * Centralise nom court (header), nom long, palette CSS et icône emoji.
 * Source de vérité pour le branding visuel multi-secteurs côté client.
 *
 * À garder synchro avec frontend/src/config/sectors/<id>.json
 * et collectors/base.py SECTOR_ID.
 */

export interface SectorMeta {
  id: string;
  shortLabel: string; // "Cipia OF", "Cipia HACCP"…
  longLabel: string;  // descriptif complet
  emoji: string;
  primary: string;    // couleur principale (header, CTA, bordures)
  primaryDark: string;
  accent: string;     // couleur d'accent (yellow, or, etc.)
  surface: string;    // background discret (cards / sidebar)
  ink: string;        // texte sur background sombre
}

export const SECTOR_META: Record<string, SectorMeta> = {
  cipia: {
    id: "cipia",
    shortLabel: "Cipia OF",
    longLabel: "Organismes de formation Qualiopi",
    emoji: "🎓",
    primary: "#1E40AF",      // bleu Cipia historique
    primaryDark: "#1E3A8A",
    accent: "#F59E0B",       // jaune Qualiopi
    surface: "#EFF6FF",
    ink: "#FFFFFF",
  },
  haccp: {
    id: "haccp",
    shortLabel: "Cipia HACCP",
    longLabel: "Restaurants, boulangers, traiteurs, agroalimentaire",
    emoji: "🍴",
    primary: "#15803D",      // vert sapin (alimentation)
    primaryDark: "#14532D",
    accent: "#EAB308",       // jaune doré
    surface: "#F0FDF4",
    ink: "#FFFFFF",
  },
  medical: {
    id: "medical",
    shortLabel: "Cipia Médical",
    longLabel: "Médecins, kinés, ostéos, infirmiers libéraux",
    emoji: "⚕️",
    primary: "#0EA5E9",      // bleu santé
    primaryDark: "#0369A1",
    accent: "#DC2626",       // rouge croix médicale
    surface: "#F0F9FF",
    ink: "#FFFFFF",
  },
  avocats: {
    id: "avocats",
    shortLabel: "Cipia Avocats",
    longLabel: "Avocats indépendants et petits cabinets",
    emoji: "⚖️",
    primary: "#1E3A8A",      // bleu nuit cabinet
    primaryDark: "#172554",
    accent: "#CA8A04",       // or robe d'avocat
    surface: "#EFF6FF",
    ink: "#FFFFFF",
  },
  "experts-comptables": {
    id: "experts-comptables",
    shortLabel: "Cipia EC",
    longLabel: "Experts-comptables indépendants",
    emoji: "📊",
    primary: "#6D28D9",      // violet (cabinet compta)
    primaryDark: "#5B21B6",
    accent: "#059669",       // vert émeraude (chiffres)
    surface: "#F5F3FF",
    ink: "#FFFFFF",
  },
};

export function getSectorMeta(sectorId: string): SectorMeta {
  return SECTOR_META[sectorId] || SECTOR_META.cipia;
}

export const ALL_SECTOR_IDS = Object.keys(SECTOR_META);
