import { NextRequest, NextResponse } from "next/server";
import { getDb, dbExists } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    if (!dbExists()) {
      return NextResponse.json({ error: "DB not found" }, { status: 500 });
    }

    const body = await request.json();
    const { id, readStatus } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing article id" }, { status: 400 });
    }

    const validStatuses = ["a_lire", "interessant", "a_exploiter"];
    if (readStatus && !validStatuses.includes(readStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const db = getDb();

    // Check if column exists, add migration if needed
    try {
      const columns = db.prepare("PRAGMA table_info(articles)").all() as { name: string }[];
      if (!columns.find(c => c.name === "read_status")) {
        db.exec(`ALTER TABLE articles ADD COLUMN read_status TEXT DEFAULT 'a_lire'`);
      }
    } catch {
      // Column doesn't exist, add it
    }

    try {
      db.prepare("UPDATE articles SET read_status = ? WHERE id = ?").run(readStatus, id);
    } catch (error) {
      console.error("Failed to update read status:", error);
      return NextResponse.json(
        { error: "Failed to update read status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      id,
      read_status: readStatus || null,
    });
  }
 catch (error) {
    console.error("Read status error:", error);
    return NextResponse.json(
      { error: "Failed to update" },
      { status: 500 }
    );
  }
}
