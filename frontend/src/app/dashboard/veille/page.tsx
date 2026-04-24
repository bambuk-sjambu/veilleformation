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

interface Article {
  id: number;
  title: string;
  summary: string | null;
  url: string | null;
  published_date: string | null;
  impact_level: string | null;
  qualiopi_indicators: string | null;
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

const indicatorConfig: Record<
  string,
  { label: string; short: string; classes: string }
> = {
  "23": {
    label: "Veille légale et réglementaire",
    short: "Legal",
    classes: "bg-blue-100 text-blue-800",
  },
  "24": {
    label: "Competences, metiers, emplois",
    short: "Metiers",
    classes: "bg-green-100 text-green-800",
  },
  "25": {
    label: "Innovations pedagogiques",
    short: "Pedagogie",
    classes: "bg-purple-100 text-purple-800",
  },
  "26": {
    label: "Handicap et compensations",
    short: "Handicap",
    classes: "bg-teal-100 text-teal-800",
  },
};

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
      title="Pertinence pour les organismes de formation (1=faible, 10=tres pertinent)"
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

  const fetchArticles = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("status", "done");
    if (filterImpact) params.set("impact", filterImpact);
    if (filterIndicator) params.set("indicator", filterIndicator);
    params.set("limit", "200");

    fetch(`/api/articles?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        const filtered = (data.articles || []).filter(
          (a: Article) => a.category !== "ao"
        );
        setArticles(filtered);
        setTotal(filtered.length);
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
            17 sources officielles
          </Link>{" "}
          (BOAMP, Legifrance, OPCO, Regions...)
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
              {(["23", "24", "25", "26"] as const).map((ind) => (
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
              ))}
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

      {/* Results count */}
      <p className="text-sm text-gray-500 mb-4">
        {displayedArticles.length} article
        {displayedArticles.length !== 1 ? "s" : ""}{" "}
        {showFavoritesOnly ? "en favoris" : ""}
        {filterReadStatus ? ` — ${readStatusConfig[filterReadStatus]?.label}` : ""}
        {filterIndicator
          ? ` — ${indicatorConfig[filterIndicator]?.label || ""}`
          : ""}
        {filterImpact ? ` — impact ${filterImpact}` : ""}
      </p>

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
          {displayedArticles.map((article) => {
            const indicators = parseIndicators(article.qualiopi_indicators);

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
        </div>
      )}
    </div>
  );
}
