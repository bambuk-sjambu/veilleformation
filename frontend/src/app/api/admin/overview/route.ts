import { NextResponse } from "next/server";
import { getDb, dbExists } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

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
  top: Array<{
    source: string;
    n_7j: number;
    last_seen: string | null;
  }>;
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

const PLAN_PRICES: Record<string, number> = {
  solo: 15,
  equipe: 39,
  agence: 79,
};

const TARGET_LANCEMENT = 200;

export async function GET() {
  // 1. Auth
  const user = await getCurrentUser();
  if (!user || !user.userId) {
    return NextResponse.json(
      { error: "Non autorise" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!dbExists()) {
    return NextResponse.json(
      { error: "Base indisponible" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const db = getDb();

  // 2. Super-admin re-check serveur (jamais se fier au cookie)
  if (!isSuperAdmin(user.userId, db)) {
    return NextResponse.json(
      { error: "Acces refuse" },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

  // Bloc par bloc en try/catch — une table manquante ne doit pas tout casser
  const empty = "—";

  // ===== Section 1 : KPIs =====
  const kpis: KpisBlock = {
    total_inscrits: 0,
    total_payants: 0,
    mrr_estime: 0,
    places_restantes_lancement: TARGET_LANCEMENT,
  };
  try {
    const subsCount = (db
      .prepare("SELECT COUNT(*) AS n FROM subscribers WHERE is_active = 1")
      .get() as { n: number }).n;

    const usersRows = db
      .prepare("SELECT email, plan FROM users")
      .all() as Array<{ email: string; plan: string | null }>;

    const subsEmails = (db
      .prepare("SELECT email FROM subscribers WHERE is_active = 1")
      .all() as Array<{ email: string }>).map((r) => r.email.toLowerCase());

    const userEmailsSet = new Set(
      usersRows.map((u) => (u.email || "").toLowerCase()).filter(Boolean)
    );
    const subsOnlyCount = subsEmails.filter((e) => !userEmailsSet.has(e)).length;
    kpis.total_inscrits = usersRows.length + subsOnlyCount;

    let mrr = 0;
    let payants = 0;
    for (const u of usersRows) {
      const p = (u.plan || "free").toLowerCase();
      if (p in PLAN_PRICES) {
        mrr += PLAN_PRICES[p];
        payants += 1;
      }
    }
    kpis.total_payants = payants;
    kpis.mrr_estime = mrr;
    kpis.places_restantes_lancement = Math.max(0, TARGET_LANCEMENT - payants);
    // suppress lint about unused var
    void subsCount;
  } catch (e) {
    console.error("admin/overview kpis:", e);
  }

  // ===== Section 2 : Inscrits recents =====
  let recent_signups: RecentSignup[] = [];
  try {
    const subsRows = db
      .prepare(
        `SELECT email, organisme, plan, subscribed_at AS created_at
         FROM subscribers
         WHERE is_active = 1
         ORDER BY subscribed_at DESC
         LIMIT 20`
      )
      .all() as Array<{
        email: string;
        organisme: string | null;
        plan: string;
        created_at: string;
      }>;

    const usersRows = db
      .prepare(
        `SELECT email, plan, created_at
         FROM users
         ORDER BY created_at DESC
         LIMIT 20`
      )
      .all() as Array<{
        email: string;
        plan: string | null;
        created_at: string;
      }>;

    const merged: RecentSignup[] = [
      ...subsRows.map((s) => ({
        type: "Newsletter" as const,
        email: s.email,
        plan: s.plan || "gratuit",
        organisme: s.organisme,
        created_at: s.created_at,
      })),
      ...usersRows.map((u) => ({
        type: "Compte" as const,
        email: u.email,
        plan: u.plan || "free",
        organisme: null,
        created_at: u.created_at,
      })),
    ];

    merged.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    recent_signups = merged.slice(0, 10);
  } catch (e) {
    console.error("admin/overview recent_signups:", e);
  }

  // ===== Section 3 : Activite =====
  const activity: ActivityBlock = {
    read_this_week: 0,
    starred_this_week: 0,
    actions_total: 0,
    actions_done_this_week: 0,
    actions_todo: 0,
  };
  try {
    activity.read_this_week = (db
      .prepare(
        `SELECT COUNT(*) AS n FROM articles
         WHERE is_read = 1
         AND processed_at >= date('now','-7 days')`
      )
      .get() as { n: number }).n;
    activity.starred_this_week = (db
      .prepare(
        `SELECT COUNT(*) AS n FROM articles
         WHERE is_starred = 1
         AND processed_at >= date('now','-7 days')`
      )
      .get() as { n: number }).n;
    activity.actions_total = (db
      .prepare("SELECT COUNT(*) AS n FROM actions")
      .get() as { n: number }).n;
    activity.actions_done_this_week = (db
      .prepare(
        `SELECT COUNT(*) AS n FROM actions
         WHERE status = 'fait'
         AND completed_at >= date('now','-7 days')`
      )
      .get() as { n: number }).n;
    activity.actions_todo = (db
      .prepare("SELECT COUNT(*) AS n FROM actions WHERE status = 'a_faire'")
      .get() as { n: number }).n;
  } catch (e) {
    console.error("admin/overview activity:", e);
  }

  // ===== Section 4 : Sources & IA =====
  const sources: SourcesBlock = {
    enriched_total: 0,
    enriched_this_week: 0,
    failed_this_week: 0,
    top: [],
  };
  try {
    sources.enriched_total = (db
      .prepare(
        "SELECT COUNT(*) AS n FROM articles WHERE status = 'done' OR status = 'sent'"
      )
      .get() as { n: number }).n;
    sources.enriched_this_week = (db
      .prepare(
        `SELECT COUNT(*) AS n FROM articles
         WHERE (status = 'done' OR status = 'sent')
         AND processed_at >= date('now','-7 days')`
      )
      .get() as { n: number }).n;
    sources.failed_this_week = (db
      .prepare(
        `SELECT COUNT(*) AS n FROM articles
         WHERE status = 'failed'
         AND collected_at >= date('now','-7 days')`
      )
      .get() as { n: number }).n;

    sources.top = db
      .prepare(
        `SELECT
            source,
            SUM(CASE WHEN collected_at >= date('now','-7 days') THEN 1 ELSE 0 END) AS n_7j,
            MAX(collected_at) AS last_seen
         FROM articles
         GROUP BY source
         ORDER BY n_7j DESC
         LIMIT 5`
      )
      .all() as Array<{ source: string; n_7j: number; last_seen: string | null }>;
  } catch (e) {
    console.error("admin/overview sources:", e);
  }

  // ===== Section 5 : Newsletters =====
  let newsletters: NewsletterRow[] = [];
  try {
    newsletters = db
      .prepare(
        `SELECT id, edition_number, sent_at, recipients_count, subject, brevo_campaign_id
         FROM newsletters
         WHERE sent_at IS NOT NULL
         ORDER BY sent_at DESC
         LIMIT 5`
      )
      .all() as NewsletterRow[];
  } catch (e) {
    console.error("admin/overview newsletters:", e);
  }

  // ===== Section 6 : Stripe =====
  const stripe: StripeBlock = {
    active_by_plan: { free: 0, solo: 0, equipe: 0, agence: 0 },
    trials: 0,
    revenue_30d_estime: 0,
  };
  try {
    const planRows = db
      .prepare(
        `SELECT plan, COUNT(*) AS n FROM users GROUP BY plan`
      )
      .all() as Array<{ plan: string | null; n: number }>;
    for (const r of planRows) {
      const p = (r.plan || "free").toLowerCase();
      stripe.active_by_plan[p] = r.n;
    }

    try {
      const trials = db
        .prepare(
          "SELECT COUNT(*) AS n FROM users WHERE subscription_status = 'trialing'"
        )
        .get() as { n: number };
      stripe.trials = trials.n;
    } catch {
      // colonne absente
      stripe.trials = 0;
    }

    // Pas de table payments en prod a ce jour : estimation = MRR
    stripe.revenue_30d_estime = kpis.mrr_estime;
  } catch (e) {
    console.error("admin/overview stripe:", e);
  }

  // ===== Section 7 : Equipes =====
  const teams: TeamsBlock = {
    total: 0,
    avg_size: 0,
    members_invited: 0,
    members_accepted: 0,
  };
  try {
    teams.total = (db
      .prepare("SELECT COUNT(*) AS n FROM teams")
      .get() as { n: number }).n;
    const totalMembers = (db
      .prepare("SELECT COUNT(*) AS n FROM team_members")
      .get() as { n: number }).n;
    teams.avg_size =
      teams.total > 0 ? Math.round((totalMembers / teams.total) * 10) / 10 : 0;

    teams.members_invited = (db
      .prepare(
        "SELECT COUNT(*) AS n FROM team_members WHERE joined_at IS NULL"
      )
      .get() as { n: number }).n;
    teams.members_accepted = (db
      .prepare(
        "SELECT COUNT(*) AS n FROM team_members WHERE joined_at IS NOT NULL"
      )
      .get() as { n: number }).n;
  } catch (e) {
    console.error("admin/overview teams:", e);
  }

  const payload: OverviewResponse = {
    kpis,
    recent_signups,
    activity,
    sources,
    newsletters,
    stripe,
    teams,
    generated_at: new Date().toISOString(),
  };

  // suppress unused empty var
  void empty;

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
