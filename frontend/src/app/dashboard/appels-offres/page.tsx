"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Megaphone,
  ExternalLink,
  Loader2,
  Star,
  MapPin,
  Building2,
  Calendar,
  Euro,
} from "lucide-react";
import { getMetaField } from "@/lib/extra-meta";

interface AoArticle {
  id: number;
  title: string;
  summary: string | null;
  url: string | null;
  published_date: string | null;
  extra_meta: string | null;
  relevance_score: number | null;
  source: string;
}

function formatDateFr(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatMontant(montant: number | null): string {
  if (montant === null || montant === undefined) return "";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(montant);
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function DeadlineBadge({ dateStr }: { dateStr: string | null }) {
  const days = daysUntil(dateStr);
  if (days === null) return null;

  let colorClasses = "bg-green-100 text-green-800";
  let label = `${days}j restants`;

  if (days < 0) {
    colorClasses = "bg-gray-100 text-gray-500";
    label = "Expire";
  } else if (days < 7) {
    colorClasses = "bg-red-100 text-red-800";
    label = days === 0 ? "Aujourd'hui" : `${days}j restants`;
  } else if (days < 14) {
    colorClasses = "bg-amber-100 text-amber-800";
  }

  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${colorClasses}`}>
      {label}
    </span>
  );
}

function RelevanceStars({ score }: { score: number | null }) {
  if (score === null) return null;
  const filled = Math.round(score / 2);
  return (
    <div className="flex items-center gap-0.5" title={`${score}/10`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${
            i <= filled
              ? "fill-amber-400 text-amber-400"
              : "text-gray-300"
          }`}
        />
      ))}
      <span className="text-xs text-gray-500 ml-1">{score}/10</span>
    </div>
  );
}

