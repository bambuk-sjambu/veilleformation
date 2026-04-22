import { NextRequest, NextResponse } from "next/server";
import { getDb, dbExists } from "@/lib/db";
import { getSession } from "@/lib/auth";

interface DbAction {
  id: number;
  article_id: number;
  action_description: string;
  responsible: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ActionWithArticle extends DbAction {
  article_title: string | null;
  article_category: string | null;
  article_source: string | null;
}

export async function GET(request: NextRequest) {
  try {
    if (!dbExists()) {
      return NextResponse.json({ actions: [], total: 0 });
    }

    const db = getDb();

    // Check if actions table exists
    const tableCheck = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='actions'")
      .get();

    if (!tableCheck) {
      return NextResponse.json({ actions: [], total: 0 });
    }

    const params = request.nextUrl.searchParams;
    const status = params.get("status");
    const priority = params.get("priority");
    const article_id = params.get("article_id");
    const limit = parseInt(params.get("limit") || "100", 10);
    const offset = parseInt(params.get("offset") || "0", 10);

    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (status) {
      conditions.push("a.status = ?");
      values.push(status);
    }

    if (priority) {
      conditions.push("a.priority = ?");
      values.push(priority);
    }

    if (article_id) {
      conditions.push("a.article_id = ?");
      values.push(parseInt(article_id, 10));
    }

    const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    // Count total
    const countStmt = db.prepare(`
      SELECT COUNT(*) as total FROM actions a ${where}
    `);
    const totalRow = countStmt.get(...values) as { total: number };
    const total = totalRow?.total || 0;

    // Get actions with article info
    const stmt = db.prepare(`
      SELECT a.*, ar.title as article_title, ar.category as article_category, ar.source as article_source
      FROM actions a
      LEFT JOIN articles ar ON a.article_id = ar.id
      ${where}
      ORDER BY
        CASE a.priority
          WHEN 'haute' THEN 1
          WHEN 'moyenne' THEN 2
          WHEN 'basse' THEN 3
        END,
        a.due_date ASC,
        a.created_at DESC
      LIMIT ? OFFSET ?
    `);
    const actions = stmt.all(...values, limit, offset) as ActionWithArticle[];

    return NextResponse.json({ actions, total });
  } catch (error) {
    console.error("Actions API error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur.", actions: [], total: 0 },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    if (!dbExists()) {
      return NextResponse.json({ error: "Base non initialisee" }, { status: 500 });
    }

    const db = getDb();
    const body = await request.json();

    const { article_id, action_description, responsible, status, priority, due_date, notes } = body;

    if (!article_id || !action_description) {
      return NextResponse.json(
        { error: "Article ID et description de l'action sont requis" },
        { status: 400 }
      );
    }

    // Verify article exists
    const article = db
      .prepare("SELECT id FROM articles WHERE id = ?")
      .get(article_id);

    if (!article) {
      return NextResponse.json({ error: "Article non trouve" }, { status: 404 });
    }

    const result = db.prepare(`
      INSERT INTO actions (article_id, action_description, responsible, status, priority, due_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      article_id,
      action_description,
      responsible || null,
      status || "a_faire",
      priority || "moyenne",
      due_date || null,
      notes || null
    );

    const newAction = db
      .prepare("SELECT * FROM actions WHERE id = ?")
      .get(result.lastInsertRowid) as DbAction;

    return NextResponse.json({ action: newAction }, { status: 201 });
  } catch (error) {
    console.error("Create action error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la creation de l'action" },
      { status: 500 }
    );
  }
}
