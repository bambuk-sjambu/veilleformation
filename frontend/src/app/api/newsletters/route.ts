import { NextRequest, NextResponse } from "next/server";
import { getDb, dbExists, DbNewsletter } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    if (!dbExists()) {
      return NextResponse.json({
        error: "Base non initialisee",
        newsletters: [],
      });
    }

    const db = getDb();

    // Check if newsletters table exists
    const tableCheck = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='newsletters'"
      )
      .get();

    if (!tableCheck) {
      return NextResponse.json({ newsletters: [] });
    }

    const params = request.nextUrl.searchParams;
    const id = params.get("id");

    if (id) {
      // Return single newsletter with full HTML content
      const newsletter = db
        .prepare("SELECT * FROM newsletters WHERE id = ?")
        .get(parseInt(id, 10)) as DbNewsletter | undefined;

      if (!newsletter) {
        return NextResponse.json(
          { error: "Newsletter introuvable." },
          { status: 404 }
        );
      }

      return NextResponse.json({ newsletter });
    }

    // Return list without html_content (too large)
    const newsletters = db
      .prepare(
        `SELECT id, edition_number, subject, sent_at, recipients_count,
                open_rate, click_rate, unsubscribe_count
         FROM newsletters
         ORDER BY edition_number DESC`
      )
      .all() as Omit<DbNewsletter, "html_content" | "brevo_campaign_id" | "archive_url">[];

    return NextResponse.json({ newsletters });
  } catch (error) {
    console.error("Newsletters API error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur.", newsletters: [] },
      { status: 500 }
    );
  }
}
