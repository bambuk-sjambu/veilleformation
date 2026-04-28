"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, CheckCircle2, AlertCircle, Clock, XCircle } from "lucide-react";

interface SourceHealth {
  source: string;
  n_7j: number;
  n_30j: number;
  n_total: number;
  last_seen: string | null;
  days_since: number | null;
  n_enriched: number;
  n_failed: number;
  status: "ok" | "intermittent" | "silencieuse" | "morte";
  enrichment_pct: number;
}

const STATUS_CONFIG = {
  ok: {
    label: "Active",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle2,
    iconColor: "text-green-600",
    description: "Collecte OK ces 2 derniers jours",
  },
  intermittent: {
    label: "Intermittente",
    color: "bg-blue-100 text-blue-800",
    icon: Clock,
    iconColor: "text-blue-600",
    description: "Collecte 3-7 derniers jours",
  },
  silencieuse: {
    label: "Silencieuse",
    color: "bg-yellow-100 text-yellow-800",
    icon: AlertCircle,
    iconColor: "text-yellow-600",
    description: "Pas de collecte depuis 8-30 jours",
  },
  morte: {
    label: "Morte",
    color: "bg-red-100 text-red-800",
    icon: XCircle,
    iconColor: "text-red-600",
    description: "Pas de collecte depuis plus de 30 jours",
  },
};

// Mapping source -> axe metier (réglementaire vs appels d'offres).
// Utilise pour scinder le tableau en 2 vues distinctes.
const SOURCE_TO_AXIS: Record<string, "reglementaire" | "ao"> = {
  // Réglementaire (indicateurs 23-26 Qualiopi)
  jorf: "reglementaire",
  centre_inffo: "reglementaire",
  legifrance: "reglementaire",
  france_competences: "reglementaire",
  // Appels d'offres formation
  boamp: "ao",
  opco_akto: "ao",
  opco_2i: "ao",
  opco_ep: "ao",
  opco_sante: "ao",
  opcommerce: "ao",
  uniformation: "ao",
  ocapiat: "ao",
  france_travail: "ao",
  region: "ao",
};

const SOURCE_LABELS: Record<string, string> = {
  boamp: "BOAMP (appels d'offres publics)",
  centre_inffo: "Centre Inffo (Quotidien Formation)",
  jorf: "JORF (Journal Officiel)",
  opco_akto: "OPCO AKTO (services, hôtellerie)",
  opco_2i: "OPCO 2i (industries)",
  opco_ep: "OPCO EP (entreprises de proximité)",
  opco_sante: "OPCO Santé",
  opcommerce: "OPCOMMERCE (commerce)",
  uniformation: "Uniformation (cohésion sociale)",
  ocapiat: "OCAPIAT (agroalimentaire)",
  france_travail: "France Travail",
  legifrance: "Légifrance (API PISTE)",
  region: "Conseils Régionaux (13)",
  france_competences: "France Compétences",
};

// Estimation de couverture par axe.
// Base : ce que les sources actives en prod capturent vs l'univers theorique.
const COVERAGE = {
  reglementaire: {
    pct: 80,
    label: "Veille réglementaire",
    desc: "Indicateurs 23-26 Qualiopi (textes officiels + actualité formation)",
    breakdown: [
      { source: "JORF (DILA)", contrib: "+50%", note: "décrets, arrêtés, lois" },
      { source: "Centre Inffo", contrib: "+30%", note: "actu sectorielle (Quotidien Formation)" },
      { source: "Légifrance API PISTE", contrib: "−20%", note: "désactivé (compte PISTE non finalisé)" },
    ],
    color: "bg-blue-500",
  },
  ao: {
    pct: 73,
    label: "Appels d'offres formation",
    desc: "AAP/AO sur la formation professionnelle, tous achteurs",
    breakdown: [
      { source: "BOAMP (≥40k€ HT)", contrib: "+60%", note: "tous AO publics au-dessus du seuil légal" },
      { source: "5 OPCO sectoriels (sub-seuil)", contrib: "+13%", note: "AKTO, OPCO 2i, OPCO Santé, OPCOMMERCE, Uniformation" },
      { source: "France Travail", contrib: "−10%", note: "désactivé (aucune page publique scrapable)" },
      { source: "Conseils Régionaux (13)", contrib: "−12%", note: "désactivé (240s/run trop lent)" },
      { source: "OCAPIAT, ATLAS, Mobilités", contrib: "−5%", note: "IP datacenter Hetzner bloquée" },
    ],
    color: "bg-amber-500",
  },
};

