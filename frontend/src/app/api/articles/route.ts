import { NextRequest, NextResponse } from "next/server";
import { getDb, dbExists, DbArticle } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    if (!dbExists()) {
      return NextResponse.json(
        { error: "Base non initialisee", articles: [], total: 0 },
        { status: 200 }
      );
    }

    const db = getDb();

    // Check if articles table exists
    const tableCheck = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='articles'")
      .get();

    if (!tableCheck) {
      return NextResponse.json({ articles: [], total: 0 });
    }

    const params = request.nextUrl.searchParams;

    const category = params.get("category");
    const notCategory = params.get("not_category");
    const status = params.get("status") || "done";
    const limit = parseInt(params.get("limit") || "50", 10);
    const offset = parseInt(params.get("offset") || "0", 10);
    const impact = params.get("impact");
    const indicator = params.get("indicator");
    const sort = params.get("sort");

    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (status) {
      conditions.push("status = ?");
      values.push(status);
    }

    if (category) {
      conditions.push("category = ?");
      values.push(category);
    }

    if (notCategory) {
      conditions.push("(category != ? OR category IS NULL)");
      values.push(notCategory);
    }

    if (impact) {
      conditions.push("impact_level = ?");
      values.push(impact);
    }

    if (indicator) {
      conditions.push("taxonomy_indicators LIKE ?");
      values.push(`%${indicator}%`);
    }

    const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    // Count total
    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM articles ${where}`);
    const totalRow = countStmt.get(...values) as { total: number };
    const total = totalRow?.total || 0;

    // Determine sort order
    let orderBy = "published_date DESC";
    if (sort === "deadline") {
      orderBy = "json_extract(extra_meta, '$.date_limite') ASC";
    } else if (sort === "relevance") {
      // Show most recent first (collected_at), then by relevance
      orderBy = "collected_at DESC, relevance_score DESC";
    }

    const stmt = db.prepare(
      `SELECT * FROM articles ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
    );
    const articles = stmt.all(...values, limit, offset) as DbArticle[];

    return NextResponse.json({ articles, total });
  } catch (error) {
    console.error("Articles API error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur.", articles: [], total: 0 },
      { status: 500 }
    );
  }
}
