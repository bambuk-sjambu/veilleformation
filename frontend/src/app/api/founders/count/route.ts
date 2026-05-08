import { NextResponse } from "next/server";
import { getDb, dbExists } from "@/lib/db";
import { FOUNDER_CAPS } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/founders/count
 *
 * Retourne le nombre de places vendues + restantes pour la phase active.
 * Phase 1 = 250 lifetime OF Qualiopi.
 * Phase 2 démarre quand phase 1 = sold out.
 */
export async function GET() {
  if (!dbExists()) {
    return NextResponse.json({
      activePhase: 1,
      sold: 0,
      cap: FOUNDER_CAPS.phase1,
      remaining: FOUNDER_CAPS.phase1,
      isSoldOut: false,
    });
  }

  const db = getDb();
  let phase1Sold = 0;
  let phase2Sold = 0;
  try {
    phase1Sold = (
      db
        .prepare("SELECT COUNT(*) as n FROM users WHERE founder_phase = 1")
        .get() as { n: number }
    ).n;
    phase2Sold = (
      db
        .prepare("SELECT COUNT(*) as n FROM users WHERE founder_phase = 2")
        .get() as { n: number }
    ).n;
  } catch {
    // table users.founder_phase may not yet exist (migration 011 not run)
  }

  const phase1Cap = FOUNDER_CAPS.phase1;
  const phase2Cap = FOUNDER_CAPS.phase2;
  const phase1SoldOut = phase1Sold >= phase1Cap;

  // Tant que la phase 1 n'est pas vidée, c'est elle l'active
  if (!phase1SoldOut) {
    return NextResponse.json({
      activePhase: 1,
      sold: phase1Sold,
      cap: phase1Cap,
      remaining: Math.max(0, phase1Cap - phase1Sold),
      isSoldOut: false,
    });
  }

  // Sinon on bascule sur phase 2
  return NextResponse.json({
    activePhase: 2,
    sold: phase2Sold,
    cap: phase2Cap,
    remaining: Math.max(0, phase2Cap - phase2Sold),
    isSoldOut: phase2Sold >= phase2Cap,
  });
}
