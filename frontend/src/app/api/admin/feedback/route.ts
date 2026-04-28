import { NextRequest, NextResponse } from "next/server";
import { getDb, dbExists } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

const VALID_STATUSES = [
  "nouveau",
  "traite",
  "reporte",
  "pas_pour_nous",
] as const;
type Status = (typeof VALID_STATUSES)[number];

const VALID_FILTER_STATUSES = new Set<string>(VALID_STATUSES);

interface FeedbackRow {
  id: number;
  user_id: number;
  category: string;
  page: string;
  rating: number | null;
  text: string;
  screenshot_url: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string | null;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
}

export async function GET(request: NextRequest) {
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

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status");

  let rows: FeedbackRow[];
  try {
    if (statusFilter && VALID_FILTER_STATUSES.has(statusFilter)) {
      rows = db
        .prepare(
          `SELECT f.id, f.user_id, f.category, f.page, f.rating, f.text,
                  f.screenshot_url, f.status, f.admin_notes,
                  f.created_at, f.updated_at,
                  u.email, u.first_name, u.last_name
             FROM feedbacks f
             LEFT JOIN users u ON u.id = f.user_id
            WHERE f.status = ?
            ORDER BY f.created_at DESC
            LIMIT 100`
        )
        .all(statusFilter) as FeedbackRow[];
    } else {
      rows = db
        .prepare(
          `SELECT f.id, f.user_id, f.category, f.page, f.rating, f.text,
                  f.screenshot_url, f.status, f.admin_notes,
                  f.created_at, f.updated_at,
                  u.email, u.first_name, u.last_name
             FROM feedbacks f
             LEFT JOIN users u ON u.id = f.user_id
            ORDER BY f.created_at DESC
            LIMIT 100`
        )
        .all() as FeedbackRow[];
    }
  } catch (e) {
    console.error("admin/feedback GET failed:", e);
    return NextResponse.json(
      { error: "Erreur lecture feedbacks" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { feedbacks: rows },
    { headers: { "Cache-Control": "no-store" } }
  );
}

interface PatchBody {
  id?: number;
  status?: string;
  admin_notes?: string | null;
}

export async function PATCH(request: NextRequest) {
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

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "id invalide" }, { status: 400 });
  }
  const status = (body.status || "").trim();
  if (!VALID_STATUSES.includes(status as Status)) {
    return NextResponse.json(
      { error: `Statut invalide (attendu : ${VALID_STATUSES.join(", ")})` },
      { status: 400 }
    );
  }

  let adminNotes: string | null = null;
  if (body.admin_notes !== undefined && body.admin_notes !== null) {
    const notes = String(body.admin_notes);
    if (notes.length > 2000) {
      return NextResponse.json(
        { error: "admin_notes trop long (max 2000)" },
        { status: 400 }
      );
    }
    adminNotes = notes;
  }

  try {
    const result = db
      .prepare(
        `UPDATE feedbacks
            SET status = ?,
                admin_notes = COALESCE(?, admin_notes),
                updated_at = datetime('now')
          WHERE id = ?`
      )
      .run(status, adminNotes, id);

    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Feedback introuvable" },
        { status: 404 }
      );
    }
  } catch (e) {
    console.error("admin/feedback PATCH failed:", e);
    return NextResponse.json(
      { error: "Erreur mise a jour" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