export default function SourcesHealthPage() {
  const [sources, setSources] = useState<SourceHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sources/health", { cache: "no-store" });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const data = await res.json();
      setSources(data.sources || []);
      setGeneratedAt(data.generated_at || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const counts = {
    ok: sources.filter((s) => s.status === "ok").length,
    intermittent: sources.filter((s) => s.status === "intermittent").length,
    silencieuse: sources.filter((s) => s.status === "silencieuse").length,
    morte: sources.filter((s) => s.status === "morte").length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/dashboard/parametres"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Retour aux paramètres
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Santé des sources de collecte</h1>
            <button
              onClick={fetchHealth}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Rafraîchir
            </button>
          </div>
          {generatedAt && (
            <p className="text-xs text-gray-500 mt-1">
              Mis à jour : {new Date(generatedAt).toLocaleString("fr-FR")}
            </p>
          )}
        </div>

        {/* Coverage estimate per axis */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {(["reglementaire", "ao"] as const).map((axisKey) => {
            const c = COVERAGE[axisKey];
            return (
              <div key={axisKey} className="bg-white rounded-lg shadow-sm p-5">
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">{c.label}</h3>
                  <span className="text-3xl font-bold text-gray-900">{c.pct}%</span>
                </div>
                <p className="text-xs text-gray-500 mb-3">{c.desc}</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                  <div
                    className={`h-2 rounded-full ${c.color}`}
                    style={{ width: `${c.pct}%` }}
                  />
                </div>
                <ul className="space-y-1.5 text-xs">
                  {c.breakdown.map((b, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span
                        className={`font-mono font-semibold ${
                          b.contrib.startsWith("+") ? "text-green-700" : "text-red-600"
                        }`}
                      >
                        {b.contrib}
                      </span>
                      <span className="text-gray-700">
                        <strong>{b.source}</strong> — {b.note}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {(Object.keys(STATUS_CONFIG) as Array<keyof typeof STATUS_CONFIG>).map((key) => {
            const cfg = STATUS_CONFIG[key];
            const Icon = cfg.icon;
            return (
              <div key={key} className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center">
                  <Icon className={`w-8 h-8 ${cfg.iconColor}`} />
                  <div className="ml-3">
                    <p className="text-2xl font-bold text-gray-900">{counts[key]}</p>
                    <p className="text-sm text-gray-600">{cfg.label}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Sources tables - splitted by axis */}
        {(() => {
          const reglSources = sources.filter((s) => SOURCE_TO_AXIS[s.source] === "reglementaire");
          const aoSources = sources.filter((s) => SOURCE_TO_AXIS[s.source] === "ao");
          const otherSources = sources.filter((s) => !SOURCE_TO_AXIS[s.source]);

          const renderTable = (title: string, color: string, list: SourceHealth[]) => (
            <div className="mb-6">
              <h2 className={`text-lg font-semibold mb-2 ${color}`}>{title}</h2>
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">7 jours</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">30 jours</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Dernier</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Enrichis IA</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {list.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500 text-sm">
                          Aucune source enregistrée pour cet axe.
                        </td>
                      </tr>
                    ) : (
                      list.map((s) => {
                        const cfg = STATUS_CONFIG[s.status];
                        return (
                          <tr key={s.source}>
                            <td className="px-6 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {SOURCE_LABELS[s.source] || s.source}
                              </div>
                              <div className="text-xs text-gray-500 font-mono">{s.source}</div>
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-gray-900 font-medium">{s.n_7j}</td>
                            <td className="px-4 py-3 text-right text-sm text-gray-700">{s.n_30j}</td>
                            <td className="px-4 py-3 text-right text-sm text-gray-500">{s.n_total}</td>
                            <td className="px-4 py-3 text-right text-sm text-gray-700">
                              {s.days_since !== null ? `il y a ${s.days_since}j` : "—"}
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-gray-700">
                              {s.enrichment_pct}%
                              {s.n_failed > 0 && (
                                <span className="text-xs text-red-600 ml-1">({s.n_failed} fail)</span>
                              )}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${cfg.color}`}>
                                {cfg.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );

          if (loading && sources.length === 0) {
            return (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
                Chargement...
              </div>
            );
          }

          return (
            <>
              {renderTable("Veille réglementaire (indicateurs 23-26 Qualiopi)", "text-blue-700", reglSources)}
              {renderTable("Appels d'offres formation", "text-amber-700", aoSources)}
              {otherSources.length > 0 && renderTable("Autres sources", "text-gray-700", otherSources)}
            </>
          );
        })()}

        {/* Legend */}
        <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Légende des statuts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(Object.keys(STATUS_CONFIG) as Array<keyof typeof STATUS_CONFIG>).map((key) => {
              const cfg = STATUS_CONFIG[key];
              const Icon = cfg.icon;
              return (
                <div key={key} className="flex items-start text-sm">
                  <Icon className={`w-5 h-5 ${cfg.iconColor} mr-2 mt-0.5 flex-shrink-0`} />
                  <div>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mr-2 ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    <span className="text-gray-600">{cfg.description}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Une source <strong>Morte</strong> (&gt;30j sans collecte) est candidate au retrait. Une source{" "}
            <strong>Silencieuse</strong> (8-30j) doit être surveillée.
          </p>
        </div>
      </div>
    </div>
  );
}
