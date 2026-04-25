import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/alerts - List user's alerts
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const db = getDb();

    // Check plan restrictions
    const user = db.prepare("SELECT plan FROM users WHERE id = ?").get(session.userId) as { plan: string } | undefined;
    if (!user || user.plan === "free") {
      return NextResponse.json({ error: "Fonctionnalité réservée aux abonnés Solo et plus" }, { status: 403 });
    }

    const alerts = db.prepare(`
      SELECT * FROM alerts
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(session.userId);

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/alerts - Create new alert
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const db = getDb();

    // Check plan restrictions
    const user = db.prepare("SELECT plan FROM users WHERE id = ?").get(session.userId) as { plan: string } | undefined;
    if (!user || user.plan === "free") {
      return NextResponse.json({ error: "Fonctionnalité réservée aux abonnés Solo et plus" }, { status: 403 });
    }

    const body = await request.json();
    const { name, keywords, regions, indicators, categories, frequency } = body;

    if (!name || !keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json({ error: "Nom et mots-cles requis" }, { status: 400 });
    }

    const result = db.prepare(`
      INSERT INTO alerts (user_id, name, keywords, regions, indicators, categories, frequency)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      session.userId,
      name,
      JSON.stringify(keywords),
      regions ? JSON.stringify(regions) : null,
      indicators ? JSON.stringify(indicators) : null,
      categories ? JSON.stringify(categories) : null,
      frequency || "instant"
    );

    const newAlert = db.prepare("SELECT * FROM alerts WHERE id = ?").get(result.lastInsertRowid);
    return NextResponse.json({ alert: newAlert }, { status: 201 });
  } catch (error) {
    console.error("Error creating alert:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
