import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sendEmail, teamInvitationEmail } from "@/lib/resend";
import crypto from "crypto";

// POST /api/teams/[id]/invite - Invite a member to team
export async function POST(
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

    const body = await request.json();
    const { email, role = "member" } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Email valide requis" }, { status: 400 });
    }

    // Check if team has room for more members
    const memberCount = db.prepare(`
      SELECT COUNT(*) as count FROM team_members WHERE team_id = ?
    `).get(id) as { count: number };

    const invitationCount = db.prepare(`
      SELECT COUNT(*) as count FROM team_invitations
      WHERE team_id = ? AND accepted = 0 AND expires_at > datetime('now')
    `).get(id) as { count: number };

    if (memberCount.count + invitationCount.count >= team.max_members) {
      return NextResponse.json({ error: `Equipe complete (${team.max_members} membres max)` }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase()) as any;

    if (existingUser) {
      // Check if already a member
      const existingMember = db.prepare(`
        SELECT * FROM team_members WHERE team_id = ? AND user_id = ?
      `).get(id, existingUser.id);
      if (existingMember) {
        return NextResponse.json({ error: "Cet utilisateur est deja membre de l'equipe" }, { status: 400 });
      }
    }

    // Check for existing pending invitation
    const existingInvitation = db.prepare(`
      SELECT * FROM team_invitations
      WHERE team_id = ? AND email = ? AND accepted = 0 AND expires_at > datetime('now')
    `).get(id, email.toLowerCase());

    if (existingInvitation) {
      return NextResponse.json({ error: "Une invitation est deja en attente pour cet email" }, { status: 400 });
    }

    // Create invitation with token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    db.prepare(`
      INSERT INTO team_invitations (team_id, email, role, token, invited_by, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, email.toLowerCase(), role, token, session.userId, expiresAt);

    const inviter = db.prepare("SELECT first_name, last_name FROM users WHERE id = ?")
      .get(session.userId) as { first_name: string; last_name: string } | undefined;
    const inviterName = inviter
      ? `${inviter.first_name} ${inviter.last_name}`.trim()
      : "Un collègue";

    let emailSent = false;
    try {
      const mail = teamInvitationEmail({
        teamName: team.name,
        inviterName,
        token,
        role,
      });
      await sendEmail({ to: email.toLowerCase(), ...mail });
      emailSent = true;
    } catch (e) {
      console.error("Resend email failed:", e);
    }

    return NextResponse.json({
      success: true,
      message: emailSent ? "Invitation envoyee par email" : "Invitation creee (email non envoye)",
      emailSent,
    });
  } catch (error) {
    console.error("Error inviting member:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
