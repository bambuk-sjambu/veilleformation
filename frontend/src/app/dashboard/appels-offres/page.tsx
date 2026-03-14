"use client";

import { useEffect, useState } from "react";
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

interface AoArticle {
  id: number;
  title: string;
  summary: string | null;
  url: string | null;
  published_date: string | null;
  acheteur: string | null;
  region: string | null;
  montant_estime: number | null;
  date_limite: string | null;
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

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("category", "ao");
    params.set("status", "done");
    params.set("sort", "deadline");
    params.set("limit", "100");

    fetch(`/api/articles?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setArticles(data.articles || []);
        setTotal(data.total || 0);
      })
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Appels d&apos;offres
        </h1>
        <p className="text-gray-600 mt-1">
          Marches publics de formation detectes par l&apos;IA
        </p>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        {total} appel{total !== 1 ? "s" : ""} d&apos;offres trouve
        {total !== 1 ? "s" : ""}
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : articles.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Aucun appel d&apos;offres
          </h2>
          <p className="text-gray-500">
            Les appels d&apos;offres apparaitront ici apres la premiere collecte
            BOAMP.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {articles.map((ao) => (
            <div
              key={ao.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                      AO
                    </span>
                    <DeadlineBadge dateStr={ao.date_limite} />
                    <span className="text-xs text-gray-400">{ao.source}</span>
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
                    {ao.acheteur && (
                      <span className="flex items-center gap-1 text-gray-500">
                        <Building2 className="w-3.5 h-3.5" />
                        {ao.acheteur}
                      </span>
                    )}
                    {ao.region && (
                      <span className="flex items-center gap-1 text-gray-500">
                        <MapPin className="w-3.5 h-3.5" />
                        {ao.region}
                      </span>
                    )}
                    {ao.montant_estime !== null && ao.montant_estime > 0 && (
                      <span className="flex items-center gap-1 text-gray-500">
                        <Euro className="w-3.5 h-3.5" />
                        {formatMontant(ao.montant_estime)}
                      </span>
                    )}
                    {ao.date_limite && (
                      <span className="flex items-center gap-1 text-gray-500">
                        <Calendar className="w-3.5 h-3.5" />
                        Limite : {formatDateFr(ao.date_limite)}
                      </span>
                    )}
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
          ))}
        </div>
      )}
    </div>
  );
}
