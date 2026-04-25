import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

// POST /api/teams/invitations/[token]/accept - Accept a team invitation
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  const { token } = await params;
  const db = getDb();

  const invitation = db.prepare(`
    SELECT id, team_id, email, role, expires_at, accepted
    FROM team_invitations
    WHERE token = ?
  `).get(token) as {
    id: number;
    team_id: number;
    email: string;
    role: string;
    expires_at: string;
    accepted: number;
  } | undefined;

  if (!invitation) {
    return NextResponse.json({ error: "Invitation introuvable" }, { status: 404 });
  }

  if (invitation.accepted) {
    return NextResponse.json({ error: "Invitation déjà acceptée" }, { status: 409 });
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: "Invitation expirée" }, { status: 410 });
  }

  const user = db.prepare("SELECT id, email FROM users WHERE id = ?").get(session.userId) as
    | { id: number; email: string }
    | undefined;

  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    return NextResponse.json(
      {
        error: `Cette invitation a été envoyée à ${invitation.email}. Connectez-vous avec ce compte pour l'accepter.`,
      },
      { status: 403 }
    );
  }

  const existingMember = db.prepare(`
    SELECT id FROM team_members WHERE team_id = ? AND user_id = ?
  `).get(invitation.team_id, user.id);

  if (existingMember) {
    db.prepare("UPDATE team_invitations SET accepted = 1 WHERE id = ?").run(invitation.id);
    return NextResponse.json({ success: true, teamId: invitation.team_id, alreadyMember: true });
  }

  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO team_members (team_id, user_id, role)
      VALUES (?, ?, ?)
    `).run(invitation.team_id, user.id, invitation.role);

    db.prepare("UPDATE team_invitations SET accepted = 1 WHERE id = ?").run(invitation.id);
  });

  try {
    tx();
  } catch (e) {
    console.error("Failed to accept invitation:", e);
    return NextResponse.json({ error: "Erreur lors de l'ajout à l'équipe" }, { status: 500 });
  }

  return NextResponse.json({ success: true, teamId: invitation.team_id });
}
