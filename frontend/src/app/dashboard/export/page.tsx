"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Profile {
  company_name: string;
  siret: string | null;
  nde: string | null;
  responsible_name: string | null;
}

interface Stats {
  totalArticles: number;
  totalActions: number;
  actionsDone: number;
  actionsInProgress: number;
  byIndicator: Record<string, number>;
}

export default function ExportPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Date range - default to last 30 days
  const [dateStart, setDateStart] = useState(() => {
    const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return d.toISOString().split("T")[0];
  });
  const [dateEnd, setDateEnd] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profileRes, articlesRes, actionsRes] = await Promise.all([
        fetch("/api/profile"),
        fetch("/api/articles?limit=1000"),
        fetch("/api/actions?limit=1000"),
      ]);

      const profileData = await profileRes.json();
      const articlesData = await articlesRes.json();
      const actionsData = await actionsRes.json();

      setProfile(profileData.profile);

      // Calculate stats
      const articles = articlesData.articles || [];
      const actions = actionsData.actions || [];

      const byIndicator: Record<string, number> = { "23": 0, "24": 0, "25": 0, "26": 0 };
      articles.forEach((a: { qualiopi_indicators: string | null }) => {
        if (a.qualiopi_indicators) {
          a.qualiopi_indicators.split(",").forEach((ind: string) => {
            const i = ind.trim();
            if (byIndicator[i] !== undefined) {
              byIndicator[i]++;
            }
          });
        } else {
          byIndicator["23"]++;
        }
      });

      setStats({
        totalArticles: articles.length,
        totalActions: actions.length,
        actionsDone: actions.filter((a: { status: string }) => a.status === "fait").length,
        actionsInProgress: actions.filter((a: { status: string }) => a.status === "en_cours").length,
        byIndicator,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setGenerating(true);
    try {
      const url = `/api/export/audit?date_start=${dateStart}&date_end=${dateEnd}`;
      const res = await fetch(url);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erreur lors de la génération");
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `audit-qualiopi-${dateStart}-${dateEnd}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      a.remove();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erreur lors de la génération du PDF");
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Export Audit Qualiopi</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Warning */}
        {!profile?.company_name && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-yellow-800">Profil incomplet</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Complétez votre profil entreprise pour personnaliser le rapport d&apos;audit.
                </p>
                <Link href="/dashboard/settings" className="mt-2 inline-block text-sm font-medium text-yellow-800 hover:text-yellow-900 underline">
                  Configurer le profil
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Stats Summary */}
        {stats && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Aperçu des données</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.totalArticles}</div>
                <div className="text-xs text-gray-500">Articles</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.actionsDone}</div>
                <div className="text-xs text-gray-500">Actions faites</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{stats.actionsInProgress}</div>
                <div className="text-xs text-gray-500">En cours</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{stats.byIndicator["23"]}</div>
                <div className="text-xs text-gray-500">Ind. 23</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-indigo-600">{stats.byIndicator["24"] + stats.byIndicator["25"] + stats.byIndicator["26"]}</div>
                <div className="text-xs text-gray-500">Ind. 24-26</div>
              </div>
            </div>
          </div>
        )}

        {/* Export Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Configurer l&apos;export</h2>

          {/* Profile Info */}
          {profile && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Entreprise</h3>
              <p className="text-blue-800 font-semibold">{profile.company_name}</p>
              {profile.responsible_name && (
                <p className="text-sm text-blue-700">
                  Responsable: {profile.responsible_name}
                </p>
              )}
            </div>
          )}

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de debut
              </label>
              <input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de fin
              </label>
              <input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Export Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Le rapport contiendra :</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Page de garde avec informations entreprise</li>
              <li>• Résumé exécutif avec KPIs</li>
              <li>• Détail par indicateur Qualiopi (23, 24, 25, 26)</li>
              <li>• Liste des actions menées avec statuts</li>
              <li>• Méthodologie de veille (si configurée)</li>
            </ul>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={generating}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center"
          >
            {generating ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Génération en cours...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Télécharger le PDF
              </>
            )}
          </button>
        </div>

        {/* Help */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Conseil pour l&apos;audit Qualiopi</h3>
          <p className="text-sm text-blue-700">
            Ce rapport sert de preuve de veille pour les indicateurs 23 à 26 du référentiel Qualiopi.
            Imprimez-le et conservez-le dans vos documents qualité. Il est recommandé de générer un
            rapport mensuel ou trimestriel selon votre frequence d&apos;audit.
          </p>
        </div>
      </main>
    </div>
  );
}
