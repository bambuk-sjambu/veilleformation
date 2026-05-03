"use client";

import Link from "next/link";
import { ArrowRight, Briefcase, User } from "lucide-react";

interface AudienceSelectorProps {
  /** Audience actuellement sélectionnée (utilisée pour le style actif). */
  active: "solo" | "cabinet";
  /** Variante d'affichage : "compact" (sticky bar) ou "hero" (gros boutons). */
  variant?: "compact" | "hero";
}

/**
 * Sélecteur "Je suis ▶ Indépendant / Cabinet".
 *
 * Logique : clic Indépendant => `/` (home solo) ; clic Cabinet => `/cabinet`.
 * Composant client-only (sans état), juste deux liens stylés selon `active`.
 */
export default function AudienceSelector({
  active,
  variant = "hero",
}: AudienceSelectorProps) {
  if (variant === "compact") {
    return (
      <div className="w-full bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <span className="text-sm text-gray-600 font-medium">Je suis</span>
          <div className="flex gap-2">
            <Link
              href="/"
              aria-current={active === "solo" ? "page" : undefined}
              className={
                active === "solo"
                  ? "inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-white text-sm font-semibold"
                  : "inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
              }
            >
              <User className="w-4 h-4" />
              Indépendant
            </Link>
            <Link
              href="/cabinet"
              aria-current={active === "cabinet" ? "page" : undefined}
              className={
                active === "cabinet"
                  ? "inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cabinet-primary text-white text-sm font-semibold"
                  : "inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
              }
            >
              <Briefcase className="w-4 h-4" />
              Cabinet
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // variant === "hero" : deux gros boutons côte à côte, sous le header.
  return (
    <section
      aria-label="Choisir votre profil"
      className="bg-white border-b border-gray-100"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <p className="text-center text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Je suis
        </p>
        <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
          <Link
            href="/"
            aria-current={active === "solo" ? "page" : undefined}
            className={
              active === "solo"
                ? "group flex items-center gap-4 p-5 rounded-2xl border-2 border-primary bg-primary/5 ring-2 ring-primary/30 transition-all"
                : "group flex items-center gap-4 p-5 rounded-2xl border-2 border-gray-200 bg-white hover:border-primary hover:bg-primary/5 transition-all"
            }
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-base font-bold text-gray-900">
                Indépendant
              </div>
              <div className="text-sm text-gray-600">
                TPE, freelance, formateur · Cipia Solo, 19€/an
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </Link>
          <Link
            href="/cabinet"
            aria-current={active === "cabinet" ? "page" : undefined}
            className={
              active === "cabinet"
                ? "group flex items-center gap-4 p-5 rounded-2xl border-2 border-cabinet-primary bg-cabinet-surface ring-2 ring-cabinet-accent/40 transition-all"
                : "group flex items-center gap-4 p-5 rounded-2xl border-2 border-gray-200 bg-white hover:border-cabinet-primary hover:bg-cabinet-surface transition-all"
            }
          >
            <div className="w-12 h-12 rounded-full bg-cabinet-primary/10 flex items-center justify-center shrink-0">
              <Briefcase className="w-6 h-6 text-cabinet-primary" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-base font-bold text-gray-900">Cabinet</div>
              <div className="text-sm text-gray-600">
                Structure 5-50 personnes · Cipia Cabinet, 199€/an
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-cabinet-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </Link>
        </div>
      </div>
    </section>
  );
}
