import Link from "next/link";
import {
  Building2,
  Landmark,
  Briefcase,
  MapPin,
  Search,
  Rss,
  Globe,
  Check,
  X,
  Clock,
  ExternalLink,
} from "lucide-react";

interface Source {
  name: string;
  fullName?: string;
  url: string;
  type: string;
  status: string;
  description: string;
  frequency: string;
  articles: string;
}

interface SourceCategory {
  title: string;
  description: string;
  icon: React.ReactNode;
  sources: Source[];
}

function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">VF</span>
            </div>
            <span className="font-bold text-lg text-gray-900">
              Cipia
            </span>
          </Link>
          <Link
            href="/connexion"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary-dark transition-colors"
          >
            Connexion
          </Link>
        </div>
      </div>
    </header>
  );
}

const sourceCategories = [
  {
    title: "Sources officielles",
    description: "APIs et portails officiels de l'État français",
    icon: <Landmark className="w-6 h-6" />,
    sources: [
      {
        name: "BOAMP",
        fullName: "Bulletin Officiel des Annonces des Marchés Publics",
        url: "https://www.boamp.fr",
        type: "API officielle",
        status: "OK",
        description:
          "Tous les appels d'offres publics de France. Filtré sur le code CPV 80500000 (services de formation).",
        frequency: "Quotidienne",
        articles: "~90/jour",
      },
      {
        name: "Légifrance",
        fullName: "Service public de la diffusion du droit",
        url: "https://www.legifrance.gouv.fr",
        type: "RSS + API PISTE",
        status: "OK",
        description:
          "Décrets, arrêtés, décisions et textes réglementaires relatifs à la formation professionnelle.",
        frequency: "Quotidienne",
        articles: "~200/jour",
      },
      {
        name: "France Compétences",
        fullName: "Autorité nationale de financement et de régulation de la formation professionnelle",
        url: "https://www.francecompetences.fr",
        type: "Playwright (JS)",
        status: "OK",
        description:
          "Actualités et décisions de France Compétences : certifications, RNCP, Répertoire national.",
        frequency: "Quotidienne",
        articles: "~8/jour",
      },
    ],
  },
  {
    title: "OPCO (Opérateurs de Compétences)",
    description: "Les 11 OPCO français - sources sectorielles",
    icon: <Briefcase className="w-6 h-6" />,
    sources: [
      {
        name: "AKTO",
        fullName: "OPCO des services interentreprises",
        url: "https://www.akto.fr",
        type: "Scraper HTML",
        status: "OK",
        description: "Appels d'offres et financements formation.",
        frequency: "Quotidienne",
        articles: "~8/jour",
      },
      {
        name: "OPCO Sante",
        fullName: "OPCO de la santé",
        url: "https://www.opco-sante.fr",
        type: "Scraper HTML",
        status: "OK",
        description: "Appels d'offres secteur santé.",
        frequency: "Quotidienne",
        articles: "2-5/jour",
      },
      {
        name: "Uniformation",
        fullName: "OPCO de l'économie sociale et solidaire",
        url: "https://www.uniformation.fr",
        type: "HTML + RSS",
        status: "OK",
        description: "Appels d'offres et dispositifs ESS.",
        frequency: "Quotidienne",
        articles: "2-4/jour",
      },
      {
        name: "OPCO 2i",
        fullName: "OPCO des industries",
        url: "https://www.opco2i.fr",
        type: "RSS + Playwright",
        status: "OK",
        description: "Appels d'offres secteur industriel.",
        frequency: "Quotidienne",
        articles: "5-10/jour",
      },
      {
        name: "L'OPCOMMERCE",
        fullName: "OPCO du commerce",
        url: "https://www.lopcommerce.com",
        type: "Scraper HTML",
        status: "OK",
        description: "Appels d'offres secteur commerce.",
        frequency: "Quotidienne",
        articles: "1-3/jour",
      },
      {
        name: "OPCO EP",
        fullName: "OPCO de l'entreprise et de la profession",
        url: "https://www.opcoep.fr",
        type: "Scraper HTML",
        status: "PARTIEL",
        description: "Marchés publics OPCO EP.",
        frequency: "Quotidienne",
        articles: "Variable",
      },
      {
        name: "ATLAS",
        fullName: "OPCO ATLAS",
        url: "https://www.opco-atlas.fr",
        type: "-",
        status: "BLOQUE",
        description: "Site inaccessible (timeout/SSL).",
        frequency: "-",
        articles: "0",
      },
      {
        name: "Constructys",
        fullName: "OPCO de la construction",
        url: "https://www.constructys.fr",
        type: "-",
        status: "BLOQUE",
        description: "Site inaccessible (timeout).",
        frequency: "-",
        articles: "0",
      },
      {
        name: "OCAPIAT",
        fullName: "OPCO de l'agriculture",
        url: "https://www.ocapiat.fr",
        type: "-",
        status: "BLOQUE",
        description: "Page AAP introuvable (404).",
        frequency: "-",
        articles: "0",
      },
      {
        name: "OPCO Mobilites",
        fullName: "OPCO des mobilités",
        url: "https://www.opcomobilites.fr",
        type: "-",
        status: "BLOQUE",
        description: "Site inaccessible (timeout).",
        frequency: "-",
        articles: "0",
      },
      {
        name: "AFDAS",
        fullName: "OPCO de la culture",
        url: "https://www.afdas.com",
        type: "-",
        status: "BLOQUE",
        description: "Redirection externe, page 404.",
        frequency: "-",
        articles: "0",
      },
    ],
  },
  {
    title: "Conseils Régionaux",
    description: "Appels à projets des régions françaises",
    icon: <MapPin className="w-6 h-6" />,
    sources: [
      {
        name: "Île-de-France",
        url: "https://www.iledefrance.fr",
        type: "Playwright (JS)",
        status: "OK",
        description: "Aides et appels à projets formation Île-de-France.",
        frequency: "Quotidienne",
        articles: "~60/jour",
      },
      {
        name: "Auvergne-Rhône-Alpes",
        url: "https://www.auvergnerhonealpes.fr",
        type: "Playwright (JS)",
        status: "OK",
        description: "Appels à projets régionaux.",
        frequency: "Quotidienne",
        articles: "Variable",
      },
      {
        name: "Nouvelle-Aquitaine",
        url: "https://www.nouvelle-aquitaine.fr",
        type: "Playwright (JS)",
        status: "OK",
        description: "Appels à projets régionaux.",
        frequency: "Quotidienne",
        articles: "Variable",
      },
      {
        name: "Occitanie",
        url: "https://www.laregion.fr",
        type: "Playwright (JS)",
        status: "OK",
        description: "Appels à projets régionaux.",
        frequency: "Quotidienne",
        articles: "Variable",
      },
      {
        name: "Grand Est",
        url: "https://www.grandest.fr",
        type: "Playwright (JS)",
        status: "OK",
        description: "Appels à projets régionaux.",
        frequency: "Quotidienne",
        articles: "Variable",
      },
    ],
  },
  {
    title: "France Travail",
    description: "Ancien Pôle Emploi - offres et actualités",
    icon: <Building2 className="w-6 h-6" />,
    sources: [
      {
        name: "France Travail",
        fullName: "Recherche globale",
        url: "https://www.francetravail.fr",
        type: "Playwright (JS)",
        status: "OK",
        description:
          "Recherche d'appels à projets et financements formation via le moteur de recherche.",
        frequency: "Quotidienne",
        articles: "Variable",
      },
    ],
  },
  {
    title: "Agrégateurs",
    description: "Portails agrégant les marchés publics",
    icon: <Search className="w-6 h-6" />,
    sources: [
      {
        name: "France Marchés",
        url: "https://www.francemarches.com",
        type: "Scraper HTML",
        status: "PARTIEL",
        description: "Agrégateur de marchés publics.",
        frequency: "Quotidienne",
        articles: "Variable",
      },
      {
        name: "E-Marches Publics",
        url: "https://www.e-marchespublics.com",
        type: "Scraper HTML",
        status: "PARTIEL",
        description: "Agrégateur de marchés publics.",
        frequency: "Quotidienne",
        articles: "Variable",
      },
    ],
  },
];

