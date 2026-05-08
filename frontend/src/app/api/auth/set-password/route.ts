import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { sessionOptions, SessionData } from "@/lib/session";
import { consumeMagicLink, checkMagicLink } from "@/lib/founder-tokens";
import { rateLimitOk, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/set-password
 * Body : { token: string, password: string }
 * Échange un magic link valide contre un mot de passe défini + connexion auto.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  if (!rateLimitOk(`auth:set-password:${ip}`, 5, 60_000)) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans une minute." },
      { status: 429 }
    );
  }

  let body: { token?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }

  const { token, password } = body;
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token manquant" }, { status: 400 });
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "Mot de passe trop court (8 caractères minimum)" },
      { status: 400 }
    );
  }

  const userId = consumeMagicLink(token, "set_password");
  if (!userId) {
    return NextResponse.json(
      { error: "Lien invalide, expiré, ou déjà utilisé." },
      { status: 400 }
    );
  }

  const db = getDb();
  const user = db
    .prepare("SELECT id, email, first_name, last_name FROM users WHERE id = ?")
    .get(userId) as
    | { id: number; email: string; first_name: string; last_name: string }
    | undefined;
  if (!user) {
    return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  db.prepare(
    "UPDATE users SET password_hash = ?, password_set = 1 WHERE id = ?"
  ).run(passwordHash, userId);

  // Auto-connexion : on enregistre la session iron-session
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  session.userId = user.id;
  session.email = user.email;
  session.firstName = user.first_name;
  session.lastName = user.last_name;
  session.isLoggedIn = true;
  await session.save();

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
    },
  });
}

/**
 * GET /api/auth/set-password?token=XXX
 * Vérifie sans consommer si le token est valide (page de saisie mot de passe).
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ valid: false, reason: "Token manquant" });
  }
  const result = checkMagicLink(token, "set_password");
  return NextResponse.json(result);
}
