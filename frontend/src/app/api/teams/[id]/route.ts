import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/teams/[id] - Get team details with members
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

    // Get team and verify user is a member
    const team = db.prepare(`
      SELECT t.*, tm.role as user_role
      FROM teams t
      LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.user_id = ?
      WHERE t.id = ? AND (t.owner_id = ? OR tm.user_id = ?)
    `).get(session.userId, id, session.userId, session.userId);

    if (!team) {
      return NextResponse.json({ error: "Equipe non trouvee ou acces refuse" }, { status: 404 });
    }

    // Get all members with their user info
    const members = db.prepare(`
      SELECT tm.*, u.email, u.first_name, u.last_name
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = ?
      ORDER BY
        CASE tm.role
          WHEN 'owner' THEN 1
          WHEN 'admin' THEN 2
          WHEN 'member' THEN 3
        END
    `).all(id);

    // Get pending invitations
    const invitations = db.prepare(`
      SELECT * FROM team_invitations
      WHERE team_id = ? AND accepted = 0 AND expires_at > datetime('now')
      ORDER BY created_at DESC
    `).all(id);

    return NextResponse.json({ team, members, invitations });
  } catch (error) {
    console.error("Error fetching team:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PUT /api/teams/[id] - Update team (owner only)
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
    const team = db.prepare("SELECT * FROM teams WHERE id = ? AND owner_id = ?").get(id, session.userId);
    if (!team) {
      return NextResponse.json({ error: "Equipe non trouvee ou acces refuse" }, { status: 404 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Nom de l'equipe requis" }, { status: 400 });
    }

    db.prepare(`
      UPDATE teams SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(name.trim(), id);

    const updated = db.prepare("SELECT * FROM teams WHERE id = ?").get(id);
    return NextResponse.json({ team: updated });
  } catch (error) {
    console.error("Error updating team:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE /api/teams/[id] - Delete team (owner only)
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
    const team = db.prepare("SELECT * FROM teams WHERE id = ? AND owner_id = ?").get(id, session.userId);
    if (!team) {
      return NextResponse.json({ error: "Equipe non trouvee ou acces refuse" }, { status: 404 });
    }

    // Delete team (cascade will delete members and invitations)
    db.prepare("DELETE FROM teams WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting team:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