function StatusBadge({ status }: { status: string }) {
  if (status === "OK") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-medium">
        <Check className="w-3 h-3" />
        Actif
      </span>
    );
  }
  if (status === "PARTIEL") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
        <Clock className="w-3 h-3" />
        Partiel
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
      <X className="w-3 h-3" />
      Bloqué
    </span>
  );
}

function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">VF</span>
            </div>
            <span className="font-semibold text-gray-300">
              Cipia
            </span>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <p>&copy; 2026 Cipia &mdash; SJA Digital</p>
          <div className="flex items-center gap-6">
            <Link href="/mentions-legales" className="hover:text-white transition-colors">
              Mentions légales
            </Link>
            <Link href="/confidentialite" className="hover:text-white transition-colors">
              Confidentialité
            </Link>
            <Link href="/sources" className="text-white font-medium">
              Sources
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function SourcesPage() {
  const totalActive = sourceCategories.reduce(
    (acc, cat) =>
      acc + cat.sources.filter((s) => s.status === "OK").length,
    0
  );
  const totalSources = sourceCategories.reduce(
    (acc, cat) => acc + cat.sources.length,
    0
  );

  return (
    <>
      <Header />
      <main className="pt-20">
        {/* Hero */}
        <section className="py-16 bg-gradient-to-b from-blue-50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Globe className="w-4 h-4" />
                Transparence des données
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
                Nos sources de données
              </h1>
              <p className="text-lg text-gray-600 mb-6">
                Nous collectons automatiquement les informations depuis{" "}
                <strong>{totalActive} sources actives</strong> sur {totalSources}{" "}
                sources monitorées. Toutes les données proviennent de sources
                officielles et publiques.
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm">
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200">
                  <Landmark className="w-4 h-4 text-primary" />
                  <span>3 sources officielles</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200">
                  <Briefcase className="w-4 h-4 text-primary" />
                  <span>6 OPCO actifs / 11</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>5 régions</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Sources by category */}
        {sourceCategories.map((category, catIndex) => (
          <section
            key={catIndex}
            className={catIndex % 2 === 0 ? "py-16 bg-white" : "py-16 bg-gray-50"}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="text-primary">{category.icon}</div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {category.title}
                </h2>
              </div>
              <p className="text-gray-600 mb-8">{category.description}</p>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {category.sources.map((source, srcIndex) => (
                  <div
                    key={srcIndex}
                    className="p-5 bg-white rounded-xl border border-gray-200 hover:border-primary/30 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-gray-900">{source.name}</h3>
                        {"fullName" in source && source.fullName && (
                          <p className="text-sm text-gray-500">{source.fullName}</p>
                        )}
                      </div>
                      <StatusBadge status={source.status} />
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      {source.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Rss className="w-3 h-3" />
                        {source.type}
                      </span>
                      <span>•</span>
                      <span>{source.frequency}</span>
                      {source.articles && (
                        <>
                          <span>•</span>
                          <span>{source.articles}</span>
                        </>
                      )}
                    </div>
                    {source.url && source.status !== "BLOQUE" && (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-3 text-sm text-primary hover:underline"
                      >
                        Visiter le site
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}

        {/* Methodology */}
        <section className="py-16 bg-primary">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">
              Méthodologie de collecte
            </h2>
            <div className="text-blue-100 space-y-4 text-left">
              <p>
                <strong className="text-white">Collecte quotidienne :</strong>{" "}
                Chaque jour à 6h00, nos scripts parcourent automatiquement toutes les
                sources actives pour extraire les nouvelles publications.
              </p>
              <p>
                <strong className="text-white">Filtrage intelligent :</strong>{" "}
                Seuls les textes pertinents pour la formation professionnelle sont
                conservés (mots-clés, codes CPV, classifications).
              </p>
              <p>
                <strong className="text-white">Analyse IA :</strong>{" "}
                Chaque article est analysé par Claude (Anthropic) pour générer un
                résumé et une classification selon les indicateurs Qualiopi 23-26.
              </p>
              <p>
                <strong className="text-white">Dédoublonnage :</strong>{" "}
                Un système de hachage MD5 garantit qu&apos;un même article n&apos;est
                jamais inséré deux fois en base.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-gray-900">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">
              Questions sur nos sources ?
            </h2>
            <p className="text-gray-400 mb-6">
              Nous sommes transparents sur l&apos;origine de nos données. Contactez-nous
              pour toute question.
            </p>
            <Link
              href="/connexion"
              className="inline-flex items-center px-6 py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark transition-colors"
            >
              Accéder au dashboard
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
