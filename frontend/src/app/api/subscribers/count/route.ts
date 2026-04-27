import { NextResponse } from "next/server";
import { getDb, dbExists } from "@/lib/db";

// Public endpoint - returns aggregated subscribers count for the
// pricing page launch counter. No auth required, no PII exposed.
export async function GET() {
  try {
    if (!dbExists()) {
      return NextResponse.json({ count: 0 });
    }

    const db = getDb();

    // Count both newsletter subscribers (free) and registered users
    // who have actually subscribed to a paid plan.
    let subsCount = 0;
    let usersCount = 0;

    try {
      const r1 = db
        .prepare(
          "SELECT COUNT(*) AS n FROM subscribers WHERE unsubscribed_at IS NULL AND is_active = 1"
        )
        .get() as { n: number } | undefined;
      subsCount = r1?.n ?? 0;
    } catch {
      // table may not exist yet
    }

    try {
      const r2 = db
        .prepare(
          "SELECT COUNT(*) AS n FROM users WHERE plan IN ('solo', 'equipe', 'agence')"
        )
        .get() as { n: number } | undefined;
      usersCount = r2?.n ?? 0;
    } catch {
      // table may not exist yet
    }

    const count = Math.max(subsCount, usersCount);

    return NextResponse.json(
      { count },
      {
        headers: {
          // Cache 5 min at edge to avoid hitting DB on every page view.
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error("subscribers/count error:", error);
    return NextResponse.json({ count: 0 });
  }
}