export default function AppelsOffresPage() {
  const [articles, setArticles] = useState<AoArticle[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [preferredRegions, setPreferredRegions] = useState<string[]>([]);

  // Fetch user préférences
  useEffect(() => {
    fetch("/api/user")
      .then((res) => res.json())
      .then((data) => {
        if (data.user?.preferred_regions) {
          try {
            const regions = JSON.parse(data.user.preferred_regions);
            setPreferredRegions(Array.isArray(regions) ? regions : []);
          } catch {
            setPreferredRegions([]);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Fetch AO articles (limite haute pour permettre filtrage client-side sur tous les AO)
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("category", "ao");
    params.set("status", "done");
    params.set("sort", "relevance");
    params.set("limit", "1000");

    fetch(`/api/articles?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setArticles(data.articles || []);
        setTotal(data.total || 0);
      })
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, []);

  // Mapping slug preferences -> nom region en DB (INSEE)
  // La DB contient le nom complet (backfill dept -> region). Pas besoin de guess.
  const SLUG_TO_REGION: Record<string, string> = {
    "ile-de-france": "Ile-de-France",
    "auvergne-rhone-alpes": "Auvergne-Rhone-Alpes",
    "hauts-de-france": "Hauts-de-France",
    "nouvelle-aquitaine": "Nouvelle-Aquitaine",
    "occitanie": "Occitanie",
    "grand-est": "Grand Est",
    "provence-alpes-cote-dazur": "Provence-Alpes-Cote-d'Azur",
    "pays-de-la-loire": "Pays de la Loire",
    "bretagne": "Bretagne",
    "normandie": "Normandie",
    "bourgogne-franche-comte": "Bourgogne-Franche-Comte",
    "centre-val-de-loire": "Centre-Val de Loire",
    "corse": "Corse",
    "guadeloupe": "Guadeloupe",
    "martinique": "Martinique",
    "guyane": "Guyane",
    "reunion": "Reunion",
    "mayotte": "Mayotte",
  };

  // Normalise pour comparaison insensible a la casse, aux accents et tirets
  const normalize = (s: string | null | undefined) =>
    (s || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[-'’]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const filteredArticles = preferredRegions.length === 0
    ? articles
    : articles.filter((ao) => {
        const region = getMetaField(ao, "region");
        if (!region) return false;
        const aoRegion = normalize(region);
        return preferredRegions.some((pref) => {
          const target = SLUG_TO_REGION[pref];
          return target && aoRegion === normalize(target);
        });
      });

  const filteredCount = filteredArticles.length;
  const isFiltered = preferredRegions.length > 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Appels d&apos;offres
        </h1>
        <p className="text-gray-600 mt-1">
          Marchés publics de formation détectés par l&apos;IA
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Données collectées depuis{" "}
          <Link href="/sources" className="text-primary hover:underline font-medium">
            8 sources officielles actives
          </Link>{" "}
          (BOAMP au-dessus de 40 k€ HT + 5 OPCO sectoriels sub-seuil)
        </p>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-500">
          {loading ? (
            <span className="inline-flex items-center gap-2 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Chargement des appels d&apos;offres...
            </span>
          ) : isFiltered ? (
            <>
              <span className="font-medium text-blue-600">{filteredCount} AO</span>
              <span className="mx-1">sur</span>
              <span>{total}</span>
              <span className="ml-1">(filtre par région actif)</span>
            </>
          ) : (
            <>
              {total} appel{total !== 1 ? "s" : ""} d&apos;offres trouvé
              {total !== 1 ? "s" : ""}
            </>
          )}
        </div>
        <a
          href="/dashboard/parametres?tab=pr%C3%A9f%C3%A9rences"
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <MapPin className="w-4 h-4" />
          {isFiltered ? "Modifier les régions" : "Filtrer par région"}
        </a>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            {isFiltered ? "Aucun résultat pour vos régions" : "Aucun appel d'offres"}
          </h2>
          <p className="text-gray-500">
            {isFiltered
              ? "Essayez d'élargir vos régions dans les paramètres."
              : "Les appels d'offres apparaîtront ici après la première collecté."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredArticles.map((ao) => {
            // Refactor multi-secteur A.4.c : lecture preferentielle de
            // extra_meta (nouvelle colonne JSON) avec fallback sur les
            // anciennes colonnes dediees.
            const acheteur = getMetaField(ao, "acheteur");
            const region = getMetaField(ao, "region");
            const montant = getMetaField(ao, "montant_estime");
            const dateLimite = getMetaField(ao, "date_limite");

            return (
            <div
              key={ao.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                      AO {ao.source?.toUpperCase()}
                    </span>
                    {(region || acheteur) && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {region || acheteur}
                      </span>
                    )}
                    <DeadlineBadge dateStr={dateLimite} />
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-1">
                    {ao.title}
                  </h3>

                  {ao.summary && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {ao.summary}
                    </p>
                  )}

                  <div className="flex items-center flex-wrap gap-4 text-sm">
                    {acheteur && (
                      <span className="flex items-center gap-1 text-gray-500">
                        <Building2 className="w-3.5 h-3.5" />
                        {acheteur}
                      </span>
                    )}
                    {region && (
                      <span className="flex items-center gap-1 text-gray-500">
                        <MapPin className="w-3.5 h-3.5" />
                        {region}
                      </span>
                    )}
                    {montant !== null && montant > 0 && (
                      <span className="flex items-center gap-1 text-gray-500">
                        <Euro className="w-3.5 h-3.5" />
                        {formatMontant(montant)}
                      </span>
                    )}
                    {dateLimite ? (
                      <span className="flex items-center gap-1 text-gray-500">
                        <Calendar className="w-3.5 h-3.5" />
                        Limite : {formatDateFr(dateLimite)}
                      </span>
                    ) : ao.published_date ? (
                      <span className="flex items-center gap-1 text-gray-500">
                        <Calendar className="w-3.5 h-3.5" />
                        Publié : {formatDateFr(ao.published_date)}
                      </span>
                    ) : null}
                    <RelevanceStars score={ao.relevance_score} />
                  </div>
                </div>

                {ao.url && (
                  <a
                    href={ao.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 p-2 text-gray-400 hover:text-primary transition-colors"
                    title="Voir l'appel d'offres"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
