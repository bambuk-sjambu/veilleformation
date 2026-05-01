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
  /** Hint compact injecté dans le prompt IA (ex: "veille legale/reglementaire").
   *  Permet de contrôler finement le prompt sans toucher au code. */
  promptHint: string;
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

export interface AuditPdfSectionsConfig {
  /** Titre de la section "Résumé Exécutif". */
  summary: string;
  /** Titre de la section "Répartition par niveau d'impact". */
  impactDistribution: string;
  /** Titre de la section "Sources de Veille". */
  sources: string;
  /** Titre de la section "Méthodologie de Veille". */
  methodology: string;
  /** Titre de la page "Actions Menées". */
  actions: string;
  /** Titre de la page "Détail par Indicateur". */
  detailByIndicator: string;
}

export interface AuditPdfSummaryLabelsConfig {
  /** Ex: "Articles surveillés". */
  articles: string;
  /** Ex: "Actions complétées". */
  actionsDone: string;
  /** Ex: "En cours". */
  actionsInProgress: string;
  /** Ex: "À faire". */
  actionsTodo: string;
  /** Template avec {indicatorId}, ex: "Ind. {indicatorId}". */
  firstIndicator: string;
}

export interface AuditPdfImpactLabelsConfig {
  fort: string;
  moyen: string;
  faible: string;
}

export interface AuditPdfActionStatusLabelsConfig {
  /** Templates avec {count}. */
  done: string;
  inProgress: string;
  todo: string;
}

export interface AuditPdfSignatureLabelsConfig {
  /** Ex: "Le responsable veille". */
  responsibleRole: string;
  /** Ex: "Le directeur". */
  directorRole: string;
  /** Ex: "Nom et signature". */
  nameAndSignaturePlaceholder: string;
}

export interface AuditPdfConfig {
  /** Titre principal sur la page de garde (ex: "Rapport de Veille Réglementaire"). */
  coverTitle: string;
  /** Sous-titre cover. Placeholders: {regulatorName} {firstIndicatorId} {lastIndicatorId}. */
  coverSubtitle: string;
  /** Texte de bas de page de cover. Placeholders: {brandName}. */
  coverFooter: string;
  /** Titre du rapport (header de chaque page de contenu). Placeholders: {regulatorName}. */
  reportTitle: string;
  /** Footer page principale (longue). Placeholders: {brandName} {regulatorName}. */
  pageFooter: string;
  /** Footer pages secondaires (courte). Placeholders: {brandName}. */
  pageFooterShort: string;
  sections: AuditPdfSectionsConfig;
  summaryLabels: AuditPdfSummaryLabelsConfig;
  impactLabels: AuditPdfImpactLabelsConfig;
  actionStatusLabels: AuditPdfActionStatusLabelsConfig;
  signatureLabels: AuditPdfSignatureLabelsConfig;
  /** Labels lisibles des sources (clé = `articles.source` en DB). */
  sourceLabels: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Newsletter (email hebdomadaire) — A.6
// ---------------------------------------------------------------------------

export interface NewsletterSectionConfig {
  /** Titre de la section (ex: "Veille réglementaire"). */
  title: string;
  /** Sous-titre / hint sous le titre (ex: "Indicateur 23 Qualiopi").
   *  Peut être vide. Placeholders : {count}. */
  subtitle: string;
  /** Texte du lien "lire" sous chaque article (ex: "Lire le texte original →"). */
  readMoreLabel: string;
}

export interface NewsletterAoLabelsConfig {
  /** Label "Limite :" devant la date limite. */
  deadline: string;
  /** Label "Montant :" devant le montant estimé. */
  amount: string;
  /** Label "Région :" devant la région. */
  region: string;
  /** Label "Score :" devant le score de pertinence. */
  score: string;
}

export interface NewsletterFooterConfig {
  /** Texte du bloc disclaimer (peut contenir <br/>). */
  disclaimer: string;
  /** Label du lien de désabonnement. */
  unsubscribeLabel: string;
  /** URL de désabonnement (template avec {unsubscribeToken}). */
  unsubscribeUrlTemplate: string;
  /** Label du lien contact. */
  contactLabel: string;
  /** Email de contact (template avec {domain}). */
  contactEmail: string;
  /** Label du lien vers le site. */
  siteLabel: string;
  /** URL du site (template avec {domain}). */
  siteUrl: string;
}

export interface NewsletterStatBlockConfig {
  /** Label en haut du bloc "chiffre de la semaine" (ex: "Le chiffre de la semaine"). */
  label: string;
  /** Légende sous le chiffre. Placeholders: {regulatorName}. */
  caption: string;
}

export interface NewsletterCtaConfig {
  /** Texte du bouton principal CTA en bas du mail. */
  label: string;
  /** URL de destination (template avec {domain}). */
  urlTemplate: string;
}

export interface NewsletterSubjectConfig {
  /** Template du sujet. Placeholders : {brandName} {edition} {nbTextes} {textesPlural} {nbAo} {aoPlural}. */
  template: string;
  /** Préfixe ajouté quand un article fort impact est présent (ex: "⚠️ Impact fort — "). */
  highImpactPrefix: string;
}

export interface NewsletterHeaderConfig {
  /** Titre principal du header (en gros, ex: "Cipia"). */
  title: string;
  /** Sous-titre du header avec édition + dates.
   *  Placeholders : {edition} {dateStart} {dateEnd}. */
  editionLine: string;
  /** Label du lien "Voir en ligne". */
  viewOnlineLabel: string;
}

export interface NewsletterConfig {
  /** Configuration du sujet d'email. */
  subject: NewsletterSubjectConfig;
  /** Header (haut du mail). */
  header: NewsletterHeaderConfig;
  /** Paragraphe d'intro juste sous le header.
   *  Placeholders : {audience}. Peut contenir <br/>. */
  intro: string;
  /** Sections principales — clés alignées avec les categories DB. */
  sections: {
    reglementaire: NewsletterSectionConfig;
    ao: NewsletterSectionConfig;
    metier: NewsletterSectionConfig;
    handicap: NewsletterSectionConfig;
  };
  /** Pluriel de l'unité d'opportunité utilisé dans `sections.ao.subtitle`
   *  (ex: "opportunité"). Mis à part car invariant à l'AO et nécessite
   *  un test de pluriel automatique. */
  aoOpportunityWord: string;
  /** Labels du bloc "appels d'offres". */
  aoLabels: NewsletterAoLabelsConfig;
  /** Labels des badges d'impact. */
  impactLabels: AuditPdfImpactLabelsConfig;
  /** Bloc "le chiffre de la semaine". */
  statBlock: NewsletterStatBlockConfig;
  /** Bouton CTA principal. */
  cta: NewsletterCtaConfig;
  /** Footer (bas du mail). */
  footer: NewsletterFooterConfig;
}

export interface SectorConfig {
  /** ID stable du secteur (ex: "cipia", "haccp", "avocats"). */
  id: string;
  brand: BrandConfig;
  vocab: VocabConfig;
  taxonomy: TaxonomyConfig;
  audit_pdf: AuditPdfConfig;
  newsletter: NewsletterConfig;
}
