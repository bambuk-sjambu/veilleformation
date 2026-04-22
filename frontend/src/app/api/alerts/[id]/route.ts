import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/alerts/[id] - Get specific alert
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const { id } = await params;
    const db = getDb();

    const alert = db.prepare(`
      SELECT * FROM alerts WHERE id = ? AND user_id = ?
    `).get(id, session.userId);

    if (!alert) {
      return NextResponse.json({ error: "Alerte non trouvee" }, { status: 404 });
    }

    return NextResponse.json({ alert });
  } catch (error) {
    console.error("Error fetching alert:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PUT /api/alerts/[id] - Update alert
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const { id } = await params;
    const db = getDb();

    // Verify ownership
    const existing = db.prepare("SELECT * FROM alerts WHERE id = ? AND user_id = ?").get(id, session.userId);
    if (!existing) {
      return NextResponse.json({ error: "Alerte non trouvee" }, { status: 404 });
    }

    const body = await request.json();
    const { name, keywords, regions, indicators, categories, frequency, active } = body;

    db.prepare(`
      UPDATE alerts SET
        name = COALESCE(?, name),
        keywords = COALESCE(?, keywords),
        regions = ?,
        indicators = ?,
        categories = ?,
        frequency = COALESCE(?, frequency),
        active = COALESCE(?, active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name || null,
      keywords ? JSON.stringify(keywords) : null,
      regions ? JSON.stringify(regions) : null,
      indicators ? JSON.stringify(indicators) : null,
      categories ? JSON.stringify(categories) : null,
      frequency || null,
      active !== undefined ? (active ? 1 : 0) : null,
      id
    );

    const updated = db.prepare("SELECT * FROM alerts WHERE id = ?").get(id);
    return NextResponse.json({ alert: updated });
  } catch (error) {
    console.error("Error updating alert:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE /api/alerts/[id] - Delete alert
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const { id } = await params;
    const db = getDb();

    // Verify ownership
    const existing = db.prepare("SELECT * FROM alerts WHERE id = ? AND user_id = ?").get(id, session.userId);
    if (!existing) {
      return NextResponse.json({ error: "Alerte non trouvee" }, { status: 404 });
    }

    db.prepare("DELETE FROM alerts WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting alert:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
