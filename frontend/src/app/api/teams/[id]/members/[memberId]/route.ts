import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

// DELETE /api/teams/[id]/members/[memberId] - Remove member from team
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const { id, memberId } = await params;
    const db = getDb();

    // Verify user is owner or admin of the team
    const team = db.prepare(`
      SELECT t.*, tm.role as user_role
      FROM teams t
      LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.user_id = ?
      WHERE t.id = ?
    `).get(session.userId, id) as any;

    if (!team || (team.owner_id !== session.userId && team.user_role !== "admin")) {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    // Get the member to remove
    const member = db.prepare(`
      SELECT * FROM team_members WHERE id = ? AND team_id = ?
    `).get(memberId, id) as any;

    if (!member) {
      return NextResponse.json({ error: "Membre non trouve" }, { status: 404 });
    }

    // Cannot remove owner
    if (member.role === "owner") {
      return NextResponse.json({ error: "Impossible de supprimer le proprietaire" }, { status: 400 });
    }

    // Admin cannot remove other admins (only owner can)
    if (member.role === "admin" && team.user_role === "admin") {
      return NextResponse.json({ error: "Seul le proprietaire peut supprimer un admin" }, { status: 403 });
    }

    // Remove member
    db.prepare("DELETE FROM team_members WHERE id = ?").run(memberId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PUT /api/teams/[id]/members/[memberId] - Update member role
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const { id, memberId } = await params;
    const db = getDb();

    // Verify user is owner of the team
    const team = db.prepare("SELECT * FROM teams WHERE id = ? AND owner_id = ?").get(id, session.userId);
    if (!team) {
      return NextResponse.json({ error: "Seul le proprietaire peut modifier les roles" }, { status: 403 });
    }

    const body = await request.json();
    const { role } = body;

    if (!["admin", "member"].includes(role)) {
      return NextResponse.json({ error: "Role invalide" }, { status: 400 });
    }

    // Get the member to update
    const member = db.prepare(`
      SELECT * FROM team_members WHERE id = ? AND team_id = ?
    `).get(memberId, id) as any;

    if (!member) {
      return NextResponse.json({ error: "Membre non trouve" }, { status: 404 });
    }

    // Cannot change owner's role
    if (member.role === "owner") {
      return NextResponse.json({ error: "Impossible de modifier le role du proprietaire" }, { status: 400 });
    }

    // Update role
    db.prepare("UPDATE team_members SET role = ? WHERE id = ?").run(role, memberId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating member:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
