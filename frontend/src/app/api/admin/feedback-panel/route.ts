import { NextRequest, NextResponse } from "next/server";
import { getDb, dbExists } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

interface PanelUserRow {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  plan: string | null;
  created_at: string;
  is_feedback_panel: number | null;
  feedback_count: number;
  last_feedback_at: string | null;
  company: string | null;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.userId) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  if (!dbExists()) {
    return NextResponse.json({ error: "Base indisponible" }, { status: 503 });
  }

  const db = getDb();
  if (!isSuperAdmin(user.userId, db)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  let rows: PanelUserRow[];
  try {
    rows = db
      .prepare(
        `SELECT u.id, u.email, u.first_name, u.last_name, u.plan, u.created_at,
                u.is_feedback_panel,
                (SELECT COUNT(*) FROM feedbacks WHERE user_id = u.id) AS feedback_count,
                (SELECT MAX(created_at) FROM feedbacks WHERE user_id = u.id) AS last_feedback_at,
                (SELECT company_name FROM user_profiles WHERE user_id = u.id LIMIT 1) AS company
           FROM users u
           ORDER BY u.created_at DESC`
      )
      .all() as PanelUserRow[];
  } catch (e) {
    console.error("admin/feedback-panel GET failed:", e);
    return NextResponse.json(
      { error: "Erreur lecture users" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { users: rows },
    { headers: { "Cache-Control": "no-store" } }
  );
}

interface PostBody {
  user_id?: number;
  is_feedback_panel?: number | boolean;
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.userId) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  if (!dbExists()) {
    return NextResponse.json({ error: "Base indisponible" }, { status: 503 });
  }

  const db = getDb();
  if (!isSuperAdmin(user.userId, db)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const userId = Number(body.user_id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: "user_id invalide" }, { status: 400 });
  }

  // Coerce bool|number vers 0|1
  const flag = body.is_feedback_panel ? 1 : 0;

  try {
    const result = db
      .prepare("UPDATE users SET is_feedback_panel = ? WHERE id = ?")
      .run(flag, userId);
    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }
  } catch (e) {
    console.error("admin/feedback-panel POST failed:", e);
    return NextResponse.json(
      { error: "Erreur mise a jour" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, is_feedback_panel: flag });
}
