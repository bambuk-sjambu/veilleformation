"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  FileSearch,
  ExternalLink,
  Loader2,
  Filter,
  Star,
  BookmarkCheck,
  Eye,
  ThumbsUp,
  Lightbulb,
  Info,
} from "lucide-react";
import { sector } from "@/config";
import { getIndicators } from "@/lib/extra-meta";

interface Article {
  id: number;
  title: string;
  summary: string | null;
  url: string | null;
  published_date: string | null;
  impact_level: string | null;
  taxonomy_indicators: string | null;
  relevance_score: number | null;
  source: string;
  category: string | null;
  is_starred: number;
  read_status: string | null;
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

const impactConfig: Record<string, { label: string; classes: string }> = {
  fort: { label: "Fort", classes: "bg-red-100 text-red-800" },
  moyen: { label: "Moyen", classes: "bg-amber-100 text-amber-800" },
  faible: { label: "Faible", classes: "bg-green-100 text-green-800" },
};

const readStatusConfig: Record<string, { label: string; icon: React.ElementType; classes: string }> = {
  a_lire: { label: "A lire", icon: Eye, classes: "bg-gray-100 text-gray-700" },
  interessant: { label: "Interessant", icon: ThumbsUp, classes: "bg-blue-100 text-blue-700" },
  a_exploiter: { label: "A exploiter", icon: Lightbulb, classes: "bg-purple-100 text-purple-700" },
};

// Couleurs Tailwind par indicator id (fallback grey si id inconnu).
// Conserve en local pour eviter de polluer cipia.json avec des classes UI.
const INDICATOR_COLORS: Record<string, string> = {
  "23": "bg-blue-100 text-blue-800",
  "24": "bg-green-100 text-green-800",
  "25": "bg-purple-100 text-purple-800",
  "26": "bg-teal-100 text-teal-800",
};

const indicatorConfig: Record<
  string,
  { label: string; short: string; classes: string }
> = Object.fromEntries(
  sector.taxonomy.indicators.map((ind) => [
    ind.id,
    {
      label: ind.label,
      short: ind.short,
      classes: INDICATOR_COLORS[ind.id] || "bg-gray-100 text-gray-700",
    },
  ])
);

function parseIndicators(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
  } catch {
    return raw
      .replace(/[\[\]"]/g, "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
}

function RelevanceScore({ score }: { score: number | null }) {
  if (score === null) return null;
  const color =
    score >= 8
      ? "text-red-600 bg-red-50"
      : score >= 5
        ? "text-amber-600 bg-amber-50"
        : "text-gray-500 bg-gray-50";
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded ${color}`}
      title={`Pertinence pour les ${sector.vocab.audience} (1=faible, 10=tres pertinent)`}
    >
      Pertinence {score}/10
    </span>
  );
}

export default function VeillePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterImpact, setFilterImpact] = useState<string | null>(null);
  const [filterIndicator, setFilterIndicator] = useState<string | null>(null);
  const [filterReadStatus, setFilterReadStatus] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const PAGE_SIZE = 100;

  const fetchArticles = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("status", "done");
    params.set("not_category", "ao");  // les AO ont leur propre page /dashboard/appels-offres
    if (filterImpact) params.set("impact", filterImpact);
    if (filterIndicator) params.set("indicator", filterIndicator);
    params.set("limit", "2000");

    fetch(`/api/articles?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setArticles(data.articles || []);
        setTotal(data.total || 0);
      })
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, [filterImpact, filterIndicator]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const toggleStar = async (articleId: number, currentStarred: number) => {
    const newStarred = currentStarred ? 0 : 1;
    // Optimistic update
    setArticles((prev) =>
      prev.map((a) =>
        a.id === articleId ? { ...a, is_starred: newStarred } : a
      )
    );
    try {
      await fetch("/api/articles/star", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: articleId, starred: !!newStarred }),
      });
    } catch {
      // Revert on error
      setArticles((prev) =>
        prev.map((a) =>
          a.id === articleId ? { ...a, is_starred: currentStarred } : a
        )
      );
    }
  };

  const updateReadStatus = async (articleId: number, readStatus: string | null) => {
    // Optimistic update
    setArticles((prev) =>
      prev.map((a) =>
        a.id === articleId ? { ...a, read_status: readStatus } : a
      )
    );
    try {
      await fetch("/api/articles/read-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: articleId, readStatus }),
      });
    } catch {
      // Revert on error - silent fail
    }
  };

  const displayedArticles = articles
    .filter((a) => !showFavoritesOnly || a.is_starred)
    .filter((a) => !filterReadStatus || a.read_status === filterReadStatus);

  const favCount = articles.filter((a) => a.is_starred).length;

  // Reset a la page 1 quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [filterImpact, filterIndicator, filterReadStatus, showFavoritesOnly]);

  const totalPages = Math.max(1, Math.ceil(displayedArticles.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const paginatedArticles = displayedArticles.slice(
    startIdx,
    startIdx + PAGE_SIZE,
  );
  const showingFrom = displayedArticles.length === 0 ? 0 : startIdx + 1;
  const showingTo = Math.min(
    startIdx + PAGE_SIZE,
    displayedArticles.length,
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Veille réglementaire
        </h1>
        <p className="text-gray-600 mt-1">
          Articles et textes réglementaires analysés par l&apos;IA
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Données collectées depuis{" "}
          <Link href="/sources" className="text-primary hover:underline font-medium">
            8 sources officielles actives
          </Link>{" "}
          (BOAMP, JORF, Centre Inffo, 5 OPCO sectoriels)
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtres</span>
          </div>
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              showFavoritesOnly
                ? "bg-amber-100 text-amber-800"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <BookmarkCheck className="w-3.5 h-3.5" />
            Favoris{favCount > 0 ? ` (${favCount})` : ""}
          </button>
        </div>
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Impact</label>
            <div className="flex gap-1">
              <button
                onClick={() => setFilterImpact(null)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  !filterImpact
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Tous
              </button>
              {(["fort", "moyen", "faible"] as const).map((level) => (
                <button
                  key={level}
                  onClick={() =>
                    setFilterImpact(filterImpact === level ? null : level)
                  }
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    filterImpact === level
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {impactConfig[level].label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">
              Indicateur Qualiopi
            </label>
            <div className="flex gap-1">
              <button
                onClick={() => setFilterIndicator(null)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  !filterIndicator
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Tous
              </button>
              {sector.taxonomy.indicators.map((indicator) => {
                const ind = indicator.id;
                return (
                  <button
                    key={ind}
                    onClick={() =>
                      setFilterIndicator(filterIndicator === ind ? null : ind)
                    }
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      filterIndicator === ind
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    title={indicatorConfig[ind]?.label}
                  >
                    {indicatorConfig[ind]?.short || ind}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Statut</label>
            <div className="flex gap-1">
              <button
                onClick={() => setFilterReadStatus(null)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  !filterReadStatus
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Tous
              </button>
              {(["a_lire", "interessant", "a_exploiter"] as const).map((status) => {
                const cfg = readStatusConfig[status];
                const Icon = cfg.icon;
                return (
                  <button
                    key={status}
                    onClick={() =>
                      setFilterReadStatus(filterReadStatus === status ? null : status)
                    }
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      filterReadStatus === status
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    title={cfg.label}
                  >
                    <Icon className="w-3 h-3" />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Results count + pagination header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-gray-700">
            {displayedArticles.length}
          </span>{" "}
          article{displayedArticles.length !== 1 ? "s" : ""}
          {displayedArticles.length !== articles.length && articles.length > 0
            ? ` sur ${articles.length}`
            : ""}
          {showFavoritesOnly ? " en favoris" : ""}
          {filterReadStatus ? ` — ${readStatusConfig[filterReadStatus]?.label}` : ""}
          {filterIndicator
            ? ` — ${indicatorConfig[filterIndicator]?.label || ""}`
            : ""}
          {filterImpact ? ` — impact ${filterImpact}` : ""}
          {displayedArticles.length > PAGE_SIZE && (
            <span className="text-gray-400">
              {" "}
              · affichage {showingFrom}–{showingTo}
            </span>
          )}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Précédent
            </button>
            <span className="px-3 py-1.5 text-xs text-gray-600">
              Page {safePage} / {totalPages}
            </span>
            <button
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={safePage >= totalPages}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Suivant
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : displayedArticles.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileSearch className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            {showFavoritesOnly
              ? "Aucun favori"
              : "Aucun article de veille"}
          </h2>
          <p className="text-gray-500">
            {showFavoritesOnly
              ? "Cliquez sur l'étoile d'un article pour l'ajouter en favori."
              : "Les articles apparaîtront ici après la première collecté."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedArticles.map((article) => {
            const indicators = parseIndicators(getIndicators(article));

            return (
              <div
                key={article.id}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2 mb-2">
                      {article.impact_level &&
                        impactConfig[article.impact_level] && (
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded ${
                              impactConfig[article.impact_level].classes
                            }`}
                          >
                            {impactConfig[article.impact_level].label}
                          </span>
                        )}
                      {indicators.map((ind) => {
                        const cfg = indicatorConfig[ind];
                        return (
                          <button
                            key={ind}
                            onClick={() =>
                              setFilterIndicator(
                                filterIndicator === ind ? null : ind
                              )
                            }
                            className={`text-xs font-semibold px-2 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity ${
                              cfg?.classes || "bg-gray-100 text-gray-600"
                            }`}
                            title={`Filtrer : ${cfg?.label || ind}`}
                          >
                            {cfg?.short || `Ind. ${ind}`}
                          </button>
                        );
                      })}
                      <span className="text-xs text-gray-400">
                        {article.source === "legifrance"
                          ? "Legifrance"
                          : article.source === "boamp"
                            ? "BOAMP"
                            : article.source === "france_competences"
                              ? "France Compétences"
                              : article.source === "opco_akto"
                                ? "OPCO Akto"
                                : article.source === "opcommerce"
                                  ? "OPCommerce"
                                  : article.source === "region"
                                    ? "Région"
                                    : article.source}
                      </span>
                    </div>

                    <h3 className="font-semibold text-gray-900 mb-1">
                      {article.title}
                    </h3>

                    {article.summary && (
                      <p className="text-sm text-gray-600 line-clamp-3 mb-2">
                        {article.summary}
                      </p>
                    )}

                    <div className="flex items-center flex-wrap gap-4 text-sm">
                      {article.published_date && (
                        <span className="text-gray-400">
                          {formatDateFr(article.published_date)}
                        </span>
                      )}
                      <RelevanceScore score={article.relevance_score} />
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-2 shrink-0">
                    {/* Read status dropdown */}
                    <select
                      value={article.read_status || ""}
                      onChange={(e) => updateReadStatus(article.id, e.target.value || null)}
                      className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                      title="Marquer cet article"
                    >
                      <option value="">Marquer...</option>
                      <option value="a_lire">A lire</option>
                      <option value="interessant">Interessant</option>
                      <option value="a_exploiter">A exploiter</option>
                    </select>
                    <button
                      onClick={() => toggleStar(article.id, article.is_starred)}
                      className="p-2 transition-colors rounded-lg hover:bg-amber-50"
                      title={
                        article.is_starred
                          ? "Retirer des favoris"
                          : "Ajouter aux favoris"
                      }
                    >
                      <Star
                        className={`w-5 h-5 ${
                          article.is_starred
                            ? "fill-amber-400 text-amber-400"
                            : "text-gray-300 hover:text-amber-300"
                        }`}
                      />
                    </button>
                    {article.url && (
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-400 hover:text-primary transition-colors"
                        title="Voir la source"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Précédent
              </button>
              <span className="px-4 py-2 text-sm text-gray-600">
                Page {safePage} / {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={safePage >= totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Suivant →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
