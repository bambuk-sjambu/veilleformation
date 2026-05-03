import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { initBetaTables, getClientIp } from "../../_init";

export const dynamic = "force-dynamic";

const VALID_VARIANTS = ["A", "B", "C"] as const;

interface VisitBody {
  variant?: string;
}

export async function POST(request: NextRequest) {
  let body: VisitBody;
  try {
    body = (await request.json()) as VisitBody;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const variant = (body.variant || "").trim().toUpperCase();
  if (!VALID_VARIANTS.includes(variant as (typeof VALID_VARIANTS)[number])) {
    return NextResponse.json({ error: "Variant invalide" }, { status: 400 });
  }

  try {
    const db = getDb();
    initBetaTables(db);

    const ip = getClientIp(request.headers);
    const ua = request.headers.get("user-agent") || "";

    db.prepare(
      `INSERT INTO beta_pricing_visits (variant, ip, user_agent)
       VALUES (?, ?, ?)`
    ).run(variant, ip || null, ua.slice(0, 500) || null);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("beta pricing visit error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
