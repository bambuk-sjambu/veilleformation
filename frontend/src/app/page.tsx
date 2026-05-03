import Link from "next/link";
import {
  Brain,
  FileText,
  Clock,
  Mail,
  ClipboardCheck,
  UserPlus,
  Send,
  Download,
  Check,
  ChevronDown,
  Shield,
  Sparkles,
  Zap,
  BarChart3,
  ArrowRight,
  Briefcase,
} from "lucide-react";
import NewsletterForm from "@/components/NewsletterForm";
import AudienceSelector from "@/components/AudienceSelector";
import { sector } from "@/config";

const faqItems = [
  {
    question: `Qu'est-ce que ${sector.brand.name} ?`,
    answer:
      `${sector.brand.name} est un service de veille réglementaire automatisée par intelligence artificielle, conçu pour 596 000 indépendants et cabinets français. Nous couvrons 5 secteurs : organismes de formation Qualiopi, restauration/agroalimentaire (HACCP), médical libéral (kinés, médecins, ostéos), avocats indépendants et experts-comptables indépendants.`,
  },
  {
    question: "Comment fonctionne la veille automatique ?",
    answer:
      "Notre système collecte quotidiennement les sources officielles de votre secteur — Légifrance, BOAMP, JORF, RappelConso (DGCCRF), ANSM, BOFiP, Judilibre, Cassation, OPCO, France Travail, etc. L'IA Anthropic Claude analyse chaque texte, en produit un résumé et le classe selon la taxonomie de votre métier.",
  },
  {
    question: "Combien ça coûte ?",
    answer:
      "19€/an pour Cipia Solo (indépendants, TPE) — soit 50 fois moins cher que Lefebvre ou Dalloz qui facturent 800 à 5 000€/an. Pour les cabinets et structures, Cipia Cabinet à 199€/an pour 10 utilisateurs avec audit blanc-marque, white-label newsletter et API.",
  },
  {
    question: "La newsletter est-elle vraiment gratuite ?",
    answer:
      "Oui, le plan Newsletter vous donne accès à la newsletter hebdomadaire sur 1 secteur de votre choix, sans engagement et sans carte bancaire. Vous pouvez upgrader à Cipia Solo (19€/an) ou Cipia Cabinet (199€/an) à tout moment.",
  },
  {
    question: "Comment est générée la classification IA ?",
    answer:
      "Nous utilisons Claude (Anthropic), un modèle d'IA de dernière génération, pour analyser le contenu de chaque texte officiel et déterminer son rattachement à votre taxonomie métier — indicateurs Qualiopi 23-26 pour les OF, principes HACCP pour la restauration, recommandations HAS pour le médical, jurisprudences par chambre pour les avocats, BOFiP pour les experts-comptables.",
  },
  {
    question: "Puis-je exporter mes preuves pour l'audit ?",
    answer:
      "Oui, les plans Solo et Cabinet incluent l'export PDF de votre veille, formaté pour être présenté directement lors de votre audit Qualiopi, contrôle DDPP, audit HACCP, ou inspection sectorielle. Cipia Cabinet inclut en plus un audit blanc-marque avec votre logo.",
  },
  {
    question: "Comment résilier mon abonnement ?",
    answer:
      "Vous pouvez résilier votre abonnement à tout moment depuis votre espace Paramètres. La résiliation prend effet à la fin de la période en cours. Aucun engagement minimum n'est requis.",
  },
  {
    question: "Mes données sont-elles sécurisées ?",
    answer:
      "Oui, vos données sont hébergées en France, chiffrées en transit et au repos. Nous ne partageons jamais vos informations avec des tiers. Notre politique de confidentialité détaille l'ensemble de nos pratiques en matière de protection des données.",
  },
];

function JsonLd() {
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: sector.brand.name,
    url: `https://${sector.brand.domain}`,
    description:
      `Veille réglementaire automatisée par IA pour les ${sector.vocab.audience} certifiés ${sector.vocab.regulatorName}.`,
  };
  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: sector.brand.name,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: [
      { "@type": "Offer", price: "0", priceCurrency: "EUR", name: "Gratuit" },
      { "@type": "Offer", price: "15", priceCurrency: "EUR", name: "Solo" },
      {
        "@type": "Offer",
        price: "39",
        priceCurrency: "EUR",
        name: "Équipe",
      },
      { "@type": "Offer", price: "79", priceCurrency: "EUR", name: "Agence" },
    ],
  };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}

