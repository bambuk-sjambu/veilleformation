"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CreditCard,
  Check,
  Loader2,
  Calendar,
  ArrowRight,
} from "lucide-react";

interface SubscriptionInfo {
  plan: string;
  subscription_status: string | null;
  subscription_period_end: string | null;
}

const PLAN_CONFIG = {
  free: {
    name: "Gratuit",
    price: 0,
    features: ["Newsletter hebdomadaire", "1 thème", "Export PDF (1x/mois)"],
  },
  solo: {
    name: "Solo",
    price: 15,
    features: ["Tous thèmes", "Veille AO", "Alertes personnalisées", "Export PDF illimité"],
  },
  équipe: {
    name: "Équipe",
    price: 39,
    features: ["5 utilisateurs", "Toutes features Solo", "Export avec logo", "Historique 12 mois"],
  },
  agence: {
    name: "Agence",
    price: 79,
    features: ["20 utilisateurs", "Multi-sites", "API & Webhooks", "White-label"],
  },
};

export default function AbonnementPage() {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const res = await fetch("/api/user");
      const data = await res.json();
      setSubscription({
        plan: data.user?.plan || "free",
        subscription_status: data.user?.subscription_status || null,
        subscription_period_end: data.user?.subscription_period_end || null,
      });
    } catch (error) {
      console.error("Error fetching subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Portal error:", error);
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCheckout = async (plan: string, billingPeriod: "monthly" | "yearly") => {
    setCheckoutLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billingPeriod }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setCheckoutLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const currentPlan = subscription?.plan || "free";
  const planConfig = PLAN_CONFIG[currentPlan as keyof typeof PLAN_CONFIG];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Abonnement</h1>
        <p className="text-gray-500 mt-1">Gerez votre plan et vos options de facturation</p>
      </div>

      {/* Current Plan */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-semibold text-gray-900">{planConfig.name}</h2>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                Plan actuel
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-4">
              {planConfig.price} EUR<span className="text-sm text-gray-500 font-normal">/mois</span>
            </p>
            {subscription?.subscription_period_end && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>
                  {subscription.subscription_status === "active"
                    ? `Prochain renouvellement le ${formatDate(subscription.subscription_period_end)}`
                    : subscription.subscription_status === "past_due"
                    ? "Paiement en attente"
                    : "Abonnement annulé"}
                </span>
              </div>
            )}
          </div>
          {currentPlan !== "free" && (
            <button
              onClick={handlePortal}
              disabled={portalLoading}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
            >
              {portalLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4" />
              )}
              Gérer le paiement
            </button>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Votre plan inclut :</h3>
          <ul className="space-y-2">
            {planConfig.features.map((feature, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                <Check className="w-4 h-4 text-green-500" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Upgrade Options */}
      {currentPlan === "free" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Passer à un plan supérieur</h2>
          <p className="text-gray-500 mb-6">
            Débloquez plus de fonctionnalités pour votre veille réglementaire.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(["solo", "équipe", "agence"] as const).map((plan) => {
              const config = PLAN_CONFIG[plan];
              return (
                <div
                  key={plan}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition"
                >
                  <h3 className="font-semibold text-gray-900">{config.name}</h3>
                  <p className="text-2xl font-bold text-gray-900 my-2">
                    {config.price} EUR<span className="text-sm text-gray-500 font-normal">/mois</span>
                  </p>
                  <ul className="space-y-1 mb-4">
                    {config.features.slice(0, 3).map((f, i) => (
                      <li key={i} className="text-xs text-gray-500 flex items-center gap-1">
                        <Check className="w-3 h-3 text-green-500" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleCheckout(plan, "monthly")}
                    disabled={checkoutLoading === plan}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {checkoutLoading === plan ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Choisir <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-6 text-center">
            <Link href="/pricing" className="text-sm text-blue-600 hover:underline">
              Voir tous les plans et tarifs
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
