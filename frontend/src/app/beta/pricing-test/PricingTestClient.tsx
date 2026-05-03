"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

type Variant = "A" | "B" | "C";
type Plan = "solo" | "cabinet";

const COOKIE_NAME = "cipia_beta_pricing_variant";
const COOKIE_MAX_AGE_S = 14 * 24 * 60 * 60; // 14 jours

const VARIANT_PRICE: Record<Variant, number> = {
  A: 9,
  B: 19,
  C: 39,
};

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(name + "="));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

function writeCookie(name: string, value: string, maxAgeS: number) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeS}; Path=/; SameSite=Lax${secure}`;
}

function pickRandomVariant(): Variant {
  const r = Math.floor(Math.random() * 3);
  return (["A", "B", "C"] as Variant[])[r];
}

export default function PricingTestClient() {
  const router = useRouter();
  const [variant, setVariant] = useState<Variant | null>(null);
  const [submitting, setSubmitting] = useState<Plan | null>(null);
  const [error, setError] = useState("");

  // Variant assignment + visit tracking (une seule fois par session)
  useEffect(() => {
    let v = readCookie(COOKIE_NAME) as Variant | null;
    let isNew = false;
    if (v !== "A" && v !== "B" && v !== "C") {
      v = pickRandomVariant();
      isNew = true;
      writeCookie(COOKIE_NAME, v, COOKIE_MAX_AGE_S);
    }
    setVariant(v);
    if (isNew) {
      // Logge la visite (variant assigne) - best effort
      fetch("/api/beta/pricing-test/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variant: v }),
      }).catch(() => {
        // silent
      });
    }
  }, []);

  const soloPrice = useMemo(
    () => (variant ? VARIANT_PRICE[variant] : 19),
    [variant]
  );

  async function handleClick(plan: Plan, priceEur: number) {
    if (!variant) return;
    setError("");
    setSubmitting(plan);
    try {
      const res = await fetch("/api/beta/pricing-test/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantSeen: variant,
          planClicked: plan,
          priceEur,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Une erreur est survenue");
        setSubmitting(null);
        return;
      }
      router.push("/beta/pricing-test/merci");
    } catch {
      setError("Impossible de contacter le serveur");
      setSubmitting(null);
    }
  }

  // Render minimal pendant que le variant n'est pas encore decide (evite flash de prix)
  if (!variant) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {/* Newsletter (gratuite) */}
        <div className="p-6 rounded-2xl border border-gray-200 bg-white">
          <h3 className="text-lg font-bold text-gray-900 mb-1">Newsletter</h3>
          <p className="text-sm text-gray-500 mb-4">Pour découvrir Cipia</p>
          <div className="mb-6">
            <span className="text-4xl font-extrabold text-gray-900">0€</span>
            <span className="text-gray-500"> / an</span>
          </div>
          <ul className="space-y-2 mb-6 text-sm">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
              <span className="text-gray-700">1 newsletter / semaine</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
              <span className="text-gray-700">1 secteur au choix</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
              <span className="text-gray-700">Sans carte bancaire</span>
            </li>
          </ul>
          <a
            href="/"
            className="block w-full text-center py-2.5 rounded-lg font-medium text-sm bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors"
          >
            S&apos;abonner gratuitement
          </a>
        </div>

        {/* Cipia Solo (PRIX VARIABLE) */}
        <div className="relative p-6 rounded-2xl border-2 border-primary bg-primary/5 ring-2 ring-primary shadow-lg">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full">
            Le plus populaire
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Cipia Solo</h3>
          <p className="text-sm text-gray-500 mb-4">
            Pour les indépendants
          </p>
          <div className="mb-6">
            <span className="text-4xl font-extrabold text-gray-900">
              {soloPrice}€
            </span>
            <span className="text-gray-500"> / an</span>
            <p className="text-xs text-gray-500 mt-2">
              Soit {(soloPrice / 12).toFixed(2).replace(".", ",")}€ / mois
            </p>
          </div>
          <ul className="space-y-2 mb-6 text-sm">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
              <span className="text-gray-700">Tous les secteurs</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
              <span className="text-gray-700">Alertes personnalisées</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
              <span className="text-gray-700">Dashboard complet</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
              <span className="text-gray-700">Export PDF audit</span>
            </li>
          </ul>
          <button
            type="button"
            onClick={() => handleClick("solo", soloPrice)}
            disabled={submitting !== null}
            className="block w-full text-center py-2.5 rounded-lg font-bold text-sm bg-yellow-400 text-black hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting === "solo" ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              "Souscrire"
            )}
          </button>
        </div>

        {/* Cipia Cabinet */}
        <div className="p-6 rounded-2xl border border-gray-200 bg-white">
          <h3 className="text-lg font-bold text-gray-900 mb-1">Cipia Cabinet</h3>
          <p className="text-sm text-gray-500 mb-4">
            Pour les cabinets et conseils
          </p>
          <div className="mb-6">
            <span className="text-4xl font-extrabold text-gray-900">199€</span>
            <span className="text-gray-500"> / an</span>
            <p className="text-xs text-gray-500 mt-2">
              Soit 16,58€ / mois
            </p>
          </div>
          <ul className="space-y-2 mb-6 text-sm">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
              <span className="text-gray-700">10 utilisateurs</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
              <span className="text-gray-700">Audit blanc-marque</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
              <span className="text-gray-700">Newsletter white-label</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
              <span className="text-gray-700">Accès API</span>
            </li>
          </ul>
          <button
            type="button"
            onClick={() => handleClick("cabinet", 199)}
            disabled={submitting !== null}
            className="block w-full text-center py-2.5 rounded-lg font-bold text-sm bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting === "cabinet" ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              "Souscrire"
            )}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-red-600 text-sm text-center mt-6">{error}</p>
      )}
    </>
  );
}
