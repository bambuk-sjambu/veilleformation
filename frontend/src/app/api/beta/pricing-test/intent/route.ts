import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { initBetaTables, getClientIp } from "../../_init";

export const dynamic = "force-dynamic";

const VALID_VARIANTS = ["A", "B", "C"] as const;
const VALID_PLANS = ["solo", "cabinet"] as const;

interface IntentBody {
  variantSeen?: string;
  planClicked?: string;
  priceEur?: number;
  email?: string;
}

export async function POST(request: NextRequest) {
  let body: IntentBody;
  try {
    body = (await request.json()) as IntentBody;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const variant = (body.variantSeen || "").trim().toUpperCase();
  const plan = (body.planClicked || "").trim().toLowerCase();
  const price = Number.isFinite(body.priceEur) ? Math.trunc(Number(body.priceEur)) : null;
  const email = body.email ? String(body.email).trim().toLowerCase().slice(0, 254) : null;

  if (!VALID_VARIANTS.includes(variant as (typeof VALID_VARIANTS)[number])) {
    return NextResponse.json({ error: "Variant invalide" }, { status: 400 });
  }
  if (!VALID_PLANS.includes(plan as (typeof VALID_PLANS)[number])) {
    return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
  }
  if (price !== null && (price < 0 || price > 9999)) {
    return NextResponse.json({ error: "Prix invalide" }, { status: 400 });
  }
  if (email !== null && !email.includes("@")) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }

  try {
    const db = getDb();
    initBetaTables(db);

    const ip = getClientIp(request.headers);

    db.prepare(
      `INSERT INTO beta_pricing_intents
         (variant_seen, plan_clicked, price_eur, ip, email)
       VALUES (?, ?, ?, ?, ?)`
    ).run(variant, plan, price, ip || null, email);

    return NextResponse.json({
      ok: true,
      message: "Merci, on vous contacte des l'ouverture de la beta",
    });
  } catch (error) {
    console.error("beta pricing intent error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
