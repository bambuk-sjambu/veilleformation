"use client";

import { useState } from "react";
import Link from "next/link";

const plans = [
  {
    id: "gratuit",
    name: "Gratuit",
    price: 0,
    period: "pour toujours",
    description: "Pour découvrir la veille réglementaire",
    features: [
      "Newsletter hebdomadaire",
      "1 thème au choix",
      "Résumé IA des articles",
      "Export PDF audit (1x/mois)",
      "Support email",
    ],
    cta: "Commencer gratuitement",
    popular: false,
  },
  {
    id: "solo",
    name: "Solo",
    price: 15,
    period: "/mois",
    description: "Pour les indépendants et TPE",
    features: [
      "Tous les thèmes (23-26)",
      "Veille appels d'offres",
      "Alertes personnalisées",
      "Export PDF illimité",
      "Plan d'action intégré",
      "Support prioritaire",
    ],
    cta: "Choisir Solo",
    popular: true,
  },
  {
    id: "équipe",
    name: "Équipe",
    price: 39,
    period: "/mois",
    description: "Pour les organismes de formation",
    features: [
      "5 utilisateurs inclus",
      "Toutes les fonctionnalités Solo",
      "Export PDF avec logo",
      "Collaboration équipe",
      "Historique 12 mois",
      "Formation inclusion (30 min)",
    ],
    cta: "Choisir Équipe",
    popular: false,
  },
  {
    id: "agence",
    name: "Agence",
    price: 79,
    period: "/mois",
    description: "Pour les consultants et accompagnateurs",
    features: [
      "20 utilisateurs inclus",
      "Multi-sites (5 organismes)",
      "API & Webhooks",
      "White-label newsletter",
      "Support dédié",
      "SLA 99.9%",
    ],
    cta: "Contacter",
    popular: false,
  },
];

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");

  const getPrice = (plan: typeof plans[0]) => {
    if (billingPeriod === "yearly") {
      return Math.round(plan.price * 0.8); // 20% discount for yearly
    }
    return plan.price;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              VeilleFormation.fr
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/connexion" className="text-gray-600 hover:text-gray-900">
                Connexion
              </Link>
              <Link
                href="/inscription"
                className="bg-yellow-400 text-black font-bold px-4 py-2 rounded-lg hover:bg-yellow-300 transition"
              >
                Inscription
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold mb-4">
            Conformite Qualiopi simplifiee
          </h1>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            La veille reglementaire automatisee pour les 45 000 organismes de formation certifies Qualiopi
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`px-4 py-2 rounded-lg transition ${
                billingPeriod === "monthly"
                  ? "bg-white text-blue-600"
                  : "bg-blue-700 text-white hover:bg-blue-500"
              }`}
            >
              Mensuel
            </button>
            <button
              onClick={() => setBillingPeriod("yearly")}
              className={`px-4 py-2 rounded-lg transition ${
                billingPeriod === "yearly"
                  ? "bg-white text-blue-600"
                  : "bg-blue-700 text-white hover:bg-blue-500"
              }`}
            >
              Annuel (-20%)
            </button>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-xl shadow-lg overflow-hidden ${
                plan.popular ? "ring-2 ring-blue-600" : ""
              }`}
            >
              {plan.popular && (
                <div className="bg-blue-600 text-white text-center py-2 text-sm font-medium">
                  Le plus populaire
                </div>
              )}
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                <p className="text-gray-500 text-sm mt-1">{plan.description}</p>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900">
                    {plan.price === 0 ? "Gratuit" : `${getPrice(plan)} EUR`}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-gray-500">{plan.period}</span>
                  )}
                </div>
                {billingPeriod === "yearly" && plan.price > 0 && (
                  <p className="text-sm text-green-600 mt-1">
                    Economisez {plan.price * 12 - getPrice(plan) * 12} EUR/an
                  </p>
                )}
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-600 text-sm">{feature}</span>
                  </li>
                  ))}
                </ul>
                <Link
                  href={plan.id === "gratuit" ? "/inscription" : `/inscription?plan=${plan.id}`}
                  className={`mt-6 block w-full text-center py-3 rounded-lg font-medium transition ${
                    plan.popular
                      ? "bg-yellow-400 text-black font-bold hover:bg-yellow-300"
                      : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Questions frequentes
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Est-ce que je peux annuler a tout moment ?
              </h3>
              <p className="mt-2 text-gray-600">
                Oui, il n&apos;y a aucun engagement. Vous pouvez annuler votre abonnement a tout moment depuis votre espace client.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Comment fonctionne l&apos;export PDF pour l&apos;audit Qualiopi ?
              </h3>
              <p className="mt-2 text-gray-600">
                En un clic, vous genereez un document PDF complet pret a presenter a votre auditeur Qualiopi,
                incluant tous les articles surveilles, les actions menees et votre methodologie de veille.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Quelles sources surveillez-vous ?
              </h3>
              <p className="mt-2 text-gray-600">
                Nous collectons automatiquement les articles de BOAMP, Legifrance, 11 OPCO, France Travail
                et les 13 Conseils Regionaux. Tout est analyse par IA pour ne vous presenter que le pertinent.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-blue-600 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Pret a simplifier votre veille reglementaire ?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Rejoignez les organismes de formation qui font confiance a VeilleFormation.fr
          </p>
          <Link
            href="/inscription"
            className="inline-block bg-yellow-400 text-black px-8 py-4 rounded-lg font-bold text-lg hover:bg-yellow-300 transition"
          >
            Commencer gratuitement
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p>2026 VeilleFormation.fr - Tous droits reserves</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/mentions-legales" className="hover:text-white">Mentions legales</Link>
              <Link href="/confidentialite" className="hover:text-white">Confidentialite</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
