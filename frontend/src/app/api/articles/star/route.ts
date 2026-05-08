import { NextRequest, NextResponse } from "next/server";
import { getDb, dbExists } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getActiveSectorIdForUser } from "@/lib/sector-context";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  if (!dbExists()) {
    return NextResponse.json({ error: "DB not found" }, { status: 500 });
  }

  try {
    const { id, starred } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    // Cross-tenant protection : un user ne peut starrer que les articles
    // de son secteur actif. Empêche la pollution cross-secteur.
    const sectorId = getActiveSectorIdForUser(session.userId);
    const db = getDb();
    const updated = db
      .prepare(
        "UPDATE articles SET is_starred = ? WHERE id = ? AND sector_id = ?"
      )
      .run(starred ? 1 : 0, id, sectorId);

    if (updated.changes === 0) {
      return NextResponse.json(
        { error: "Article introuvable dans votre secteur" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, id, is_starred: !!starred });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update" },
      { status: 500 }
    );
  }
}
