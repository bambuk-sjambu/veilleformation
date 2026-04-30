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
  MessageCircle,
  X,
} from "lucide-react";
import { sector } from "@/config";

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

interface PanelUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  plan: string | null;
  created_at: string;
  is_feedback_panel: number | null;
  feedback_count: number;
  last_feedback_at: string | null;
  company: string | null;
}

interface FeedbackItem {
  id: number;
  user_id: number;
  category: string;
  page: string;
  rating: number | null;
  text: string;
  screenshot_url: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string | null;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
}

const FEEDBACK_STATUSES = [
  "nouveau",
  "traite",
  "reporte",
  "pas_pour_nous",
  "supprime",
] as const;

const STATUS_LABELS: Record<string, string> = {
  nouveau: "Nouveau",
  traite: "Traite",
  reporte: "Reporte",
  pas_pour_nous: "Pas pour nous",
  supprime: "Supprimer",
};

const STATUS_BADGE: Record<string, string> = {
  nouveau: "bg-blue-100 text-blue-800",
  traite: "bg-green-100 text-green-800",
  reporte: "bg-amber-100 text-amber-800",
  pas_pour_nous: "bg-gray-100 text-gray-700",
  supprime: "bg-red-100 text-red-800",
};

const CATEGORY_LABELS: Record<string, string> = {
  bug: "Bug",
  manque: "Manque",
  suggestion: "Suggestion",
  confus: "Confus",
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

  // Panel feedback
  const [panelUsers, setPanelUsers] = useState<PanelUser[]>([]);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedFb, setSelectedFb] = useState<FeedbackItem | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [previewNl, setPreviewNl] = useState<{
    id: number;
    subject: string;
    html: string | null;
    loading: boolean;
  } | null>(null);

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

  const fetchPanel = useCallback(async () => {
    setPanelLoading(true);
    setPanelError(null);
    try {
      const res = await fetch("/api/admin/feedback-panel", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const json = (await res.json()) as { users: PanelUser[] };
      setPanelUsers(json.users || []);
    } catch (e) {
      setPanelError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setPanelLoading(false);
    }
  }, []);

  const fetchFeedbacks = useCallback(async (filter: string) => {
    setFeedbackLoading(true);
    setFeedbackError(null);
    try {
      const url = filter
        ? `/api/admin/feedback?status=${encodeURIComponent(filter)}`
        : "/api/admin/feedback";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const json = (await res.json()) as { feedbacks: FeedbackItem[] };
      setFeedbacks(json.feedbacks || []);
    } catch (e) {
      setFeedbackError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setFeedbackLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
    fetchPanel();
    fetchFeedbacks("");
  }, [fetchOverview, fetchPanel, fetchFeedbacks]);

  useEffect(() => {
    fetchFeedbacks(statusFilter);
  }, [statusFilter, fetchFeedbacks]);

  async function togglePanel(userId: number, current: number | null) {
    const next = Number(current) === 1 ? 0 : 1;
    // Optimistic
    setPanelUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, is_feedback_panel: next } : u
      )
    );
    try {
      const res = await fetch("/api/admin/feedback-panel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          is_feedback_panel: next,
        }),
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
    } catch (e) {
      // Rollback
      setPanelUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, is_feedback_panel: current } : u
        )
      );
      setPanelError(e instanceof Error ? e.message : "Erreur toggle");
    }
  }

  async function openNewsletterPreview(id: number, subject: string) {
    setPreviewNl({ id, subject, html: null, loading: true });
    try {
      const res = await fetch(`/api/newsletters?id=${id}`);
      const data = (await res.json()) as {
        newsletter?: { html_content?: string | null };
      };
      const html = data?.newsletter?.html_content || null;
      setPreviewNl({ id, subject, html, loading: false });
    } catch {
      setPreviewNl({ id, subject, html: null, loading: false });
    }
  }

  async function changeFeedbackStatus(id: number, newStatus: string) {
    // "supprime" n'est pas un vrai statut : declenche la suppression reelle.
    if (newStatus === "supprime") {
      const ok = window.confirm(
        `Supprimer définitivement ce retour #${id} ?\n\nCette action est irréversible (capture incluse).`
      );
      if (!ok) {
        // Force le re-render pour que le select reflete l'ancien statut
        setFeedbacks((prev) => [...prev]);
        return;
      }
      try {
        const res = await fetch(`/api/admin/feedback?id=${id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error || `Erreur ${res.status}`);
        }
        setFeedbacks((prev) => prev.filter((f) => f.id !== id));
        if (selectedFb?.id === id) setSelectedFb(null);
      } catch (e) {
        setFeedbackError(e instanceof Error ? e.message : "Erreur suppression");
        fetchFeedbacks(statusFilter);
      }
      return;
    }

    // Optimistic
    setFeedbacks((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: newStatus } : f))
    );
    try {
      const res = await fetch("/api/admin/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
    } catch (e) {
      setFeedbackError(e instanceof Error ? e.message : "Erreur statut");
      // Reload pour resync
      fetchFeedbacks(statusFilter);
    }
  }

  async function saveNotes() {
    if (!selectedFb) return;
    setSavingNotes(true);
    try {
      const res = await fetch("/api/admin/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedFb.id,
          status: selectedFb.status,
          admin_notes: editNotes,
        }),
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      setFeedbacks((prev) =>
        prev.map((f) =>
          f.id === selectedFb.id ? { ...f, admin_notes: editNotes } : f
        )
      );
      setSelectedFb({ ...selectedFb, admin_notes: editNotes });
    } catch (e) {
      setFeedbackError(e instanceof Error ? e.message : "Erreur notes");
    } finally {
      setSavingNotes(false);
    }
  }

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
                Admin {sector.brand.name}
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
                    <tr
                      key={n.id}
                      onClick={() =>
                        openNewsletterPreview(n.id, n.subject)
                      }
                      className="cursor-pointer hover:bg-blue-50 transition"
                      title="Cliquer pour afficher la newsletter"
                    >
                      <td className="px-6 py-3 text-sm font-medium text-blue-700">
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

        {/* SECTION 8 — Panel feedback */}
        <section id="feedback" className="mb-8 scroll-mt-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Panel feedback
          </h2>

          {/* Sous-section A — Users */}
          <div className="mb-6">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Utilisateurs (cocher pour activer le panel)
            </h3>
            {panelError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-2 text-red-700 text-sm">
                {panelError}
              </div>
            )}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Organisme
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Plan
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Inscrit le
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      Panel ?
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                      Retours
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Dernier
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {panelLoading && panelUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-6 text-center text-gray-500 text-sm"
                      >
                        Chargement...
                      </td>
                    </tr>
                  ) : panelUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-6 text-center text-gray-500 text-sm"
                      >
                        Aucun utilisateur
                      </td>
                    </tr>
                  ) : (
                    panelUsers.map((u) => (
                      <tr key={u.id}>
                        <td className="px-4 py-2 text-sm text-gray-900 font-medium">
                          {u.email}
                          {u.first_name || u.last_name ? (
                            <div className="text-xs text-gray-500">
                              {u.first_name} {u.last_name}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">
                          {u.company || "—"}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">
                          {PLAN_LABELS[(u.plan || "").toLowerCase()] ||
                            u.plan ||
                            "—"}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {formatDate(u.created_at)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={Number(u.is_feedback_panel) === 1}
                            onChange={() =>
                              togglePanel(u.id, u.is_feedback_panel)
                            }
                            className="w-4 h-4 text-blue-700 rounded focus:ring-blue-700 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-2 text-right text-sm font-semibold text-gray-900">
                          {u.feedback_count}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {formatDate(u.last_feedback_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sous-section B — Feedbacks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Retours recus
              </h3>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
              >
                <option value="">Tous statuts</option>
                {FEEDBACK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            {feedbackError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-2 text-red-700 text-sm">
                {feedbackError}
              </div>
            )}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      OF
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Page
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Categ.
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Note
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Extrait
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {feedbackLoading && feedbacks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-6 text-center text-gray-500 text-sm"
                      >
                        Chargement...
                      </td>
                    </tr>
                  ) : feedbacks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-6 text-center text-gray-500 text-sm"
                      >
                        Aucun retour pour ce filtre
                      </td>
                    </tr>
                  ) : (
                    feedbacks.map((f) => (
                      <tr
                        key={f.id}
                        onClick={() => {
                          setSelectedFb(f);
                          setEditNotes(f.admin_notes || "");
                        }}
                        className="cursor-pointer hover:bg-gray-50"
                      >
                        <td className="px-4 py-2 text-sm text-gray-500 whitespace-nowrap">
                          {formatDate(f.created_at)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          <div className="font-medium">{f.email || "—"}</div>
                          {f.first_name || f.last_name ? (
                            <div className="text-xs text-gray-500">
                              {f.first_name} {f.last_name}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-600 font-mono max-w-[160px] truncate">
                          {f.page}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">
                          {CATEGORY_LABELS[f.category] || f.category}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">
                          {f.rating ? `${f.rating}/5` : "—"}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700 max-w-[280px] truncate">
                          {f.text}
                        </td>
                        <td
                          className="px-4 py-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <select
                            value={f.status}
                            onChange={(e) =>
                              changeFeedbackStatus(f.id, e.target.value)
                            }
                            className={`text-xs rounded px-2 py-1 border-0 font-medium ${
                              STATUS_BADGE[f.status] || "bg-gray-100"
                            }`}
                          >
                            {FEEDBACK_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {STATUS_LABELS[s]}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Modal detail feedback */}
        {previewNl && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setPreviewNl(null)}
          >
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                <div className="min-w-0">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">
                    Newsletter
                  </div>
                  <div className="font-semibold text-gray-900 truncate">
                    {previewNl.subject}
                  </div>
                </div>
                <button
                  onClick={() => setPreviewNl(null)}
                  className="p-1 rounded hover:bg-gray-100 text-gray-500 ml-2"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden bg-gray-100">
                {previewNl.loading ? (
                  <div className="flex items-center justify-center h-96 text-gray-500">
                    Chargement...
                  </div>
                ) : previewNl.html ? (
                  <iframe
                    srcDoc={previewNl.html}
                    sandbox="allow-same-origin"
                    title={previewNl.subject}
                    className="w-full h-[75vh] bg-white"
                  />
                ) : (
                  <div className="flex items-center justify-center h-96 text-gray-500">
                    Aucun contenu HTML disponible.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {selectedFb && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setSelectedFb(null)}
          >
            <div
              className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 sticky top-0 bg-white">
                <h2 className="font-semibold text-gray-900">
                  Feedback #{selectedFb.id}
                </h2>
                <button
                  onClick={() => setSelectedFb(null)}
                  className="p-1 rounded hover:bg-gray-100 text-gray-500"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="px-5 py-4 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-gray-500 uppercase">De</div>
                    <div className="text-gray-900 font-medium">
                      {selectedFb.email}
                    </div>
                    <div className="text-xs text-gray-500">
                      {selectedFb.first_name} {selectedFb.last_name}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase">Date</div>
                    <div className="text-gray-700">
                      {formatDate(selectedFb.created_at)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase">Page</div>
                    <div className="text-gray-700 font-mono text-xs break-all">
                      {selectedFb.page}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase">
                      Categorie / Note
                    </div>
                    <div className="text-gray-700">
                      {CATEGORY_LABELS[selectedFb.category] ||
                        selectedFb.category}
                      {selectedFb.rating ? ` — ${selectedFb.rating}/5` : ""}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">
                    Message
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-gray-800 whitespace-pre-wrap">
                    {selectedFb.text}
                  </div>
                </div>
                {selectedFb.screenshot_url && (
                  <div>
                    <div className="text-xs text-gray-500 uppercase mb-1">
                      Capture
                    </div>
                    <a
                      href={selectedFb.screenshot_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedFb.screenshot_url}
                        alt="screenshot"
                        className="max-h-64 rounded-lg border border-gray-200"
                      />
                    </a>
                  </div>
                )}
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">
                    Notes admin
                  </div>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={3}
                    maxLength={2000}
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-700 focus:border-blue-700 outline-none"
                    placeholder="Notes internes..."
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-3 sticky bottom-0 bg-white">
                <button
                  onClick={() => setSelectedFb(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Fermer
                </button>
                <button
                  onClick={saveNotes}
                  disabled={savingNotes}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:opacity-50"
                >
                  {savingNotes ? "Enregistrement..." : "Enregistrer notes"}
                </button>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400 text-center mt-8">
          {sector.brand.name} — vue admin réservée aux super-admins. Données live, non mises en cache.
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
