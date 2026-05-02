import { NextResponse } from "next/server";
import { getDb, dbExists } from "@/lib/db";
import { sector } from "@/config";

const initialByIndicator = (): Record<string, number> =>
  Object.fromEntries(sector.taxonomy.indicators.map((i) => [i.id, 0]));

function getNextTuesday(): string {
  const now = new Date();
  const day = now.getDay();
  // Days until next Tuesday (Tuesday = 2)
  const daysUntil = day <= 2 ? 2 - day : 9 - day;
  const next = new Date(now);
  next.setDate(now.getDate() + (daysUntil === 0 ? 7 : daysUntil));
  next.setHours(8, 0, 0, 0);
  const dd = String(next.getDate()).padStart(2, "0");
  const mm = String(next.getMonth() + 1).padStart(2, "0");
  const yyyy = next.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export async function GET() {
  try {
    if (!dbExists()) {
      return NextResponse.json({
        total_articles: 0,
        total_ao: 0,
        total_reglementaire: 0,
        total_metier: 0,
        by_impact: { fort: 0, moyen: 0, faible: 0 },
        by_indicator: initialByIndicator(),
        last_collected: null,
        last_newsletter: null,
        next_newsletter: getNextTuesday(),
        subscribers_count: 0,
        newsletters_count: 0,
        db_initialized: false,
      });
    }

    const db = getDb();

    // Check if articles table exists
    const tableCheck = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='articles'"
      )
      .get();

    if (!tableCheck) {
      return NextResponse.json({
        total_articles: 0,
        total_ao: 0,
        total_reglementaire: 0,
        total_metier: 0,
        by_impact: { fort: 0, moyen: 0, faible: 0 },
        by_indicator: initialByIndicator(),
        last_collected: null,
        last_newsletter: null,
        next_newsletter: getNextTuesday(),
        subscribers_count: 0,
        newsletters_count: 0,
        db_initialized: false,
      });
    }

    const totalArticles = (
      db
        .prepare("SELECT COUNT(*) as cnt FROM articles WHERE status = 'done'")
        .get() as { cnt: number }
    ).cnt;

    const totalAo = (
      db
        .prepare(
          "SELECT COUNT(*) as cnt FROM articles WHERE category = 'ao' AND status = 'done'"
        )
        .get() as { cnt: number }
    ).cnt;

    const totalReglementaire = (
      db
        .prepare(
          "SELECT COUNT(*) as cnt FROM articles WHERE category = 'reglementaire' AND status = 'done'"
        )
        .get() as { cnt: number }
    ).cnt;

    const totalMetier = (
      db
        .prepare(
          "SELECT COUNT(*) as cnt FROM articles WHERE category = 'metier' AND status = 'done'"
        )
        .get() as { cnt: number }
    ).cnt;

    // By impact
    const impactRows = db
      .prepare(
        "SELECT impact_level, COUNT(*) as cnt FROM articles WHERE status = 'done' AND impact_level IS NOT NULL GROUP BY impact_level"
      )
      .all() as { impact_level: string; cnt: number }[];

    const byImpact: Record<string, number> = { fort: 0, moyen: 0, faible: 0 };
    for (const row of impactRows) {
      if (row.impact_level in byImpact) {
        byImpact[row.impact_level] = row.cnt;
      }
    }

    // By indicator - stored in taxonomy_indicators as JSON list or CSV.
    const byIndicator: Record<string, number> = initialByIndicator();
    for (const ind of sector.taxonomy.indicators.map((i) => i.id)) {
      const row = db
        .prepare(
          `SELECT COUNT(*) as cnt FROM articles
           WHERE status = 'done'
             AND taxonomy_indicators LIKE ?`
        )
        .get(`%${ind}%`) as { cnt: number };
      byIndicator[ind] = row.cnt;
    }

    // Last collected
    const lastCollected = (
      db
        .prepare("SELECT MAX(collected_at) as last_dt FROM articles")
        .get() as { last_dt: string | null }
    ).last_dt;

    // Newsletters stats
    const nlTableCheck = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='newsletters'"
      )
      .get();

    let lastNewsletter: string | null = null;
    let newslettersCount = 0;

    if (nlTableCheck) {
      const nlRow = db
        .prepare("SELECT MAX(sent_at) as last_sent FROM newsletters")
        .get() as { last_sent: string | null };
      lastNewsletter = nlRow.last_sent;

      newslettersCount = (
        db.prepare("SELECT COUNT(*) as cnt FROM newsletters").get() as {
          cnt: number;
        }
      ).cnt;
    }

    // Subscribers
    const subTableCheck = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='subscribers'"
      )
      .get();

    let subscribersCount = 0;
    if (subTableCheck) {
      subscribersCount = (
        db
          .prepare(
            "SELECT COUNT(*) as cnt FROM subscribers WHERE is_active = 1"
          )
          .get() as { cnt: number }
      ).cnt;
    }

    return NextResponse.json({
      total_articles: totalArticles,
      total_ao: totalAo,
      total_reglementaire: totalReglementaire,
      total_metier: totalMetier,
      by_impact: byImpact,
      by_indicator: byIndicator,
      last_collected: lastCollected,
      last_newsletter: lastNewsletter,
      next_newsletter: getNextTuesday(),
      subscribers_count: subscribersCount,
      newsletters_count: newslettersCount,
      db_initialized: true,
    });
  } catch (error) {
    console.error("Stats API error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}
