import { NextRequest, NextResponse } from "next/server";
import { getDb, dbExists, DbUser } from "@/lib/db";
import * as bcrypt from "bcryptjs";

const DEFAULT_USER_ID = 1;

export async function GET() {
  try {
    if (!dbExists()) {
      return NextResponse.json({ error: "Base non initialisee" }, { status: 500 });
    }

    const db = getDb();

    // Check which columns exist
    const columns = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
    const columnNames = columns.map(c => c.name);

    const selectFields = [
      "id", "email", "first_name", "last_name",
      columnNames.includes("avatar_url") ? "avatar_url" : "NULL as avatar_url",
      columnNames.includes("phone") ? "phone" : "NULL as phone",
      columnNames.includes("plan") ? "plan" : "'free' as plan",
      columnNames.includes("preferred_regions") ? "preferred_regions" : "NULL as preferred_regions",
      columnNames.includes("stripe_customer_id") ? "stripe_customer_id" : "NULL as stripe_customer_id",
      columnNames.includes("stripe_subscription_id") ? "stripe_subscription_id" : "NULL as stripe_subscription_id",
      columnNames.includes("subscription_status") ? "subscription_status" : "NULL as subscription_status",
      columnNames.includes("subscription_period_end") ? "subscription_period_end" : "NULL as subscription_period_end",
      columnNames.includes("created_at") ? "created_at" : "NULL as created_at",
      columnNames.includes("email_verified") ? "email_verified" : "0 as email_verified"
    ];

    const user = db
      .prepare(`SELECT ${selectFields.join(", ")} FROM users WHERE id = ?`)
      .get(DEFAULT_USER_ID) as Partial<DbUser> | undefined;

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!dbExists()) {
      return NextResponse.json({ error: "Base non initialisee" }, { status: 500 });
    }

    const db = getDb();
    const body = await request.json();

    const { first_name, last_name, phone, avatar_url, preferred_regions } = body;

    // Check if user exists
    const existing = db
      .prepare("SELECT id FROM users WHERE id = ?")
      .get(DEFAULT_USER_ID);

    if (!existing) {
      return NextResponse.json({ error: "Utilisateur non trouve" }, { status: 404 });
    }

    // Check which columns exist
    const columns = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
    const columnNames = columns.map(c => c.name);

    // Update profile
    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (first_name !== undefined) {
      updates.push("first_name = ?");
      values.push(first_name);
    }
    if (last_name !== undefined) {
      updates.push("last_name = ?");
      values.push(last_name);
    }
    if (phone !== undefined && columnNames.includes("phone")) {
      updates.push("phone = ?");
      values.push(phone);
    }
    if (avatar_url !== undefined && columnNames.includes("avatar_url")) {
      updates.push("avatar_url = ?");
      values.push(avatar_url);
    }
    if (preferred_regions !== undefined && columnNames.includes("preferred_regions")) {
      updates.push("preferred_regions = ?");
      values.push(JSON.stringify(preferred_regions));
    }

    if (updates.length > 0) {
      values.push(String(DEFAULT_USER_ID));
      db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...values);
    }

    // Get updated user with safe columns
    const selectFields = [
      "id", "email", "first_name", "last_name",
      columnNames.includes("avatar_url") ? "avatar_url" : "NULL as avatar_url",
      columnNames.includes("phone") ? "phone" : "NULL as phone",
      columnNames.includes("preferred_regions") ? "preferred_regions" : "NULL as preferred_regions",
      "created_at"
    ];

    const updatedUser = db
      .prepare(`SELECT ${selectFields.join(", ")} FROM users WHERE id = ?`)
      .get(DEFAULT_USER_ID) as Partial<DbUser>;

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise a jour" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Change password
  try {
    if (!dbExists()) {
      return NextResponse.json({ error: "Base non initialisee" }, { status: 500 });
    }

    const db = getDb();
    const body = await request.json();
    const { current_password, new_password } = body;

    if (!current_password || !new_password) {
      return NextResponse.json(
        { error: "Mot de passe actuel et nouveau mot de passe requis" },
        { status: 400 }
      );
    }

    if (new_password.length < 8) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 8 caracteres" },
        { status: 400 }
      );
    }

    // Get current user
    const user = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(DEFAULT_USER_ID) as DbUser | undefined;

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouve" }, { status: 404 });
    }

    // Verify current password
    const isValid = await bcrypt.compare(current_password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Mot de passe actuel incorrect" },
        { status: 400 }
      );
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(new_password, 10);

    // Update password
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(newPasswordHash, DEFAULT_USER_ID);

    return NextResponse.json({ success: true, message: "Mot de passe mis a jour" });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "Erreur lors du changement de mot de passe" },
      { status: 500 }
    );
  }
}
