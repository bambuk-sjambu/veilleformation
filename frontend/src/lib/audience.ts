// ---------------------------------------------------------------------------
// Audience theming — système de branding 2 gammes pour Cipia
// ---------------------------------------------------------------------------
//
// Cipia est UNE marque avec 2 gammes/produits visuellement distincts (modèle
// Stripe ou Notion) :
//
//   - "solo"    : TPE, indépendants, freelances. Palette bleu + jaune (héritée
//                 du branding Cipia historique). Ton accessible et énergique.
//   - "cabinet" : cabinets, structures, équipes 5-50 personnes. Palette bleu
//                 nuit + or. Ton sérieux, statutaire, premium.
//
// Cette lib expose :
//   - le type `Audience`
//   - la fonction `getAudienceTheme(audience)` qui retourne un objet de tokens
//     (couleurs hex, classes utilitaires Tailwind, vocabulaire, CTA)
//   - un AudienceContext React pour partager l'audience entre composants client
//   - des helpers `useAudience()` et `<AudienceProvider>`
//
// Les tokens couleur "cabinet-*" sont déclarés dans `globals.css` via
// `@theme inline`, ce qui rend disponibles automatiquement les classes
// Tailwind correspondantes (`bg-cabinet-primary`, `text-cabinet-accent`, etc.).
// ---------------------------------------------------------------------------

"use client";

