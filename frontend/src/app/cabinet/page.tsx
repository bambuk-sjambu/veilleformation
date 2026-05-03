import Link from "next/link";
import type { Metadata } from "next";
import {
  Brain,
  Calendar,
  Check,
  Clock,
  FileText,
  Mail,
  Shield,
  Sparkles,
  Users,
  Zap,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import AudienceSelector from "@/components/AudienceSelector";
import { sector } from "@/config";

// ---------------------------------------------------------------------------
// Cipia Cabinet — gamme premium pour cabinets et structures
// ---------------------------------------------------------------------------
//
// Branding : palette bleu nuit (#1e3a5f) + or (#d4af37), titres en font-serif
// (Cormorant Garamond chargé dans layout.tsx). Ton statutaire / institutionnel,
// argument central : "199€/an car l'IA Claude automatise 95% du travail
// d'un juriste salarié de Lefebvre. On reverse l'économie au client."
//
// Tarif : 199€/an pour 10 utilisateurs · audit blanc-marque · white-label
// newsletter · support prioritaire · accès API.
// ---------------------------------------------------------------------------

const PAGE_TITLE = "Cipia Cabinet · Veille réglementaire IA pour cabinets";
const PAGE_DESCRIPTION =
  "Cipia Cabinet équipe les cabinets EC, OF Qualiopi, avocats indépendants et bureaux ESG/RGE avec une IA de veille réglementaire. 199€/an pour 10 utilisateurs, audit blanc-marque, support prioritaire.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: {
    canonical: `https://${sector.brand.domain}/cabinet`,
  },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: `https://${sector.brand.domain}/cabinet`,
    siteName: sector.brand.name,
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

const faqItems = [
  {
    question: "Pourquoi 199€/an et pas 5 000€ comme Lefebvre ou Lamy ?",
    answer:
      "Parce que l'IA Claude (Anthropic) automatise 95% du travail réalisé par un juriste salarié des grands éditeurs. Nous reversons l'économie au client. La même qualité de veille, divisée par 25 en prix.",
  },
  {
    question: "Combien d'utilisateurs sont inclus dans le plan Cabinet ?",
    answer:
      "10 utilisateurs avec rôles différenciés (owner, admin, member). Au-delà, +5 utilisateurs pour 49€/an. Idéal pour cabinets EC de 5 à 30 collaborateurs et structures multi-sites.",
  },
  {
    question: "Le PDF d'audit est-il vraiment en blanc-marque ?",
    answer:
      "Oui. Vous uploadez votre logo, votre charte couleur, vos coordonnées, et chaque PDF généré porte uniquement votre identité. Idéal pour livrer la veille comme un livrable cabinet à vos clients.",
  },
  {
    question: "Quelle est la différence avec Cipia Solo ?",
    answer:
      "Cipia Solo (19€/an) est conçu pour les indépendants et TPE : 1 utilisateur, export PDF standard. Cipia Cabinet (199€/an) ajoute 10 utilisateurs, audit blanc-marque, newsletter white-label envoyée à vos clients depuis votre nom de domaine, accès API, support prioritaire et SLA 24h.",
  },
  {
    question: "Comment se passe la démo ?",
    answer:
      "30 minutes en visio avec Stéphane Jambu (fondateur). Démonstration sur votre cas d'usage réel, accès à un compte de test, devis personnalisé si vos besoins dépassent le plan standard. Aucun engagement.",
  },
  {
    question: "L'essai gratuit de 14 jours est-il complet ?",
    answer:
      "Oui. Toutes les fonctionnalités Cabinet sont activées pendant 14 jours, sans carte bancaire. À la fin de la période, vous décidez de continuer ou d'arrêter sans frais.",
  },
];

