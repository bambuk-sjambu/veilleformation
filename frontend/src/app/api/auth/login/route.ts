import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { getDb, DbUser } from "@/lib/db";
import { sessionOptions, SessionData } from "@/lib/session";
import { rateLimitOk, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

interface DbUserWithPasswordSet extends DbUser {
  password_set?: number;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit anti-bruteforce : 5 tentatives/min/IP
    const ip = getClientIp(request.headers);
    if (!rateLimitOk(`auth:login:${ip}`, 5, 60_000)) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez dans une minute." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis." },
        { status: 400 }
      );
    }

    const db = getDb();

    const user = db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(email.toLowerCase()) as DbUserWithPasswordSet | undefined;

    if (!user) {
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect." },
        { status: 401 }
      );
    }

    // Founder pending : mot de passe pas encore défini → orienter vers activation
    if (user.password_set === 0) {
      return NextResponse.json(
        {
          error:
            "Compte non activé. Vérifiez votre email d'activation Founder, ou demandez un nouveau lien.",
          requiresActivation: true,
        },
        { status: 403 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect." },
        { status: 401 }
      );
    }

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
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}
