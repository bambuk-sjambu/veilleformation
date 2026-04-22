import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/external/[id] - Get specific external content
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

    const content = db.prepare(`
      SELECT ec.*, t.name as team_name
      FROM external_contents ec
      LEFT JOIN teams t ON ec.team_id = t.id
      WHERE ec.id = ? AND (ec.user_id = ? OR ec.team_id IN (
        SELECT team_id FROM team_members WHERE user_id = ?
      ))
    `).get(id, session.userId, session.userId);

    if (!content) {
      return NextResponse.json({ error: "Contenu non trouve" }, { status: 404 });
    }

    return NextResponse.json({ content });
  } catch (error) {
    console.error("Error fetching external content:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE /api/external/[id] - Delete external content
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

    // Verify ownership (either creator or team member with admin role)
    const content = db.prepare(`
      SELECT ec.*, tm.role as team_role
      FROM external_contents ec
      LEFT JOIN team_members tm ON ec.team_id = tm.team_id AND tm.user_id = ?
      WHERE ec.id = ?
    `).get(session.userId, id) as any;

    if (!content) {
      return NextResponse.json({ error: "Contenu non trouve" }, { status: 404 });
    }

    // Allow delete if owner, team admin, or team owner
    const team = content.team_id ? db.prepare("SELECT owner_id FROM teams WHERE id = ?").get(content.team_id) as any : null;
    const canDelete = content.user_id === session.userId ||
                      content.team_role === "admin" ||
                      (team && team.owner_id === session.userId);

    if (!canDelete) {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    // TODO: Delete file from storage if exists

    db.prepare("DELETE FROM external_contents WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting external content:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
