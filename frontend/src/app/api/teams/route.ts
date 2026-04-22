import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import crypto from "crypto";

// GET /api/teams - List user's teams (as owner or member)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const db = getDb();

    // Get teams where user is owner or member
    const teams = db.prepare(`
      SELECT t.*, tm.role as user_role
      FROM teams t
      LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.user_id = ?
      WHERE t.owner_id = ? OR tm.user_id = ?
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `).all(session.userId, session.userId, session.userId);

    // Get member counts for each team
    const teamsWithCounts = teams.map((team: any) => {
      const memberCount = db.prepare(`
        SELECT COUNT(*) as count FROM team_members WHERE team_id = ?
      `).get(team.id) as { count: number };
      return { ...team, member_count: memberCount.count + 1 }; // +1 for owner
    });

    return NextResponse.json({ teams: teamsWithCounts });
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/teams - Create new team
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const db = getDb();

    // Check plan restrictions (only equipe or agence can create teams)
    const user = db.prepare("SELECT plan FROM users WHERE id = ?").get(session.userId) as { plan: string } | undefined;
    if (!user || (user.plan !== "equipe" && user.plan !== "agence")) {
      return NextResponse.json({ error: "Plan Equipe ou Agence requis pour creer une equipe" }, { status: 403 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Nom de l'equipe requis" }, { status: 400 });
    }

    // Determine max members based on plan
    const maxMembers = user.plan === "agence" ? 20 : 5;

    const result = db.prepare(`
      INSERT INTO teams (name, owner_id, plan, max_members)
      VALUES (?, ?, ?, ?)
    `).run(name.trim(), session.userId, user.plan, maxMembers);

    const teamId = result.lastInsertRowid;

    // Add owner as a team member with 'owner' role
    db.prepare(`
      INSERT INTO team_members (team_id, user_id, role, joined_at)
      VALUES (?, ?, 'owner', CURRENT_TIMESTAMP)
    `).run(teamId, session.userId);

    const newTeam = db.prepare("SELECT * FROM teams WHERE id = ?").get(teamId);
    return NextResponse.json({ team: newTeam }, { status: 201 });
  } catch (error) {
    console.error("Error creating team:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
