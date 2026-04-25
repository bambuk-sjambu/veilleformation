import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/teams/invitations/[token] - Public details for invitation page
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const db = getDb();

  const invitation = db.prepare(`
    SELECT i.id, i.email, i.role, i.expires_at, i.accepted,
           t.name AS team_name,
           u.first_name AS inviter_first_name, u.last_name AS inviter_last_name
    FROM team_invitations i
    JOIN teams t ON t.id = i.team_id
    LEFT JOIN users u ON u.id = i.invited_by
    WHERE i.token = ?
  `).get(token) as {
    id: number;
    email: string;
    role: string;
    expires_at: string;
    accepted: number;
    team_name: string;
    inviter_first_name: string | null;
    inviter_last_name: string | null;
  } | undefined;

  if (!invitation) {
    return NextResponse.json({ error: "Invitation introuvable" }, { status: 404 });
  }

  const now = new Date();
  const expires = new Date(invitation.expires_at);
  if (expires < now) {
    return NextResponse.json({ error: "Cette invitation a expiré" }, { status: 410 });
  }

  if (invitation.accepted) {
    return NextResponse.json({ error: "Cette invitation a déjà été acceptée" }, { status: 409 });
  }

  return NextResponse.json({
    invitation: {
      email: invitation.email,
      role: invitation.role,
      teamName: invitation.team_name,
      inviterName: [invitation.inviter_first_name, invitation.inviter_last_name]
        .filter(Boolean)
        .join(" ")
        .trim() || null,
      expiresAt: invitation.expires_at,
    },
  });
}