function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">{sector.brand.name.charAt(0)}</span>
            </div>
            <span className="font-bold text-lg text-gray-900">
              {sector.brand.name}
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

function Hero() {
  return (
    <section className="pt-12 pb-20 sm:pt-16 sm:pb-28 bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            Cipia Solo · IA · 5 secteurs réglementaires couverts
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
            Votre veille réglementaire,{" "}
            <span className="text-primary">livrée chaque mardi à 8h.</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Textes officiels, alertes et évolutions sectorielles classés par IA
            pour <strong className="text-gray-900">596 000 indépendants français</strong>.
            Gagnez 3h par semaine, présentez vos preuves en 1 clic.
          </p>

          <div className="mb-8 max-w-3xl mx-auto">
            <p className="text-base text-gray-700 mb-3 font-medium">
              Cipia couvre <strong>5 secteurs</strong> :
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
              {[
                { label: "Qualiopi", sub: "OF" },
                { label: "HACCP", sub: "Restos & agro" },
                { label: "Médical", sub: "Libéraux" },
                { label: "Avocats", sub: "Indépendants" },
                { label: "Experts-compt.", sub: "Indépendants" },
              ].map((v, i) => (
                <div
                  key={i}
                  className="px-3 py-2 rounded-lg bg-white border border-primary/20 shadow-sm"
                >
                  <div className="text-sm sm:text-base font-bold text-gray-900">
                    {v.label}
                  </div>
                  <div className="text-xs text-gray-500">{v.sub}</div>
                </div>
              ))}
            </div>
          </div>

          <NewsletterForm />
          <p className="text-sm text-gray-500 mt-3">
            Gratuit, sans carte bancaire. Désinscription en un clic.
          </p>
          <div className="mt-8 flex items-center justify-center flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span><strong className="text-gray-900">596 000</strong> pros français concernés</span>
            </div>
            <span className="text-gray-300 hidden sm:inline">·</span>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span><strong className="text-gray-900">660+</strong> textes analysés / sem</span>
            </div>
            <span className="text-gray-300 hidden sm:inline">·</span>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              <span>Hébergé en France</span>
            </div>
          </div>
        </div>

        <div className="mt-16 max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="bg-primary px-6 py-3 flex items-center gap-2">
              <Mail className="w-5 h-5 text-white" />
              <span className="text-white font-medium text-sm">
                Aperçu de votre newsletter
              </span>
            </div>
            <div className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span>De : {sector.brand.name}</span>
                <span>|</span>
                <span>Mardi 8h00</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                Votre veille {sector.vocab.regulatorName} - Semaine 11
              </h3>
              <div className="space-y-3">
                {[
                  {
                    badge: "Ind. 23",
                    color: "bg-blue-100 text-blue-800",
                    title:
                      "Décret n°2026-xxx : nouvelles obligations de traçabilité",
                    summary:
                      `Les ${sector.vocab.audience} doivent désormais conserver les preuves de veille pendant 5 ans...`,
                  },
                  {
                    badge: "Ind. 24",
                    color: "bg-green-100 text-green-800",
                    title:
                      "France Travail : mise à jour du répertoire des métiers en tension",
                    summary:
                      "12 nouveaux métiers ajoutés à la liste, impactant les parcours de formation...",
                  },
                  {
                    badge: "AO",
                    color: "bg-amber-100 text-amber-800",
                    title:
                      "BOAMP : Marché de formation numérique - Région Île-de-France",
                    summary:
                      "Budget : 450 000 EUR. Date limite : 15 avril 2026. CPV 80500000...",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <div className="flex items-start gap-2 mb-1">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded shrink-0 ${item.color}`}
                      >
                        {item.badge}
                      </span>
                      <span className="font-semibold text-gray-900 text-sm">
                        {item.title}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 ml-0 sm:ml-14">
                      {item.summary}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PainPoints() {
  const benefits = [
    {
      icon: <Clock className="w-8 h-8" />,
      title: "3 heures gagnées chaque semaine",
      description:
        "Légifrance, BOAMP, 11 OPCO, France Travail, 13 Régions : toutes les sources collectées et synthétisées pour vous.",
    },
    {
      icon: <Brain className="w-8 h-8" />,
      title: "Classification IA instantanée",
      description:
        "Chaque texte est automatiquement rattaché aux indicateurs 23, 24, 25 ou 26 par l'IA Claude, avec justification claire.",
    },
    {
      icon: <ClipboardCheck className="w-8 h-8" />,
      title: "Audit préparé en 1 clic",
      description:
        `Exportez un PDF daté et structuré qui prouve votre veille régulière aux auditeurs ${sector.vocab.regulatorName}.`,
    },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            La veille réglementaire sans effort
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            596 000 indépendants et cabinets français ont le même besoin :
            rester en règle. {sector.brand.name} le résout par IA en une
            newsletter hebdomadaire, secteur par secteur.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {benefits.map((b, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-blue-50 border border-blue-100"
            >
              <div className="text-primary mb-4">{b.icon}</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {b.title}
              </h3>
              <p className="text-gray-600">{b.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Solution() {
  const solutions = [
    {
      icon: <Clock className="w-8 h-8" />,
      title: "Sources élargies",
      description:
        "Légifrance, BOAMP, RappelConso, ANSM, BOFiP, Judilibre, Cassation, OPCO, France Travail : nous agrégeons les sources officielles de vos 5 secteurs.",
    },
    {
      icon: <Brain className="w-8 h-8" />,
      title: "Classification IA par taxonomie de votre secteur",
      description:
        "L'IA Anthropic Claude classe chaque texte selon la taxonomie de votre métier — indicateurs Qualiopi 23-26 pour les OF, principes HACCP, recommandations HAS, jurisprudence par chambre, BOFiP fiscal...",
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: "Export PDF prêt pour l'audit",
      description:
        "Générez un document PDF structuré, daté et complet, à présenter à votre auditeur Qualiopi, contrôle DDPP, audit HACCP, ou inspection ANSM selon votre secteur.",
    },
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            {sector.brand.name} automatise tout, peu importe votre secteur
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Concentrez-vous sur votre coeur de métier. On s&apos;occupe de la
            veille.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {solutions.map((sol, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="text-primary mb-4">{sol.icon}</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {sol.title}
              </h3>
              <p className="text-gray-600">{sol.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      number: "1",
      icon: <UserPlus className="w-6 h-6" />,
      title: "Inscrivez-vous",
      description: "Gratuit, 30 secondes. Aucune carte bancaire requise.",
    },
    {
      number: "2",
      icon: <Send className="w-6 h-6" />,
      title: "Recevez votre newsletter",
      description:
        "Chaque mardi à 8h, un résumé complet de la veille de la semaine.",
    },
    {
      number: "3",
      icon: <Download className="w-6 h-6" />,
      title: "Documentez votre veille",
      description:
        "Exportez le PDF de preuve, prêt à présenter lors de votre audit.",
    },
  ];

  return (
    <section className="py-20 bg-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Comment ça marche
          </h2>
          <p className="text-lg text-gray-600">
            En 3 étapes simples, votre veille réglementaire (Qualiopi, HACCP, médical, avocats ou EC) est en place.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((step, i) => (
            <div key={i} className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                {step.number}
              </div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-primary">{step.icon}</span>
                <h3 className="text-lg font-bold text-gray-900">
                  {step.title}
                </h3>
              </div>
              <p className="text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Preview() {
  return (
    <section className="py-20 bg-gradient-to-b from-white to-gray-50" id="apercu">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-blue-700 uppercase tracking-wider mb-2">Aperçu</p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Voyez l&apos;outil avant de vous inscrire
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Pas de pitch, juste l&apos;outil tel qu&apos;il fonctionne pour les pros
            qui l&apos;utilisent en 2026.
          </p>
        </div>

        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm">
            <Sparkles className="w-4 h-4" />
            Exemple ci-dessous : secteur OF Qualiopi. Disponible aussi pour HACCP, médical, avocats, experts-comptables.
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* Mockup 1 — Dashboard veille */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
            <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b border-gray-200">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
              <span className="ml-3 text-xs text-gray-600 font-mono">{sector.brand.domain}/dashboard/veille</span>
            </div>
            <div className="p-5 bg-gray-50 min-h-[260px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Veille de la semaine</h3>
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">752 articles</span>
              </div>
              <div className="space-y-2">
                <div className="bg-white p-3 rounded-lg border-l-4 border-red-500 shadow-sm">
                  <div className="flex items-start justify-between">
                    <span className="text-xs text-red-600 font-semibold">IMPACT FORT</span>
                    <span className="text-xs text-gray-400">Indicateur 23</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mt-1">Décret n°2026-259 sur la formation pro</p>
                  <p className="text-xs text-gray-500 mt-0.5">JORF · il y a 2 jours</p>
                </div>
                <div className="bg-white p-3 rounded-lg border-l-4 border-amber-500 shadow-sm">
                  <div className="flex items-start justify-between">
                    <span className="text-xs text-amber-600 font-semibold">IMPACT MOYEN</span>
                    <span className="text-xs text-gray-400">Indicateur 24</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mt-1">Évolution du référentiel ROME 4.0</p>
                  <p className="text-xs text-gray-500 mt-0.5">France Travail · il y a 4 jours</p>
                </div>
                <div className="bg-white p-3 rounded-lg border-l-4 border-green-500 shadow-sm">
                  <div className="flex items-start justify-between">
                    <span className="text-xs text-green-600 font-semibold">À EXPLOITER</span>
                    <span className="text-xs text-gray-400">Indicateur 25</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mt-1">Nouvelle méthodologie AFEST publiée</p>
                  <p className="text-xs text-gray-500 mt-0.5">Centre Inffo · il y a 5 jours</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mockup 2 — Plan d'action Qualiopi */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
            <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b border-gray-200">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
              <span className="ml-3 text-xs text-gray-600 font-mono">{sector.brand.domain}/dashboard/plan-action</span>
            </div>
            <div className="p-5 bg-gray-50 min-h-[260px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Plan d&apos;action {sector.vocab.regulatorName}</h3>
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Prêt audit</span>
              </div>
              <div className="space-y-2">
                <div className="bg-white p-3 rounded-lg shadow-sm flex items-center gap-3">
                  <input type="checkbox" checked readOnly className="w-4 h-4 text-green-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 line-through">Mise à jour module RGPD</p>
                    <p className="text-xs text-gray-500">Sophie · complété 12/04</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">Fait</span>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm flex items-center gap-3">
                  <input type="checkbox" readOnly className="w-4 h-4" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Refonte module IA générative</p>
                    <p className="text-xs text-gray-500">Marc · échéance 15/05</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">En cours</span>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm flex items-center gap-3">
                  <input type="checkbox" readOnly className="w-4 h-4" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Formation formateurs AFEST</p>
                    <p className="text-xs text-gray-500">Équipe pédagogique · 30/05</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded">À faire</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mockup 3 — Appels d'offres */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
            <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b border-gray-200">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
              <span className="ml-3 text-xs text-gray-600 font-mono">{sector.brand.domain}/dashboard/appels-offres</span>
            </div>
            <div className="p-5 bg-gray-50 min-h-[260px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Appels d&apos;offres formation</h3>
                <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded">155 AO actifs</span>
              </div>
              <div className="space-y-2">
                <div className="bg-white p-3 rounded-lg border-l-4 border-amber-500 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Formation cybersécurité 2026</p>
                      <p className="text-xs text-gray-500 mt-0.5">OPCO 2i · Ile-de-France</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded font-semibold">J-3</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span><strong className="text-gray-700">85 k€</strong> estimé</span>
                    <span>·</span>
                    <span>Score IA <strong className="text-gray-700">9/10</strong></span>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border-l-4 border-blue-500 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Bilan de compétences pour demandeurs d&apos;emploi</p>
                      <p className="text-xs text-gray-500 mt-0.5">BOAMP · Bourgogne-Franche-Comté</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-semibold">J-12</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span><strong className="text-gray-700">42 k€</strong> estimé</span>
                    <span>·</span>
                    <span>Score IA <strong className="text-gray-700">7/10</strong></span>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border-l-4 border-gray-300 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Formation linguistique salariés industrie</p>
                      <p className="text-xs text-gray-500 mt-0.5">AKTO · Auvergne-Rhône-Alpes</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded font-semibold">J-25</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span><strong className="text-gray-700">120 k€</strong> estimé</span>
                    <span>·</span>
                    <span>Score IA <strong className="text-gray-700">8/10</strong></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mockup 4 — Export PDF audit */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
            <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b border-gray-200">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
              <span className="ml-3 text-xs text-gray-600 font-mono">{sector.brand.domain}/dashboard/export</span>
            </div>
            <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-[260px] flex flex-col items-center justify-center text-center">
              <div className="w-32 h-40 bg-white rounded-lg shadow-md p-3 mb-4 flex flex-col">
                <div className="text-[8px] font-bold text-blue-700 mb-1">RAPPORT {sector.vocab.regulatorName.toUpperCase()}</div>
                <div className="text-[6px] text-gray-700 leading-tight">Veille réglementaire 2026</div>
                <div className="border-t border-gray-200 my-1"></div>
                <div className="space-y-0.5 flex-1">
                  <div className="h-1 bg-gray-300 rounded w-full"></div>
                  <div className="h-1 bg-gray-300 rounded w-5/6"></div>
                  <div className="h-1 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-2"></div>
                  <div className="h-1.5 bg-blue-200 rounded w-2/3"></div>
                  <div className="h-1 bg-gray-300 rounded w-full"></div>
                  <div className="h-1 bg-gray-300 rounded w-4/5"></div>
                </div>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Export PDF {sector.vocab.auditName}</h3>
              <p className="text-sm text-gray-600 max-w-xs">
                Rapport complet en 1 clic : sources surveillées, articles enrichis IA, plan d&apos;action,
                signatures.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Newsletter exemple */}
        <div className="bg-blue-700 rounded-2xl p-8 md:p-10 text-center text-white">
          <h3 className="text-2xl md:text-3xl font-bold mb-3">
            Curieux de la newsletter du mardi ?
          </h3>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            Lisez l&apos;édition la plus récente avant même de créer un compte. Pas d&apos;email demandé,
            pas de paywall.
          </p>
          <Link
            href="/exemple-newsletter"
            className="inline-flex items-center gap-2 bg-yellow-400 text-gray-900 font-bold px-6 py-3 rounded-lg hover:bg-yellow-300 transition"
          >
            Voir un exemple de newsletter →
          </Link>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const plans = [
    {
      name: "Newsletter",
      price: "0",
      period: "/an",
      description: "Pour découvrir, sans engagement",
      features: [
        "Newsletter hebdomadaire (mardi 8h)",
        "1 secteur au choix (Qualiopi, HACCP, médical, avocats ou EC)",
        "Résumés IA des textes officiels",
        "Désinscription en 1 clic",
      ],
      cta: "Recevoir la newsletter gratuite",
      ctaHref: "#newsletter",
      highlighted: false,
      sticker: null,
    },
    {
      name: "Cipia Solo",
      price: "19",
      period: "/an",
      perMonth: "soit 1,58€/mois",
      description: "Pour les indépendants et TPE — 50× moins cher que Lefebvre",
      features: [
        "Tous les secteurs (5 verticaux)",
        "Dashboard avec alertes mots-clés",
        "Export PDF audit avec votre nom",
        "Historique complet",
        "Support email 72h",
      ],
      cta: "Choisir Cipia Solo (19€/an)",
      ctaHref: "/inscription",
      highlighted: true,
      sticker: "Le meilleur prix du marché",
    },
    {
      name: "Cipia Cabinet",
      price: "199",
      period: "/an",
      perMonth: "10 utilisateurs inclus",
      description: "Pour les structures, cabinets et OF organisés",
      features: [
        "Tout Solo, partagé entre 10 utilisateurs",
        "Audit blanc-marque (PDF avec logo cabinet)",
        "White-label newsletter pour vos clients",
        "API d'intégration",
        "Support prioritaire 24h + onboarding visio",
      ],
      cta: "Voir Cipia Cabinet",
      ctaHref: "/cabinet",
      highlighted: false,
      sticker: null,
    },
  ];

  return (
    <section id="tarifs" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Tarifs simples, divisés par 50 vs le marché
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Lefebvre, Dalloz, Editions Législatives facturent 800 à 5 000€/an
            pour la veille réglementaire. Cipia industrialise par IA et reverse
            l&apos;économie au client.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`relative p-6 rounded-2xl border ${
                plan.highlighted
                  ? "border-primary bg-primary/5 ring-2 ring-primary shadow-lg"
                  : "border-gray-200 bg-white"
              }`}
            >
              {plan.sticker && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                  {plan.sticker}
                </div>
              )}
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                {plan.name}
              </h3>
              <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-gray-900">
                  {plan.price}&#8364;
                </span>
                <span className="text-gray-500">{plan.period}</span>
                {plan.perMonth && (
                  <p className="text-xs text-gray-500 mt-1">{plan.perMonth}</p>
                )}
                {plan.price !== "0" && (
                  <p className="text-xs text-gray-500 mt-2">
                    Sans engagement · Annulation en 1 clic
                  </p>
                )}
              </div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={plan.ctaHref}
                className={`block w-full text-center py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  plan.highlighted
                    ? "bg-yellow-400 text-black font-bold hover:bg-yellow-300"
                    : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  return (
    <section id="faq" className="py-20 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Questions fréquentes
          </h2>
        </div>
        <div className="space-y-4">
          {faqItems.map((item, i) => (
            <details
              key={i}
              className="group bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <summary className="flex items-center justify-between cursor-pointer p-5 font-medium text-gray-900 hover:bg-gray-50">
                <span>{item.question}</span>
                <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="px-5 pb-5 text-gray-600 leading-relaxed">
                {item.answer}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="py-20 bg-primary">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <Shield className="w-12 h-12 text-white/80 mx-auto mb-6" />
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Prêt à automatiser votre veille réglementaire ?
        </h2>
        <p className="text-lg text-blue-200 mb-8">
          Rejoignez les indépendants et TPE des 5 secteurs (Qualiopi, HACCP,
          médical, avocats, experts-comptables) qui gagnent du temps chaque
          semaine avec Cipia Solo.
        </p>
        <Link
          href="/inscription"
          className="inline-flex items-center px-8 py-4 rounded-lg bg-yellow-400 text-black font-bold text-lg hover:bg-yellow-300 transition-colors"
        >
          Découvrir Cipia Solo (19€/an)
        </Link>
        <p className="text-sm text-blue-300 mt-4">
          14 jours d&apos;essai gratuit. Sans engagement. Sans carte bancaire.
        </p>
      </div>
    </section>
  );
}

function CabinetCrossSell() {
  return (
    <section className="py-12 bg-cabinet-surface border-t border-cabinet-accent/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4 flex-1">
            <div className="w-12 h-12 rounded-full bg-cabinet-primary/10 flex items-center justify-center shrink-0">
              <Briefcase className="w-6 h-6 text-cabinet-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-cabinet-primary mb-1 font-serif">
                Vous êtes une structure ?
              </h3>
              <p className="text-sm text-gray-700">
                Cabinet d&apos;experts-comptables, OF Qualiopi multi-utilisateurs,
                cabinet d&apos;avocats, bureau ESG/RGE : découvrez Cipia Cabinet
                (199€/an, 10 utilisateurs, audit blanc-marque, support
                prioritaire).
              </p>
            </div>
          </div>
          <Link
            href="/cabinet"
            className="inline-flex items-center gap-2 bg-cabinet-primary text-white px-6 py-3 rounded-lg font-semibold text-sm hover:bg-cabinet-primary-dark transition-colors shrink-0"
          >
            Voir Cipia Cabinet
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">{sector.brand.name.charAt(0)}</span>
            </div>
            <span className="font-semibold text-gray-300">
              {sector.brand.name}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <BarChart3 className="w-4 h-4" />
            <span>596 000 indépendants et cabinets français en 5 secteurs</span>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <p>&copy; 2026 {sector.brand.name} &mdash; Haruna SARL</p>
          <div className="flex flex-wrap items-center gap-4 md:gap-6">
            <Link href="/mentions-legales" className="hover:text-white transition-colors">
              Mentions légales
            </Link>
            <Link href="/confidentialite" className="hover:text-white transition-colors">
              Confidentialité
            </Link>
            <Link href="/politique-donnees" className="hover:text-white transition-colors">
              Politique données
            </Link>
            <Link href="/cgu" className="hover:text-white transition-colors">
              CGU
            </Link>
            <Link href="/cgv" className="hover:text-white transition-colors">
              CGV
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function HomePage() {
  return (
    <>
      <JsonLd />
      <Header />
      <main className="pt-16">
        <AudienceSelector active="solo" variant="hero" />
        <Hero />
        <PainPoints />
        <Solution />
        <HowItWorks />
        <Preview />
        <Pricing />
        <FAQ />
        <FinalCTA />
        <CabinetCrossSell />
      </main>
      <Footer />
    </>
  );
}
