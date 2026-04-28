"use client";

import { useEffect, useState } from "react";
import {
  FileSearch,
  Megaphone,
  Mail,
  Clock,
  Users,
  TrendingUp,
  AlertTriangle,
  Shield,
  CalendarClock,
  Loader2,
  DatabaseZap,
} from "lucide-react";

interface Stats {
  total_articles: number;
  total_ao: number;
  total_reglementaire: number;
  total_metier: number;
  by_impact: { fort: number; moyen: number; faible: number };
  by_indicator: { "23": number; "24": number; "25": number; "26": number };
  last_collected: string | null;
  last_newsletter: string | null;
  next_newsletter: string;
  subscribers_count: number;
  newsletters_count: number;
  db_initialized?: boolean;
}

function formatDateFr(dateStr: string | null): string {
  if (!dateStr) return "Aucune";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardStats({ firstName }: { firstName: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.error && !data.total_articles && data.total_articles !== 0) {
          setError(data.error);
        } else {
          setStats(data);
        }
      })
      .catch(() => setError("Impossible de charger les statistiques."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  const hasData = stats.total_articles > 0;

  const mainCards = [
    {
      label: "Articles de veille",
      value: stats.total_reglementaire + stats.total_metier,
      icon: FileSearch,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Appels d'offres",
      value: stats.total_ao,
      icon: Megaphone,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Newsletters envoyees",
      value: stats.newsletters_count,
      icon: Mail,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Abonnes actifs",
      value: stats.subscribers_count,
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  const indicatorLabels: Record<string, string> = {
    "23": "Veille légale et réglementaire",
    "24": "Compétences, métiers, emplois",
    "25": "Innovations pédagogiques",
    "26": "Handicap et compensations",
  };

  const indicatorColors: Record<string, string> = {
    "23": "bg-blue-100 text-blue-800",
    "24": "bg-green-100 text-green-800",
    "25": "bg-purple-100 text-purple-800",
    "26": "bg-teal-100 text-teal-800",
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Bienvenue, {firstName} !
        </h1>
        <p className="text-gray-600 mt-1">
          Votre tableau de bord de veille Qualiopi
        </p>
      </div>

      {!hasData && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center mb-8">
          <DatabaseZap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            {stats.db_initialized === false
              ? "Base de données non initialisee"
              : "La collecté demarre bientot"}
          </h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Vos premiers contenus arriveront sous 24h. Vous recevrez votre
            premiere newsletter mardi a 8h.
          </p>
        </div>
      )}

      {/* Main stat cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {mainCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 p-6"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}
                >
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <span className="text-sm font-medium text-gray-500">
                  {stat.label}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {hasData && (
        <div className="grid sm:grid-cols-2 gap-6 mb-8">
          {/* Impact breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-gray-500" />
              <h3 className="font-semibold text-gray-900">
                Répartition par impact
              </h3>
            </div>
            <div className="space-y-3">
              {[
                {
                  label: "Fort",
                  value: stats.by_impact.fort,
                  color: "bg-red-500",
                  badge: "bg-red-100 text-red-800",
                },
                {
                  label: "Moyen",
                  value: stats.by_impact.moyen,
                  color: "bg-amber-500",
                  badge: "bg-amber-100 text-amber-800",
                },
                {
                  label: "Faible",
                  value: stats.by_impact.faible,
                  color: "bg-green-500",
                  badge: "bg-green-100 text-green-800",
                },
              ].map((item) => {
                const total =
                  stats.by_impact.fort +
                  stats.by_impact.moyen +
                  stats.by_impact.faible;
                const pct = total > 0 ? (item.value / total) * 100 : 0;
                return (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded ${item.badge}`}
                      >
                        {item.label}
                      </span>
                      <span className="text-sm font-medium text-gray-600">
                        {item.value}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`${item.color} h-2 rounded-full transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Indicators breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-gray-500" />
              <h3 className="font-semibold text-gray-900">
                Indicateurs Qualiopi
              </h3>
            </div>
            <div className="space-y-3">
              {(["23", "24", "25", "26"] as const).map((ind) => (
                <div
                  key={ind}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded ${indicatorColors[ind]}`}
                    >
                      {ind}
                    </span>
                    <span className="text-sm text-gray-600">
                      {indicatorLabels[ind]}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    {stats.by_indicator[ind]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Timeline info */}
      <div className="grid sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-500">
              Derniere collecté
            </span>
          </div>
          <p className="text-sm font-semibold text-gray-900">
            {formatDateFr(stats.last_collected)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-500">
              Derniere newsletter
            </span>
          </div>
          <p className="text-sm font-semibold text-gray-900">
            {formatDateFr(stats.last_newsletter)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-2">
            <CalendarClock className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-500">
              Prochaine newsletter
            </span>
          </div>
          <p className="text-sm font-semibold text-gray-900">
            Mardi {stats.next_newsletter} a 8h
          </p>
        </div>
      </div>
    </div>
  );
}
