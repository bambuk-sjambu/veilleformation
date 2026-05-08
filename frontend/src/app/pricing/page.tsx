"use client";

import Link from "next/link";
import { Check, Sparkles, ArrowRight } from "lucide-react";
import { sector } from "@/config";

interface Plan {
  id: string;
  name: string;
  badge?: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  ctaHref: string;
  popular?: boolean;
  highlight?: boolean;
  externalNote?: string;
}

const plans: Plan[] = [
  {
    id: "newsletter",
    name: "Newsletter",
    price: "0",
    period: "€/an",
    description: "Pour découvrir, sans carte bancaire",
    features: [
      "Newsletter hebdomadaire (mardi 8h)",
      "1 secteur au choix",
      "Articles classés par IA Anthropic Claude",
      "Sans engagement, sans CB",
    ],
    cta: "Lire un exemple",
    ctaHref: "/exemple-newsletter",
  },
  {
    id: "founder",
    name: "Cipia Founder",
    badge: "🔥 LIMITÉ 250 PLACES",
    price: "100",
    period: "€ HT à vie",
    description: "Offre fondateur — un paiement, accès illimité",
    features: [
      "Tout Cipia Solo, à vie",
      "Tableau de bord complet",
      "Export PDF audit illimité",
      "Alertes personnalisées",
      "Évolutions Qualiopi V7+ incluses",
      "Garantie 14 jours satisfait ou remboursé",
    ],
    cta: "Voir l'offre Founder",
    ctaHref: "/founders",
    highlight: true,
    externalNote: "Phase 1 : 250 places. Phase 2 : 1000 places à 150€ HT pour 5 ans.",
  },
  {
    id: "solo",
    name: "Cipia Solo",
    price: "39",
    period: "€ HT/an",
    description: "Pour les indépendants et TPE (1 utilisateur, 1 secteur)",
    features: [
      "Tableau de bord temps réel",
      "Veille appels d'offres",
      "Alertes personnalisées",
      "Export PDF audit illimité",
      "Plan d'action intégré",
      "Historique 24 mois",
      "14 jours d'essai gratuit",
    ],
    cta: "Démarrer 14 jours d'essai",
    ctaHref: "/inscription",
    popular: true,
  },
  {
    id: "cabinet",
    name: "Cipia Cabinet",
    price: "199",
    period: "€ HT/an",
    description: "Pour les cabinets (10 utilisateurs, multi-secteurs)",
    features: [
      "10 utilisateurs inclus",
      "Multi-secteurs (Qualiopi + HACCP + médical + avocats + EC)",
      "Toutes les fonctionnalités Solo",
      "Export PDF avec votre logo (white-label)",
      "Switcher de secteur dans le dashboard",
      "Audit blanc-marque",
      "14 jours d'essai gratuit",
    ],
    cta: "Démarrer 14 jours d'essai",
    ctaHref: "/inscription",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            {sector.brand.name}
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/connexion" className="text-gray-600 hover:text-gray-900">
              Connexion
            </Link>
            <Link
              href="/founders"
              className="bg-yellow-400 text-black font-bold px-4 py-2 rounded-lg hover:bg-yellow-300 transition"
            >
              Cipia Founder
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold mb-4">Tarifs Cipia</h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-2">
            Veille réglementaire IA pour 596 000 indépendants et cabinets français.
            Newsletter gratuite, abonnement low-cost, et offre fondateur à vie.
          </p>
          <p className="text-sm text-blue-200">
            Comparé à VeilleFormation (470-1170€/an), Cipia = ÷6 à ÷25 sur 5 ans.
          </p>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col ${
                plan.highlight ? "ring-4 ring-yellow-400" : plan.popular ? "ring-2 ring-blue-600" : ""
              }`}
            >
              {plan.badge && (
                <div className="bg-yellow-400 text-black text-center py-2 text-xs font-bold uppercase tracking-wide">
                  {plan.badge}
                </div>
              )}
              {plan.popular && !plan.badge && (
                <div className="bg-blue-600 text-white text-center py-2 text-sm font-medium">
                  Le plus populaire
                </div>
              )}
              <div className="p-6 flex-grow flex flex-col">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  {plan.highlight && <Sparkles className="w-5 h-5 text-yellow-500" />}
                  {plan.name}
                </h3>
                <p className="text-gray-500 text-sm mt-1">{plan.description}</p>
                <div className="mt-4">
                  <span className="text-4xl font-extrabold text-gray-900">
                    {plan.price === "0" ? "Gratuit" : plan.price}
                  </span>
                  {plan.price !== "0" && (
                    <span className="text-gray-500 ml-1">{plan.period}</span>
                  )}
                </div>
                <ul className="space-y-3 mt-6 flex-grow">
                  {plan.features.map((feat, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-gray-700">
                      <Check
                        className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                          plan.highlight ? "text-yellow-600" : "text-blue-600"
                        }`}
                      />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
                {plan.externalNote && (
                  <p className="text-xs text-gray-500 italic mt-4">{plan.externalNote}</p>
                )}
                <Link
                  href={plan.ctaHref}
                  className={`mt-6 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-colors ${
                    plan.highlight
                      ? "bg-yellow-400 text-black hover:bg-yellow-300"
                      : plan.popular
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-gray-900 text-white hover:bg-gray-800"
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Comparatif concurrents */}
        <div className="mt-16 bg-white rounded-2xl p-6 sm:p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
            Comparé au marché de la veille réglementaire
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left p-3 font-semibold text-gray-700">Solution</th>
                  <th className="text-center p-3 font-semibold text-gray-700">Tarif</th>
                  <th className="text-center p-3 font-semibold text-gray-700">Coût 5 ans</th>
                  <th className="text-center p-3 font-semibold text-gray-700">Audit PDF auto</th>
                  <th className="text-center p-3 font-semibold text-gray-700">IA</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100 bg-yellow-50">
                  <td className="p-3 font-bold text-blue-900">🏆 Cipia Founder</td>
                  <td className="text-center p-3 font-bold text-blue-700">100€ HT à vie</td>
                  <td className="text-center p-3 font-bold text-blue-700">100€</td>
                  <td className="text-center p-3">✅</td>
                  <td className="text-center p-3">✅</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-3 font-medium text-gray-700">Cipia Solo</td>
                  <td className="text-center p-3 text-gray-600">39€ HT/an</td>
                  <td className="text-center p-3 text-gray-600">195€</td>
                  <td className="text-center p-3">✅</td>
                  <td className="text-center p-3">✅</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-3 font-medium text-gray-700">Cipia Cabinet</td>
                  <td className="text-center p-3 text-gray-600">199€ HT/an</td>
                  <td className="text-center p-3 text-gray-600">995€</td>
                  <td className="text-center p-3">✅</td>
                  <td className="text-center p-3">✅</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-3 font-medium text-gray-700">VeilleFormation.com</td>
                  <td className="text-center p-3 text-gray-600">39 à 97€/mois</td>
                  <td className="text-center p-3 font-bold text-red-600">2 350 - 5 850€</td>
                  <td className="text-center p-3">✅</td>
                  <td className="text-center p-3 text-gray-400">❌</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-gray-700">Digiforma Veille (CRM)</td>
                  <td className="text-center p-3 text-gray-600">Gratuit (produit appel)</td>
                  <td className="text-center p-3 text-gray-600">0€</td>
                  <td className="text-center p-3 text-gray-400">❌</td>
                  <td className="text-center p-3 text-gray-400">❌</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA newsletter */}
        <div className="mt-12 bg-blue-700 rounded-2xl p-8 md:p-10 text-center text-white">
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
    </div>
  );
}
