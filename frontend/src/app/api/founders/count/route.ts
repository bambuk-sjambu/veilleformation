import { NextResponse } from "next/server";
import { getDb, dbExists } from "@/lib/db";
import { FOUNDER_CAPS } from "@/lib/stripe";
import { countActiveReservations } from "@/lib/founder-reservations";

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
  // Inclut les réservations actives (sessions Stripe en cours) pour aligner
  // sur la logique de /api/founders/checkout. Sinon on affiche "phase 1
  // disponible" alors que le checkout bascule sur phase 2 (incohérence prix).
  const phase1Reserved = countActiveReservations(1);
  const phase1Effective = phase1Sold + phase1Reserved;
  const phase1SoldOut = phase1Effective >= phase1Cap;

  // Tant que la phase 1 n'est pas vidée, c'est elle l'active
  if (!phase1SoldOut) {
    return NextResponse.json({
      activePhase: 1,
      sold: phase1Sold,
      cap: phase1Cap,
      remaining: Math.max(0, phase1Cap - phase1Effective),
      isSoldOut: false,
    });
  }

  // Sinon on bascule sur phase 2
  const phase2Reserved = countActiveReservations(2);
  const phase2Effective = phase2Sold + phase2Reserved;
  return NextResponse.json({
    activePhase: 2,
    sold: phase2Sold,
    cap: phase2Cap,
    remaining: Math.max(0, phase2Cap - phase2Effective),
    isSoldOut: phase2Effective >= phase2Cap,
  });
}