function CabinetJsonLd() {
  const offerSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Cipia Cabinet",
    description: PAGE_DESCRIPTION,
    brand: { "@type": "Brand", name: sector.brand.name },
    offers: {
      "@type": "Offer",
      price: "199",
      priceCurrency: "EUR",
      url: `https://${sector.brand.domain}/cabinet`,
      availability: "https://schema.org/InStock",
    },
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(offerSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}

function CabinetHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-cabinet-accent/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-cabinet-primary rounded-lg flex items-center justify-center">
              <span className="text-cabinet-accent font-bold text-sm font-serif">
                C
              </span>
            </div>
            <span className="font-bold text-lg text-cabinet-primary font-serif tracking-wide">
              Cipia <span className="text-cabinet-accent">Cabinet</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="#contact"
              className="hidden sm:inline-flex items-center px-4 py-2 rounded-lg bg-cabinet-primary text-white font-medium text-sm hover:bg-cabinet-primary-dark transition-colors"
            >
              Demander une démo
            </Link>
            <Link
              href="/connexion"
              className="inline-flex items-center px-4 py-2 rounded-lg border border-cabinet-primary/20 text-cabinet-primary font-medium text-sm hover:bg-cabinet-surface transition-colors"
            >
              Connexion
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function CabinetHero() {
  return (
    <section className="pt-12 pb-20 sm:pt-16 sm:pb-28 bg-gradient-to-b from-cabinet-surface via-white to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cabinet-primary/10 text-cabinet-primary text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4 text-cabinet-accent" />
            Nouveau · Cipia Cabinet · 199€/an pour 10 utilisateurs
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-semibold text-cabinet-primary leading-tight mb-6 tracking-tight">
            L&apos;IA qui équipe votre cabinet pour{" "}
            <span className="text-cabinet-accent italic">servir vos clients.</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-700 mb-3 max-w-2xl mx-auto">
            Veille réglementaire automatisée, audit blanc-marque, newsletter
            white-label, support prioritaire.
          </p>
          <p className="text-base text-gray-600 mb-10 max-w-2xl mx-auto">
            <strong className="text-cabinet-primary">199€/an</strong> pour
            10 utilisateurs. La même qualité que Lefebvre ou Lamy, divisée par
            25 en prix.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="#contact"
              className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-lg bg-cabinet-primary text-white font-semibold text-base hover:bg-cabinet-primary-dark transition-colors shadow-lg shadow-cabinet-primary/20"
            >
              <Calendar className="w-5 h-5" />
              Demander une démo (30 min visio)
            </Link>
            <Link
              href="/inscription?plan=cabinet"
              className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-lg bg-cabinet-accent text-cabinet-ink font-semibold text-base hover:bg-cabinet-accent-dark transition-colors"
            >
              Essai gratuit 14 jours
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Sans carte bancaire. Sans engagement. Activation immédiate.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-cabinet-accent" />
              <span>Hébergé en France</span>
            </div>
            <span className="text-gray-300">·</span>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cabinet-accent" />
              <span>10 utilisateurs inclus</span>
            </div>
            <span className="text-gray-300">·</span>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-cabinet-accent" />
              <span>Audit blanc-marque</span>
            </div>
            <span className="text-gray-300">·</span>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cabinet-accent" />
              <span>SLA 24h</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhyThisPrice() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-cabinet-accent uppercase tracking-widest mb-3">
            Le récit
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-cabinet-primary mb-4 tracking-tight">
            Pourquoi 199€/an et pas 5 000€ ?
          </h2>
          <p className="text-lg text-gray-600">
            Une question légitime. Voici la réponse honnête.
          </p>
        </div>

        <div className="space-y-6 text-gray-700 text-lg leading-relaxed">
          <p>
            Les éditeurs juridiques classiques (Lefebvre, Lamy, Francis
            Lefebvre, Editions Tissot) facturent entre{" "}
            <strong className="text-cabinet-primary">3 000 et 8 000€/an</strong>
            {" "}pour une veille sectorielle équivalente. La raison est simple :
            chaque texte est lu, résumé et qualifié par un juriste salarié.
          </p>
          <p>
            Cipia Cabinet utilise l&apos;IA{" "}
            <strong className="text-cabinet-primary">Claude (Anthropic)</strong>{" "}
            pour automatiser{" "}
            <strong className="text-cabinet-accent">95% de ce travail</strong>.
            Le juriste devient un superviseur qui valide les cas ambigus, là où
            l&apos;humain apporte vraiment de la valeur.
          </p>
          <p>
            Résultat : la même qualité de veille (sources officielles,
            classification fine, plan d&apos;action),{" "}
            <strong className="text-cabinet-primary">
              divisée par 25 en prix
            </strong>
            . Et nous reversons cette économie au client.
          </p>
          <div className="bg-cabinet-surface border-l-4 border-cabinet-accent p-6 rounded-r-lg">
            <p className="font-serif text-xl text-cabinet-primary italic">
              « Nous ne croyons pas qu&apos;un cabinet de 10 personnes doive
              payer le prix d&apos;une licence Lefebvre pour faire sa veille.
              Nous l&apos;avons construit pour qu&apos;il paie ce que cela coûte
              vraiment. »
            </p>
            <p className="text-sm text-gray-600 mt-3">
              — Stéphane Jambu, fondateur de Cipia
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ForWhom() {
  const personas = [
    {
      title: "Cabinets d'experts-comptables",
      description:
        "Suivi des évolutions fiscales, sociales et comptables. Livrables clients en blanc-marque.",
      icon: <FileText className="w-7 h-7" />,
    },
    {
      title: "OF Qualiopi structures",
      description:
        "Multi-utilisateurs (5-50 collaborateurs), preuves de veille audit-ready, équipes pédagogiques.",
      icon: <Brain className="w-7 h-7" />,
    },
    {
      title: "Cabinets d'avocats",
      description:
        "Veille jurisprudence, décrets et arrêtés sectoriels. Newsletter white-label pour vos clients.",
      icon: <Shield className="w-7 h-7" />,
    },
    {
      title: "Bureaux ESG / RGE",
      description:
        "Réglementation environnementale, certifications, normes ISO. Restitution clientèle premium.",
      icon: <Sparkles className="w-7 h-7" />,
    },
    {
      title: "Cliniques privées",
      description:
        "HAS, ARS, conventions Sécurité sociale. Veille statutaire et sanitaire centralisée.",
      icon: <Users className="w-7 h-7" />,
    },
  ];

  return (
    <section className="py-20 bg-cabinet-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-cabinet-accent uppercase tracking-widest mb-3">
            Pour qui
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-cabinet-primary mb-4 tracking-tight">
            Pensé pour les structures qui livrent à leurs clients
          </h2>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            5 typologies de cabinets utilisent Cipia Cabinet pour transformer
            la veille en valeur facturable.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {personas.map((persona, i) => (
            <div
              key={i}
              className="p-6 bg-white rounded-2xl border border-cabinet-primary/10 hover:border-cabinet-accent transition-colors shadow-sm"
            >
              <div className="w-12 h-12 rounded-lg bg-cabinet-primary/10 text-cabinet-primary flex items-center justify-center mb-4">
                {persona.icon}
              </div>
              <h3 className="font-serif text-xl font-semibold text-cabinet-primary mb-2">
                {persona.title}
              </h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                {persona.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Benefits() {
  const benefits = [
    {
      icon: <Clock className="w-7 h-7" />,
      title: "4 à 8 heures par semaine économisées",
      description:
        "Toutes les sources collectées et synthétisées par l'IA. Vos collaborateurs se concentrent sur le conseil client.",
    },
    {
      icon: <FileText className="w-7 h-7" />,
      title: "Audit PDF avec votre logo cabinet",
      description:
        "Chaque rapport généré porte votre identité visuelle, vos coordonnées et votre charte. Livrable client direct.",
    },
    {
      icon: <Users className="w-7 h-7" />,
      title: "10 utilisateurs avec rôles différenciés",
      description:
        "Owner, admin, member. Permissions fines, journal d'activité, gestion centralisée des invitations.",
    },
    {
      icon: <Mail className="w-7 h-7" />,
      title: "Newsletter white-label",
      description:
        "Envoyée à vos clients depuis votre nom de domaine, avec votre signature. Renforce votre positionnement d'expert.",
    },
    {
      icon: <Brain className="w-7 h-7" />,
      title: "Accès API",
      description:
        "Intégrez la veille Cipia dans votre extranet client, votre CRM ou votre outil métier. Documentation complète.",
    },
    {
      icon: <Shield className="w-7 h-7" />,
      title: "Support prioritaire & SLA 24h",
      description:
        "Réponse sous 24h ouvrées. Account manager dédié. Onboarding personnalisé pour votre équipe.",
    },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-cabinet-accent uppercase tracking-widest mb-3">
            Bénéfices
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-cabinet-primary mb-4 tracking-tight">
            Ce que votre cabinet gagne avec Cipia Cabinet
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((b, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-cabinet-surface/50 border border-cabinet-primary/10"
            >
              <div className="text-cabinet-accent mb-4">{b.icon}</div>
              <h3 className="text-lg font-bold text-cabinet-primary mb-2">
                {b.title}
              </h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                {b.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClientLogos() {
  const placeholders = [
    "Cabinet 1",
    "Cabinet 2",
    "Cabinet 3",
    "Cabinet 4",
    "Cabinet 5",
  ];

  return (
    <section className="py-16 bg-cabinet-surface border-y border-cabinet-accent/20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-sm font-semibold text-cabinet-accent uppercase tracking-widest mb-3">
          Cabinets témoins
        </p>
        <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-cabinet-primary mb-8">
          À venir : 5 cabinets témoins
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-6">
          {placeholders.map((label, i) => (
            <div
              key={i}
              className="aspect-[3/2] bg-white border border-dashed border-cabinet-primary/20 rounded-lg flex items-center justify-center text-cabinet-primary/40 text-sm font-medium"
            >
              {label}
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-600 mt-6">
          Vous souhaitez devenir cabinet témoin ?{" "}
          <Link
            href="#contact"
            className="text-cabinet-primary font-semibold hover:underline"
          >
            Contactez-nous
          </Link>
          {" "}— offre lancement -50% à vie pour les 5 premiers.
        </p>
      </div>
    </section>
  );
}

function PricingBlock() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-sm font-semibold text-cabinet-accent uppercase tracking-widest mb-3">
            Tarif unique
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-cabinet-primary mb-4 tracking-tight">
            Un seul plan. Tout inclus.
          </h2>
        </div>
        <div className="bg-gradient-to-br from-cabinet-primary to-cabinet-primary-dark rounded-2xl shadow-2xl shadow-cabinet-primary/30 overflow-hidden">
          <div className="bg-cabinet-accent text-cabinet-ink text-center py-2 text-sm font-semibold">
            Offre lancement · -30% jusqu&apos;à fin 2026
          </div>
          <div className="p-8 sm:p-12 text-white">
            <div className="flex items-baseline justify-center gap-3 mb-2">
              <span className="text-base text-white/50 line-through">
                285€
              </span>
              <span className="text-5xl sm:text-6xl font-extrabold text-cabinet-accent font-serif">
                199€
              </span>
              <span className="text-xl text-white/80">/an</span>
            </div>
            <p className="text-center text-white/70 text-sm mb-8">
              Pour 10 utilisateurs, sans engagement, facturation annuelle.
            </p>

            <ul className="space-y-3 max-w-md mx-auto mb-8">
              {[
                "10 utilisateurs avec rôles différenciés",
                "Veille IA sur 5 verticaux (Qualiopi, HACCP, médical, avocats, EC)",
                "Audit PDF blanc-marque (votre logo, votre charte)",
                "Newsletter white-label envoyée depuis votre domaine",
                "Accès API + documentation",
                "Support prioritaire avec SLA 24h",
                "Onboarding personnalisé",
                "Account manager dédié",
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-white/90">
                  <Check className="w-5 h-5 text-cabinet-accent shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="#contact"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-cabinet-accent text-cabinet-ink font-bold text-base hover:bg-cabinet-accent-dark transition-colors"
              >
                Demander une démo
              </Link>
              <Link
                href="/inscription?plan=cabinet"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-white/10 text-white border border-white/30 font-semibold text-base hover:bg-white/20 transition-colors"
              >
                Essai gratuit 14 jours
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CabinetFAQ() {
  return (
    <section className="py-20 bg-cabinet-surface">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-cabinet-accent uppercase tracking-widest mb-3">
            Questions fréquentes
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-cabinet-primary tracking-tight">
            Vos questions, nos réponses
          </h2>
        </div>
        <div className="space-y-4">
          {faqItems.map((item, i) => (
            <details
              key={i}
              className="group bg-white rounded-xl border border-cabinet-primary/10 overflow-hidden"
            >
              <summary className="flex items-center justify-between cursor-pointer p-5 font-semibold text-cabinet-primary hover:bg-cabinet-surface/50">
                <span className="font-serif text-lg">{item.question}</span>
                <ChevronDown className="w-5 h-5 text-cabinet-accent group-open:rotate-180 transition-transform shrink-0" />
              </summary>
              <div className="px-5 pb-5 text-gray-700 leading-relaxed">
                {item.answer}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactSection() {
  return (
    <section
      id="contact"
      className="py-20 bg-gradient-to-br from-cabinet-primary to-cabinet-primary-dark text-white scroll-mt-20"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <Calendar className="w-12 h-12 text-cabinet-accent mx-auto mb-6" />
        <h2 className="font-serif text-3xl sm:text-4xl font-semibold mb-4 tracking-tight">
          Réservez votre démo de 30 minutes
        </h2>
        <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
          Échange en visio avec Stéphane Jambu, fondateur. Démonstration sur
          votre cas d&apos;usage réel, accès à un compte de test, devis
          personnalisé.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="https://calendly.com/sjambu/discussion-30-minutes"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-lg bg-cabinet-accent text-cabinet-ink font-bold text-base hover:bg-cabinet-accent-dark transition-colors"
          >
            <Calendar className="w-5 h-5" />
            Réserver via Calendly
          </a>
          <a
            href="mailto:contact@cipia.fr?subject=Demande%20de%20d%C3%A9mo%20Cipia%20Cabinet"
            className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-lg bg-white/10 text-white border border-white/30 font-semibold text-base hover:bg-white/20 transition-colors"
          >
            <Mail className="w-5 h-5" />
            Écrire à contact@cipia.fr
          </a>
        </div>
        <p className="text-sm text-white/60 mt-6">
          Sans engagement. Aucune carte bancaire demandée pour la démo.
        </p>
      </div>
    </section>
  );
}

function CabinetFooter() {
  return (
    <footer className="bg-cabinet-ink text-white/70 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-cabinet-primary rounded flex items-center justify-center">
              <span className="text-cabinet-accent font-bold text-xs font-serif">
                C
              </span>
            </div>
            <span className="font-semibold text-white font-serif">
              Cipia Cabinet
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Shield className="w-4 h-4 text-cabinet-accent" />
            <span>
              Veille IA sur 5 verticaux · 199€/an pour 10 utilisateurs
            </span>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <p>&copy; 2026 Cipia &mdash; Haruna SARL</p>
          <div className="flex flex-wrap items-center gap-4 md:gap-6">
            <Link
              href="/"
              className="hover:text-cabinet-accent transition-colors"
            >
              Voir Cipia Solo
            </Link>
            <Link
              href="/mentions-legales"
              className="hover:text-cabinet-accent transition-colors"
            >
              Mentions légales
            </Link>
            <Link
              href="/confidentialite"
              className="hover:text-cabinet-accent transition-colors"
            >
              Confidentialité
            </Link>
            <Link
              href="/cgv"
              className="hover:text-cabinet-accent transition-colors"
            >
              CGV
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function CabinetPage() {
  return (
    <>
      <CabinetJsonLd />
      <CabinetHeader />
      <main className="pt-16">
        <AudienceSelector active="cabinet" variant="hero" />
        <CabinetHero />
        <WhyThisPrice />
        <ForWhom />
        <Benefits />
        <ClientLogos />
        <PricingBlock />
        <CabinetFAQ />
        <ContactSection />
      </main>
      <CabinetFooter />
    </>
  );
}
