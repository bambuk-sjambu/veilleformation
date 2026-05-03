import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { initBetaTables, getClientIp } from "../../_init";

export const dynamic = "force-dynamic";

const VALID_SECTORS = [
  "restaurant",
  "boulangerie-patisserie",
  "traiteur",
  "industrie-agro",
  "autre",
] as const;

interface SignupBody {
  email?: string;
  sector?: string;
  website?: string; // honeypot
}

export async function POST(request: NextRequest) {
  let body: SignupBody;
  try {
    body = (await request.json()) as SignupBody;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  // Honeypot anti-bots
  if (body.website && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const email = (body.email || "").trim().toLowerCase();
  const sector = (body.sector || "").trim();

  if (!email || !email.includes("@") || email.length > 254) {
    return NextResponse.json(
      { error: "Adresse email invalide" },
      { status: 400 }
    );
  }
  if (!VALID_SECTORS.includes(sector as (typeof VALID_SECTORS)[number])) {
    return NextResponse.json(
      { error: "Secteur invalide" },
      { status: 400 }
    );
  }

  try {
    const db = getDb();
    initBetaTables(db);

    const ip = getClientIp(request.headers);
    const ua = request.headers.get("user-agent") || "";

    db.prepare(
      `INSERT INTO beta_signups_haccp (email, sector, ip, user_agent)
       VALUES (?, ?, ?, ?)`
    ).run(email, sector, ip || null, ua.slice(0, 500) || null);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("beta haccp signup error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
