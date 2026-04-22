import { NextRequest, NextResponse } from "next/server";
import { getDb, dbExists } from "@/lib/db";

interface DbAction {
  id: number;
  article_id: number;
  action_description: string;
  responsible: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!dbExists()) {
      return NextResponse.json({ error: "Base non initialisee" }, { status: 500 });
    }

    const { id } = await params;
    const db = getDb();

    const action = db
      .prepare("SELECT * FROM actions WHERE id = ?")
      .get(parseInt(id, 10)) as DbAction | undefined;

    if (!action) {
      return NextResponse.json({ error: "Action non trouvee" }, { status: 404 });
    }

    return NextResponse.json({ action });
  } catch (error) {
    console.error("Get action error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation de l'action" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!dbExists()) {
      return NextResponse.json({ error: "Base non initialisee" }, { status: 500 });
    }

    const { id } = await params;
    const db = getDb();
    const body = await request.json();

    const { action_description, responsible, status, priority, due_date, notes } = body;

    // Check if action exists
    const existing = db
      .prepare("SELECT id FROM actions WHERE id = ?")
      .get(parseInt(id, 10));

    if (!existing) {
      return NextResponse.json({ error: "Action non trouvee" }, { status: 404 });
    }

    // Build update query dynamically
    const updates: string[] = ["updated_at = datetime('now')"];
    const values: (string | null)[] = [];

    if (action_description !== undefined) {
      updates.push("action_description = ?");
      values.push(action_description);
    }
    if (responsible !== undefined) {
      updates.push("responsible = ?");
      values.push(responsible);
    }
    if (status !== undefined) {
      updates.push("status = ?");
      values.push(status);

      // Set completed_at if status is 'fait'
      if (status === "fait") {
        updates.push("completed_at = datetime('now')");
      }
    }
    if (priority !== undefined) {
      updates.push("priority = ?");
      values.push(priority);
    }
    if (due_date !== undefined) {
      updates.push("due_date = ?");
      values.push(due_date);
    }
    if (notes !== undefined) {
      updates.push("notes = ?");
      values.push(notes);
    }

    values.push(id);

    db.prepare(`
      UPDATE actions SET ${updates.join(", ")} WHERE id = ?
    `).run(...values);

    const updatedAction = db
      .prepare("SELECT * FROM actions WHERE id = ?")
      .get(parseInt(id, 10)) as DbAction;

    return NextResponse.json({ action: updatedAction });
  } catch (error) {
    console.error("Update action error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise a jour de l'action" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!dbExists()) {
      return NextResponse.json({ error: "Base non initialisee" }, { status: 500 });
    }

    const { id } = await params;
    const db = getDb();

    const result = db
      .prepare("DELETE FROM actions WHERE id = ?")
      .run(parseInt(id, 10));

    if (result.changes === 0) {
      return NextResponse.json({ error: "Action non trouvee" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete action error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'action" },
      { status: 500 }
    );
  }
}
