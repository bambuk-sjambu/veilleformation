import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createMagicLink } from "@/lib/founder-tokens";
import { sendFounderActivationEmail } from "@/lib/resend";
import { rateLimitOk, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/forgot-password
 * Body : { email: string }
 *
 * Renvoie 200 même si l'email n'existe pas (anti-énumération). Si le user
 * existe et n'a pas encore activé son mot de passe (Founder pending) ou
 * souhaite réinitialiser, on envoie un magic link.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  if (!rateLimitOk(`auth:forgot:${ip}`, 3, 60_000)) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans une minute." },
      { status: 429 }
    );
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }

  const email = (body.email || "").toLowerCase().trim();
  if (!email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }

  const db = getDb();
  const user = db
    .prepare(
      "SELECT id, first_name, password_set FROM users WHERE email = ?"
    )
    .get(email) as
    | { id: number; first_name: string; password_set: number }
    | undefined;

  // Anti-énumération : on retourne 200 dans tous les cas
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  try {
    const link = createMagicLink(user.id, "set_password");
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://cipia.fr";
    const activationUrl = `${baseUrl}/connexion/activer?token=${encodeURIComponent(link.token)}`;
    await sendFounderActivationEmail(email, activationUrl, user.first_name);
  } catch (e) {
    console.error("forgot-password: failed to send email", e);
  }

  return NextResponse.json({ ok: true });
}
