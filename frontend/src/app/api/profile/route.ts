import { NextRequest, NextResponse } from "next/server";
import { getDb, dbExists, DbUserProfile } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    if (!dbExists()) {
      return NextResponse.json({ error: "Base non initialisee" }, { status: 500 });
    }

    const db = getDb();

    const tableCheck = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_profiles'")
      .get();

    if (!tableCheck) {
      return NextResponse.json({ profile: null });
    }

    const profile = db
      .prepare("SELECT * FROM user_profiles WHERE user_id = ?")
      .get(session.userId) as DbUserProfile | undefined;

    return NextResponse.json({ profile: profile || null });
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation du profil" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    if (!dbExists()) {
      return NextResponse.json({ error: "Base non initialisee" }, { status: 500 });
    }

    const db = getDb();
    const body = await request.json();

    const {
      company_name,
      siret,
      nde,
      address,
      city,
      phone,
      email,
      website,
      logo_url,
      responsible_name,
      responsible_function,
      methodology_notes
    } = body;

    if (!company_name) {
      return NextResponse.json(
        { error: "Le nom de l'entreprise est requis" },
        { status: 400 }
      );
    }

    // Check if profile exists
    const existing = db
      .prepare("SELECT id FROM user_profiles WHERE user_id = ?")
      .get(session.userId);

    if (existing) {
      // Update existing profile
      db.prepare(`
        UPDATE user_profiles SET
          company_name = ?,
          siret = ?,
          nde = ?,
          address = ?,
          city = ?,
          phone = ?,
          email = ?,
          website = ?,
          logo_url = ?,
          responsible_name = ?,
          responsible_function = ?,
          methodology_notes = ?,
          updated_at = datetime('now')
        WHERE user_id = ?
      `).run(
        company_name,
        siret || null,
        nde || null,
        address || null,
        city || null,
        phone || null,
        email || null,
        website || null,
        logo_url || null,
        responsible_name || null,
        responsible_function || null,
        methodology_notes || null,
        session.userId
      );
    } else {
      // Create new profile
      db.prepare(`
        INSERT INTO user_profiles (
          user_id, company_name, siret, nde, address, city, phone, email,
          website, logo_url, responsible_name, responsible_function, methodology_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        session.userId,
        company_name,
        siret || null,
        nde || null,
        address || null,
        city || null,
        phone || null,
        email || null,
        website || null,
        logo_url || null,
        responsible_name || null,
        responsible_function || null,
        methodology_notes || null
      );
    }

    const updatedProfile = db
      .prepare("SELECT * FROM user_profiles WHERE user_id = ?")
      .get(session.userId) as DbUserProfile;

    return NextResponse.json({ profile: updatedProfile });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise a jour du profil" },
      { status: 500 }
    );
  }
}
