import { NextRequest, NextResponse } from "next/server";
import { getDb, dbExists } from "@/lib/db";
import { getSession } from "@/lib/auth";

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

    const db = getDb();
    db.prepare("UPDATE articles SET is_starred = ? WHERE id = ?").run(
      starred ? 1 : 0,
      id
    );

    return NextResponse.json({ ok: true, id, is_starred: !!starred });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update" },
      { status: 500 }
    );
  }
}
