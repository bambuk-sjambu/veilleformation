import Link from "next/link";
import { ArrowRight, Check, Mail, Sparkles } from "lucide-react";
import type { SectorConfig } from "@/config";
import { getSectorConfig } from "@/config";
import { getSectorMeta, ALL_SECTOR_IDS } from "@/lib/sector-meta";

/**
 * Landing page sectorielle (pivot X.3.b).
 * Une seule implémentation, 5 instances : /qualiopi, /haccp, /medical,
 * /avocats, /experts-comptables. Utilise la config JSON du secteur + la
 * SectorMeta (couleurs / nom court / emoji) pour adapter visuel et copy.
 */

interface SectorContent {
  hero: {
    eyebrow: string;
    headline: string;
    subline: string;
  };
  features: {
    title: string;
    body: string;
  }[];
  sources: string[];
}

// Contenu rédactionnel par secteur. Source de vérité = ce dictionnaire.
// Pour étendre, ajouter une entrée + le JSON de config + la SectorMeta.
const SECTOR_CONTENT: Record<string, SectorContent> = {
  cipia: {
    hero: {
      eyebrow: "Pour les organismes de formation Qualiopi",
      headline: "La veille Qualiopi qui se fait toute seule.",
      subline:
        "Indicateurs 23 à 26, décrets formation, appels d'offres OPCO et France Travail, alertes France Compétences. L'IA Anthropic Claude lit, résume et classe à votre place — vous arrivez à votre audit avec un PDF prêt.",
    },
    features: [
      {
        title: "Indicateurs 23 à 26",
        body: "Veille légale, métiers/emplois, innovations pédagogiques, handicap. Chaque texte tagué par indicateur Qualiopi. Audit clé en main.",
      },
      {
        title: "Appels d'offres OPCO",
        body: "BOAMP + 5 OPCO sectoriels (AKTO, OPCO 2i, Santé, OPCOMMERCE, Uniformation). Date limite, montant, région — triés par pertinence pour votre catalogue.",
      },
      {
        title: "Audit Qualiopi en 1 clic",
        body: "Export PDF avec votre logo, indicateurs renseignés, preuves de veille datées. Présentez-le tel quel à votre auditeur.",
      },
    ],
    sources: [
      "Légifrance (JORF, décrets, arrêtés)",
      "BOAMP (appels d'offres publics)",
      "Centre Inffo (actualité formation)",
      "France Compétences (référentiels Qualiopi)",
      "5 OPCO sectoriels (AAP)",
    ],
  },
  haccp: {
    hero: {
      eyebrow: "Pour les restaurateurs, boulangers, traiteurs et industriels",
      headline: "Toute la veille HACCP filtrée par IA, dans votre boîte mail.",
      subline:
        "Décrets DGAL, arrêtés DGCCRF, alertes RappelConso et RASFF, principes HACCP appliqués. Concentrez-vous sur votre cuisine — l'IA s'occupe de la réglementation.",
    },
    features: [
      {
        title: "Décrets DGAL",
        body: "Direction générale de l'alimentation : tous les arrêtés et notes de service, dès leur publication au JORF.",
      },
      {
        title: "Alertes RappelConso",
        body: "Le système d'alerte officiel DGCCRF : retraits/rappels en temps réel, filtrés sur votre activité (viande, lait, poisson, BIO, allergènes).",
      },
      {
        title: "Audit DGCCRF prêt",
        body: "PDF avec preuve de veille datée pour votre prochain contrôle d'hygiène. Chaque texte sourcé et expliqué.",
      },
    ],
    sources: [
      "RappelConso (DGCCRF + DGAL)",
      "Légifrance (décrets alimentaires)",
      "JORF (arrêtés DGAL)",
      "EFSA / RASFF (alertes européennes)",
      "ANSES (avis sanitaires)",
    ],
  },
  medical: {
    hero: {
      eyebrow: "Pour les médecins, kinés, ostéos, infirmiers libéraux",
      headline: "La veille médicale réglementaire, sans avoir à lire l'ANSM.",
      subline:
        "Alertes ANSM, recommandations HAS, conventions Sécurité Sociale, déontologie Ordre. L'IA suit chaque texte officiel pour vous — vous voyez en 30 secondes par semaine ce qui change pour votre exercice.",
    },
    features: [
      {
        title: "Alertes ANSM",
        body: "Sécurité du médicament, retraits de lots, ruptures de stock, vigilances. 3 flux RSS officiels agrégés, classés par criticité.",
      },
      {
        title: "Recommandations HAS",
        body: "Bonnes pratiques cliniques, évaluations technologies santé, parcours patient. L'IA résume chaque publication HAS.",
      },
      {
        title: "Conventions et nomenclature",
        body: "Avenants, NGAP/CCAM, lettres-clés. Vous savez instantanément ce qui change pour votre cotation et votre rémunération.",
      },
    ],
    sources: [
      "ANSM (médicaments, dispositifs, vigilances)",
      "HAS (recommandations cliniques)",
      "Légifrance (Code santé publique)",
      "JORF (conventions, nomenclatures)",
      "Ordre professionnel (déontologie)",
    ],
  },
  avocats: {
    hero: {
      eyebrow: "Pour les avocats indépendants et petits cabinets",
      headline: "La veille jurisprudence + déontologie qui tient sur un thé.",
      subline:
        "Décisions Cassation, jurisprudence Conseil d'État, règles déontologiques CNB, conventions avocat-client. L'IA Anthropic Claude lit chaque arrêt et vous résume ce qui s'applique à vos dossiers.",
    },
    features: [
      {
        title: "Cassation & Conseil d'État",
        body: "Toutes les décisions publiées sur Judilibre, classées par chambre et matière. Filtrage par mots-clés sur vos spécialités (droit du travail, famille, pénal, affaires).",
      },
      {
        title: "Déontologie CNB",
        body: "Règlement intérieur national, avis du Conseil National des Barreaux, recommandations ordinales. Vous suivez sans avoir à lire les bulletins.",
      },
      {
        title: "Veille pour vos confrères",
        body: "Plan d'action automatisé : chaque arrêt à fort impact devient une fiche prête à partager en réunion de cabinet ou avec vos clients.",
      },
    ],
    sources: [
      "Judilibre (Cour de cassation, Cour d'appel)",
      "Légifrance (codes, décrets)",
      "Conseil d'État (arrêts publiés)",
      "CNB (règlement intérieur, avis)",
      "Conseils de l'Ordre",
    ],
  },
  "experts-comptables": {
    hero: {
      eyebrow: "Pour les experts-comptables indépendants",
      headline: "La veille BOFiP + URSSAF qui rend votre semaine 4h plus courte.",
      subline:
        "BOFiP (DGFiP), avenants URSSAF, normes OEC, jurisprudence fiscale. L'IA suit chaque publication officielle, résume l'impact sur vos clients et génère le PDF que vous envoyez en RDV.",
    },
    features: [
      {
        title: "BOFiP en temps réel",
        body: "50 dernières actus + rescrits + publications DGFiP, classées par impôt (IR, IS, TVA, IFI). Notification dès qu'un texte change pour vos clients.",
      },
      {
        title: "URSSAF & social",
        body: "Avenants conventions collectives, taux de cotisation, exonérations Madelin. Vous bouclez vos paies en totale clarté.",
      },
      {
        title: "Note de synthèse client",
        body: "Pour chaque texte à fort impact, l'IA génère une note d'1 page que vous envoyez à votre client. Personnalisable avec votre logo.",
      },
    ],
    sources: [
      "BOFiP (Bulletin officiel des finances publiques)",
      "URSSAF (avenants, taux)",
      "Légifrance (Code général des impôts)",
      "OEC (normes professionnelles)",
      "Légifiscal (jurisprudence)",
    ],
  },
};

