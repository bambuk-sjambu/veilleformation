"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  Users,
  CreditCard,
  FileText,
  Mail,
  Activity,
  Building2,
  Euro,
  TrendingUp,
} from "lucide-react";

interface KpisBlock {
  total_inscrits: number;
  total_payants: number;
  mrr_estime: number;
  places_restantes_lancement: number;
}
interface RecentSignup {
  type: "Newsletter" | "Compte";
  email: string;
  plan: string;
  organisme: string | null;
  created_at: string;
}
interface ActivityBlock {
  read_this_week: number;
  starred_this_week: number;
  actions_total: number;
  actions_done_this_week: number;
  actions_todo: number;
}
interface SourcesBlock {
  enriched_total: number;
  enriched_this_week: number;
  failed_this_week: number;
  top: Array<{ source: string; n_7j: number; last_seen: string | null }>;
}
interface NewsletterRow {
  id: number;
  edition_number: number;
  sent_at: string | null;
  recipients_count: number;
  subject: string;
  brevo_campaign_id: string | null;
}
interface StripeBlock {
  active_by_plan: Record<string, number>;
  trials: number;
  revenue_30d_estime: number;
}
interface TeamsBlock {
  total: number;
  avg_size: number;
  members_invited: number;
  members_accepted: number;
}
interface OverviewResponse {
  kpis: KpisBlock;
  recent_signups: RecentSignup[];
  activity: ActivityBlock;
  sources: SourcesBlock;
  newsletters: NewsletterRow[];
  stripe: StripeBlock;
  teams: TeamsBlock;
  generated_at: string;
}

const PLAN_LABELS: Record<string, string> = {
  free: "Gratuit",
  gratuit: "Gratuit",
  solo: "Solo",
  equipe: "Equipe",
  agence: "Agence",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-FR");
  } catch {
    return iso;
  }
}

function formatEur(n: number): string {
  return n.toLocaleString("fr-FR") + " €";
}