import {
  createContext,
  createElement,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Audience = "solo" | "cabinet";

export interface AudienceTheme {
  /** ID stable. */
  id: Audience;
  /** Libellé court affiché dans le sélecteur (ex: "Indépendant"). */
  label: string;
  /** Phrase d'accroche utilisée dans les CTA et headlines. */
  shortPitch: string;
  /** Couleur primaire (hex). */
  primaryHex: string;
  /** Couleur d'accent (hex). */
  accentHex: string;
  /** Couleur de fond hero / blocs doux (hex). */
  surfaceHex: string;
  /** Classe Tailwind background couleur primaire. */
  primaryBgClass: string;
  /** Classe Tailwind texte couleur primaire. */
  primaryTextClass: string;
  /** Classe Tailwind background couleur accent. */
  accentBgClass: string;
  /** Classe Tailwind texte couleur accent. */
  accentTextClass: string;
  /** Classe Tailwind background hover du CTA principal. */
  primaryHoverBgClass: string;
  /** Classe Tailwind background du CTA secondaire (accent). */
  accentHoverBgClass: string;
  /** Classe Tailwind background gradient hero. */
  heroGradientClass: string;
  /** Classe Tailwind border couleur primaire. */
  primaryBorderClass: string;
  /** Classe Tailwind background couleur primaire en opacité 10%. */
  primarySoftBgClass: string;
  /** Police de titre par défaut (`font-sans` = Inter, `font-serif` = serif système). */
  headingFontClass: string;
  /** Texte du CTA principal (action conversion). */
  ctaText: string;
  /** URL de destination du CTA principal. */
  ctaHref: string;
  /** Vocabulaire utilisé dans les copies (singular/plural, ton). */
  vocabulary: AudienceVocabulary;
}

export interface AudienceVocabulary {
  /** Manière d'appeler l'utilisateur (ex: "vous, indépendant", "votre cabinet"). */
  youAddress: string;
  /** Mot pour "structure" (ex: "votre activité", "votre cabinet"). */
  structureWord: string;
  /** Mot pour "équipe" (ex: "vous", "votre équipe"). */
  teamWord: string;
  /** Tonalité globale (utilisée par les copywriters / prompts). */
  tone: "accessible" | "premium";
}

const SOLO_THEME: AudienceTheme = {
  id: "solo",
  label: "Indépendant",
  shortPitch: "L'IA qui veille pour vous, à 19€/an.",
  primaryHex: "#1d4ed8",
  accentHex: "#fbbf24",
  surfaceHex: "#eff6ff",
  primaryBgClass: "bg-primary",
  primaryTextClass: "text-primary",
  accentBgClass: "bg-yellow-400",
  accentTextClass: "text-yellow-500",
  primaryHoverBgClass: "hover:bg-primary-dark",
  accentHoverBgClass: "hover:bg-yellow-300",
  heroGradientClass: "bg-gradient-to-b from-blue-50 to-white",
  primaryBorderClass: "border-primary",
  primarySoftBgClass: "bg-primary/10",
  headingFontClass: "font-sans",
  ctaText: "Découvrir Cipia Solo (19€/an)",
  ctaHref: "/inscription",
  vocabulary: {
    youAddress: "vous, indépendant",
    structureWord: "votre activité",
    teamWord: "vous",
    tone: "accessible",
  },
};

const CABINET_THEME: AudienceTheme = {
  id: "cabinet",
  label: "Cabinet",
  shortPitch: "L'IA qui équipe votre cabinet, à 199€/an pour 10 utilisateurs.",
  primaryHex: "#1e3a5f",
  accentHex: "#d4af37",
  surfaceHex: "#f5f1e6",
  primaryBgClass: "bg-cabinet-primary",
  primaryTextClass: "text-cabinet-primary",
  accentBgClass: "bg-cabinet-accent",
  accentTextClass: "text-cabinet-accent",
  primaryHoverBgClass: "hover:bg-cabinet-primary-dark",
  accentHoverBgClass: "hover:bg-cabinet-accent-dark",
  heroGradientClass: "bg-gradient-to-b from-cabinet-surface to-white",
  primaryBorderClass: "border-cabinet-primary",
  primarySoftBgClass: "bg-cabinet-primary/10",
  headingFontClass: "font-serif",
  ctaText: "Demander une démo (30 min visio)",
  ctaHref: "/cabinet#contact",
  vocabulary: {
    youAddress: "votre cabinet",
    structureWord: "votre cabinet",
    teamWord: "votre équipe",
    tone: "premium",
  },
};

const THEMES: Record<Audience, AudienceTheme> = {
  solo: SOLO_THEME,
  cabinet: CABINET_THEME,
};

/**
 * Retourne le thème complet pour une audience donnée.
 * Helper pur, utilisable partout (server components, server actions, client).
 */
export function getAudienceTheme(audience: Audience): AudienceTheme {
  return THEMES[audience];
}

/** Liste exhaustive des audiences supportées. Pratique pour itérer. */
export const ALL_AUDIENCES: Audience[] = ["solo", "cabinet"];

// ---------------------------------------------------------------------------
// Contexte React (client-only)
// ---------------------------------------------------------------------------

interface AudienceContextValue {
  audience: Audience;
  setAudience: (audience: Audience) => void;
  theme: AudienceTheme;
}

const AudienceContext = createContext<AudienceContextValue | null>(null);

interface AudienceProviderProps {
  /** Audience initiale (défaut: "solo"). */
  initial?: Audience;
  children: ReactNode;
}

/**
 * Provider à monter en haut d'une page client pour partager l'audience
 * sélectionnée entre tous les composants enfants.
 */
export function AudienceProvider({
  initial = "solo",
  children,
}: AudienceProviderProps) {
  const [audience, setAudience] = useState<Audience>(initial);
  const value = useMemo<AudienceContextValue>(
    () => ({ audience, setAudience, theme: getAudienceTheme(audience) }),
    [audience],
  );
  return createElement(AudienceContext.Provider, { value }, children);
}

/**
 * Hook pour accéder à l'audience courante depuis un composant enfant.
 * Throw si appelé hors d'un AudienceProvider.
 */
export function useAudience(): AudienceContextValue {
  const ctx = useContext(AudienceContext);
  if (!ctx) {
    throw new Error("useAudience() doit être appelé dans un <AudienceProvider>.");
  }
  return ctx;
}
