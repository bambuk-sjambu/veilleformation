import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { getDb, DbUser } from "@/lib/db";
import { sessionOptions, SessionData } from "@/lib/session";
import {
  addSectorForUser,
  setActiveSectorForUser,
  DEFAULT_SECTOR_ID,
} from "@/lib/sector-context";
import { sendAdminSignupNotification } from "@/lib/resend";

const VALID_SECTORS = new Set([
  "cipia",
  "haccp",
  "medical",
  "avocats",
  "experts-comptables",
]);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName, sectorId } = body;
    const requestedSector =
      typeof sectorId === "string" && VALID_SECTORS.has(sectorId)
        ? sectorId
        : DEFAULT_SECTOR_ID;

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Tous les champs sont requis." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 8 caractères." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Adresse email invalide." },
        { status: 400 }
      );
    }

    const db = getDb();

    const existing = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email.toLowerCase()) as DbUser | undefined;

    if (existing) {
      // Anti-énumération : on retourne 200 silencieux. Si le user a oublié
      // qu'il a un compte, il peut utiliser /connexion/oubli-mot-de-passe.
      // Côté SEO/RGPD : pas de divulgation de l'existence du compte.
      return NextResponse.json({
        ok: true,
        info: "Si un compte existe déjà avec cette adresse, utilisez la fonction « Mot de passe oublié » pour vous reconnecter.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = db
      .prepare(
        "INSERT INTO users (email, password_hash, first_name, last_name, active_sector_id) VALUES (?, ?, ?, ?, ?)"
      )
      .run(
        email.toLowerCase(),
        passwordHash,
        firstName.trim(),
        lastName.trim(),
        requestedSector
      );

    // Inscrit le user à son secteur primaire (table n:n user_sectors)
    const newUserId = Number(result.lastInsertRowid);
    addSectorForUser(newUserId, requestedSector, true);
    setActiveSectorForUser(newUserId, requestedSector);

    try {
      const totalInscrits = (db
        .prepare("SELECT COUNT(*) AS n FROM users")
        .get() as { n: number }).n;
      await sendAdminSignupNotification({
        type: "Compte",
        email: email.toLowerCase(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        plan: "free",
        totalInscrits,
      });
    } catch (e) {
      console.error("Admin signup notification failed:", e);
    }

    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    session.userId = Number(result.lastInsertRowid);
    session.email = email.toLowerCase();
    session.firstName = firstName.trim();
    session.lastName = lastName.trim();
    session.isLoggedIn = true;
    await session.save();

    return NextResponse.json({
      user: {
        id: result.lastInsertRowid,
        email: email.toLowerCase(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}
