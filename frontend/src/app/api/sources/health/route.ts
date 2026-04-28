import { NextResponse } from "next/server";
import { getDb, dbExists } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

interface SourceRow {
  source: string;
  n_7j: number;
  n_30j: number;
  n_total: number;
  last_seen: string | null;
  days_since: number | null;
  n_enriched: number;
  n_failed: number;
}

type Status = "ok" | "intermittent" | "silencieuse" | "morte";

function computeStatus(daysSince: number | null, n7j: number): Status {
  if (daysSince === null) return "morte";
  if (daysSince <= 2 && n7j > 0) return "ok";
  if (daysSince <= 7) return "intermittent";
  if (daysSince <= 30) return "silencieuse";
  return "morte";
}

export async function GET() {
  try {
    // Auth required - dashboard internal data
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    if (!dbExists()) {
      return NextResponse.json({ sources: [] });
    }

    const db = getDb();

    const rows = db
      .prepare(
        `SELECT
            source,
            SUM(CASE WHEN collected_at >= date('now','-7 days') THEN 1 ELSE 0 END) AS n_7j,
            SUM(CASE WHEN collected_at >= date('now','-30 days') THEN 1 ELSE 0 END) AS n_30j,
            COUNT(*) AS n_total,
            MAX(collected_at) AS last_seen,
            CAST(julianday('now') - julianday(MAX(collected_at)) AS INTEGER) AS days_since,
            SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) AS n_enriched,
            SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) AS n_failed
         FROM articles
         GROUP BY source
         ORDER BY n_7j DESC, n_30j DESC`
      )
      .all() as SourceRow[];

    const sources = rows.map((r) => ({
      source: r.source,
      n_7j: r.n_7j,
      n_30j: r.n_30j,
      n_total: r.n_total,
      last_seen: r.last_seen,
      days_since: r.days_since,
      n_enriched: r.n_enriched,
      n_failed: r.n_failed,
      status: computeStatus(r.days_since, r.n_7j),
      enrichment_pct: r.n_total > 0 ? Math.round((r.n_enriched * 100) / r.n_total) : 0,
    }));

    return NextResponse.json({ sources, generated_at: new Date().toISOString() });
  } catch (error) {
    console.error("sources/health error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'audit des sources" },
      { status: 500 }
    );
  }
}