export default function AdminDashboard() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/overview", { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 403) throw new Error("Acces refuse — super-admin requis.");
        throw new Error(`Erreur ${res.status}`);
      }
      const json = (await res.json()) as OverviewResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Retour au dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Admin Cipia
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Vue d&apos;ensemble super-admin — KPIs, abonnés, activité, sources
              </p>
            </div>
            <button
              onClick={fetchOverview}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Rafraîchir
            </button>
          </div>
          {data?.generated_at && (
            <p className="text-xs text-gray-500 mt-1">
              Mis à jour : {formatDate(data.generated_at)}
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* SECTION 1 — KPIs commerciaux */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            KPIs commerciaux
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon={Users}
              label="Total inscrits"
              value={data?.kpis.total_inscrits ?? 0}
              hint="Newsletter + comptes (uniques)"
              iconColor="text-blue-600"
            />
            <KpiCard
              icon={CreditCard}
              label="Payants"
              value={data?.kpis.total_payants ?? 0}
              hint="Plans Solo / Équipe / Agence"
              iconColor="text-green-600"
            />
            <KpiCard
              icon={Euro}
              label="MRR estimé"
              value={data ? formatEur(data.kpis.mrr_estime) : "—"}
              hint="Somme des plans actifs"
              iconColor="text-purple-600"
            />
            <KpiCard
              icon={TrendingUp}
              label="Places lancement -30%"
              value={data?.kpis.places_restantes_lancement ?? 0}
              hint="Sur 200 places initiales"
              iconColor="text-amber-600"
            />
          </div>
        </section>

        {/* SECTION 2 — Inscrits récents */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            10 derniers inscrits
          </h2>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Plan
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Organisme
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading && !data ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      Chargement...
                    </td>
                  </tr>
                ) : !data?.recent_signups || data.recent_signups.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      Aucune donnée pour le moment
                    </td>
                  </tr>
                ) : (
                  data.recent_signups.map((s, i) => (
                    <tr key={`${s.type}-${s.email}-${i}`}>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">
                        {formatDate(s.created_at)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            s.type === "Compte"
                              ? "bg-green-100 text-green-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {s.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        {s.email}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {PLAN_LABELS[s.plan?.toLowerCase()] || s.plan || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {s.organisme || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 3 — Activité */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Activité 7 derniers jours
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard
              icon={FileText}
              label="Articles lus (7j)"
              value={data?.activity.read_this_week ?? 0}
              hint="is_read = 1 cette semaine"
              iconColor="text-blue-600"
            />
            <KpiCard
              icon={Activity}
              label="Articles favoris (7j)"
              value={data?.activity.starred_this_week ?? 0}
              hint="is_starred = 1 cette semaine"
              iconColor="text-amber-600"
            />
            <KpiCard
              icon={CreditCard}
              label="Plan d'action"
              value={data?.activity.actions_total ?? 0}
              hint={
                data
                  ? `${data.activity.actions_done_this_week} faits 7j • ${data.activity.actions_todo} à faire`
                  : "—"
              }
              iconColor="text-green-600"
            />
          </div>
        </section>

        {/* SECTION 4 — Sources & IA */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Sources &amp; IA
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <KpiCard
              icon={FileText}
              label="Enrichis IA total"
              value={data?.sources.enriched_total ?? 0}
              hint="Articles status = done/sent"
              iconColor="text-purple-600"
            />
            <KpiCard
              icon={Activity}
              label="Enrichis 7j"
              value={data?.sources.enriched_this_week ?? 0}
              hint="processed_at récent"
              iconColor="text-green-600"
            />
            <KpiCard
              icon={Activity}
              label="Échecs IA 7j"
              value={data?.sources.failed_this_week ?? 0}
              hint="status = failed"
              iconColor="text-red-600"
            />
          </div>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Source
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Articles 7j
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Dernier
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {!data?.sources.top || data.sources.top.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                      Aucune donnée pour le moment
                    </td>
                  </tr>
                ) : (
                  data.sources.top.map((s) => (
                    <tr key={s.source}>
                      <td className="px-6 py-3 text-sm text-gray-900 font-medium font-mono">
                        {s.source}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700">
                        {s.n_7j}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-500">
                        {formatDate(s.last_seen)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 5 — Newsletter */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            5 dernières newsletters
          </h2>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Édition
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Sujet
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Destinataires
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Envoyée
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Brevo ID
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {!data?.newsletters || data.newsletters.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      Aucune donnée pour le moment
                    </td>
                  </tr>
                ) : (
                  data.newsletters.map((n) => (
                    <tr key={n.id}>
                      <td className="px-6 py-3 text-sm font-medium text-gray-900">
                        #{n.edition_number}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {n.subject}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700">
                        {n.recipients_count}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(n.sent_at)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                        {n.brevo_campaign_id || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 6 — Stripe */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Stripe / Abonnements
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-sm p-5">
              <div className="flex items-center mb-3">
                <CreditCard className="w-5 h-5 text-blue-600 mr-2" />
                <h3 className="text-sm font-semibold text-gray-900">
                  Abonnements actifs
                </h3>
              </div>
              {data ? (
                <ul className="space-y-1.5 text-sm">
                  {Object.entries(data.stripe.active_by_plan).map(([plan, n]) => (
                    <li key={plan} className="flex justify-between">
                      <span className="text-gray-600">
                        {PLAN_LABELS[plan] || plan}
                      </span>
                      <span className="font-semibold text-gray-900">{n}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">Aucune donnée pour le moment</p>
              )}
            </div>

            <KpiCard
              icon={Activity}
              label="Trials en cours"
              value={data?.stripe.trials ?? 0}
              hint="subscription_status = trialing"
              iconColor="text-amber-600"
            />

            <KpiCard
              icon={Euro}
              label="Revenus 30j (estim.)"
              value={data ? formatEur(data.stripe.revenue_30d_estime) : "—"}
              hint="Estimation = MRR (table payments absente)"
              iconColor="text-purple-600"
            />
          </div>
        </section>

        {/* SECTION 7 — Équipes */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Équipes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <KpiCard
              icon={Building2}
              label="Équipes actives"
              value={data?.teams.total ?? 0}
              hint={data ? `Taille moyenne : ${data.teams.avg_size}` : "—"}
              iconColor="text-blue-600"
            />
            <div className="bg-white rounded-lg shadow-sm p-5">
              <div className="flex items-center mb-3">
                <Mail className="w-5 h-5 text-green-600 mr-2" />
                <h3 className="text-sm font-semibold text-gray-900">Membres</h3>
              </div>
              {data ? (
                <ul className="space-y-1.5 text-sm">
                  <li className="flex justify-between">
                    <span className="text-gray-600">Acceptés</span>
                    <span className="font-semibold text-gray-900">
                      {data.teams.members_accepted}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-gray-600">Invitations en attente</span>
                    <span className="font-semibold text-gray-900">
                      {data.teams.members_invited}
                    </span>
                  </li>
                </ul>
              ) : (
                <p className="text-sm text-gray-500">Aucune donnée pour le moment</p>
              )}
            </div>
          </div>
        </section>

        <p className="text-xs text-gray-400 text-center mt-8">
          Cipia — vue admin réservée aux super-admins. Données live, non mises en cache.
        </p>
      </div>
    </div>
  );
}

// ===== KpiCard =====
type LucideIcon = typeof Users;

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  iconColor,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  hint?: string;
  iconColor?: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600">{label}</span>
        <Icon className={`w-5 h-5 ${iconColor || "text-gray-400"}`} />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}