export default function SectorLandingPage({ sectorId }: { sectorId: string }) {
  const config: SectorConfig = getSectorConfig(sectorId);
  const meta = getSectorMeta(sectorId);
  const content =
    SECTOR_CONTENT[sectorId] || SECTOR_CONTENT.cipia;

  // Style inline dynamique pour appliquer la palette du secteur
  const sectorVars = {
    "--color-primary": meta.primary,
    "--color-primary-dark": meta.primaryDark,
    "--color-accent": meta.accent,
  } as React.CSSProperties;

  return (
    <main className="min-h-screen bg-white" style={sectorVars}>
      {/* Bande sectorielle */}
      <div
        className="h-1 w-full"
        style={{
          background: `linear-gradient(90deg, ${meta.primary} 0%, ${meta.primaryDark} 60%, ${meta.accent} 100%)`,
        }}
      />

      {/* Header minimal */}
      <header
        className="border-b"
        style={{ backgroundColor: "white", borderColor: meta.surface }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: meta.primary }}
            >
              C
            </div>
            <span className="font-bold text-lg text-gray-900">
              {meta.shortLabel}
            </span>
            <span className="text-2xl">{meta.emoji}</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/connexion"
              className="hidden sm:inline-flex text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Connexion
            </Link>
            <Link
              href={`/inscription?secteur=${sectorId}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: meta.primary }}
            >
              Commencer gratuitement
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section
        className="py-16 sm:py-24"
        style={{
          background: `linear-gradient(180deg, ${meta.surface} 0%, white 100%)`,
        }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6 uppercase tracking-wide"
            style={{
              backgroundColor: meta.primary,
              color: "white",
            }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {content.hero.eyebrow}
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
            {content.hero.headline}
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-10">
            {content.hero.subline}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href={`/inscription?secteur=${sectorId}`}
              className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-lg text-white font-semibold text-base shadow-lg transition-opacity hover:opacity-90"
              style={{
                backgroundColor: meta.primary,
                boxShadow: `0 10px 25px -5px ${meta.primary}40`,
              }}
            >
              Essayer gratuitement
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/exemple-newsletter"
              className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-lg border font-semibold text-base text-gray-700 hover:bg-gray-50"
              style={{ borderColor: meta.primary, color: meta.primaryDark }}
            >
              <Mail className="w-4 h-4" />
              Voir un exemple
            </Link>
          </div>
          <p className="mt-6 text-sm text-gray-500">
            Newsletter hebdo gratuite — Solo 39€/an — Cabinet 199€/an. Essai
            14 jours sans carte bancaire.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-12">
            Ce que {meta.shortLabel} suit pour vous
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {content.features.map((feat, i) => (
              <div
                key={i}
                className="p-6 rounded-xl border-2"
                style={{ borderColor: meta.surface, backgroundColor: "white" }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: meta.surface, color: meta.primary }}
                >
                  <Check className="w-5 h-5" />
                </div>
                <h3
                  className="font-bold text-lg mb-2"
                  style={{ color: meta.primaryDark }}
                >
                  {feat.title}
                </h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  {feat.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sources */}
      <section
        className="py-16 sm:py-20"
        style={{ backgroundColor: meta.surface }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            className="text-2xl sm:text-3xl font-bold text-center mb-10"
            style={{ color: meta.primaryDark }}
          >
            Les sources officielles que nous suivons
          </h2>
          <div className="grid sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
            {content.sources.map((src, i) => (
              <div
                key={i}
                className="flex items-start gap-2 p-3 rounded-lg bg-white"
              >
                <Check
                  className="w-5 h-5 flex-shrink-0 mt-0.5"
                  style={{ color: meta.primary }}
                />
                <span className="text-sm text-gray-700">{src}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-600 mt-8">
            Pas la source que vous voulez suivre ?{" "}
            <Link
              href="/sources"
              className="font-medium hover:underline"
              style={{ color: meta.primaryDark }}
            >
              Voir toutes les sources Cipia
            </Link>
          </p>
        </div>
      </section>

      {/* CTA bottom */}
      <section className="py-16 sm:py-20 bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Prêt à essayer {meta.shortLabel} ?
          </h2>
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
            14 jours d&apos;essai. Pas de carte bancaire pour la newsletter
            gratuite. Annulation en 1 clic depuis votre dashboard.
          </p>
          <Link
            href={`/inscription?secteur=${sectorId}`}
            className="inline-flex items-center gap-2 px-7 py-4 rounded-lg text-white font-semibold text-base shadow-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: meta.accent, color: meta.ink }}
          >
            Créer mon compte {meta.shortLabel}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer avec liens vers les autres secteurs */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid sm:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: meta.primary }}
                >
                  C
                </div>
                <span className="font-bold text-gray-900">{meta.shortLabel}</span>
              </div>
              <p className="text-sm text-gray-600 max-w-md">
                Cipia, la veille réglementaire automatisée par IA pour les
                indépendants et cabinets. {config.brand.legalName}.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                Cipia pour votre métier
              </p>
              <ul className="space-y-2">
                {ALL_SECTOR_IDS.filter((id) => id !== sectorId).map((id) => {
                  const m = getSectorMeta(id);
                  const slug =
                    id === "cipia"
                      ? "/qualiopi"
                      : `/${id}`;
                  return (
                    <li key={id}>
                      <Link
                        href={slug}
                        className="text-sm text-gray-700 hover:text-gray-900 inline-flex items-center gap-2"
                      >
                        <span>{m.emoji}</span>
                        <span>{m.shortLabel}</span>
                        <span className="text-gray-400">— {m.longLabel}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-10 pt-6 flex flex-col sm:flex-row gap-4 justify-between text-xs text-gray-500">
            <p>&copy; {new Date().getFullYear()} Cipia. Tous droits réservés.</p>
            <div className="flex gap-4 flex-wrap">
              <Link href="/cgu" className="hover:text-gray-700">CGU</Link>
              <Link href="/cgv" className="hover:text-gray-700">CGV</Link>
              <Link href="/mentions-legales" className="hover:text-gray-700">
                Mentions légales
              </Link>
              <Link href="/confidentialite" className="hover:text-gray-700">
                Confidentialité
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
