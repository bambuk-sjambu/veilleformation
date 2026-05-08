/**
 * Anti-TOCTOU sur le cap Founder. Avant `sessions.create`, on RÉSERVE une
 * place pendant 30 min (durée standard d'un checkout Stripe). Le compteur
 * effectif = users (payés) + reservations actives non expirées.
 *
 * Lifecycle :
 * - POST /api/founders/checkout : insère reservation(stripe_session_id, phase, expires_at = now+30min)
 * - Webhook checkout.session.completed : DELETE reservation + INSERT user (transaction)
 * - Webhook checkout.session.expired : DELETE reservation
 * - GC : reservations expirées (expires_at < now) sont ignorées dans le COUNT,
 *   purgées périodiquement par /api/founders/count en best-effort.
 */

import { getDb } from "./db";

const RESERVATION_TTL_MINUTES = 30;

export function reserveFounderSeat(
  stripeSessionId: string,
  phase: 1 | 2
): boolean {
  const db = getDb();
  const expiresAt = new Date(
    Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000
  ).toISOString();
  try {
    db.prepare(
      `INSERT INTO founder_reservations (stripe_session_id, phase, expires_at)
       VALUES (?, ?, ?)`
    ).run(stripeSessionId, phase, expiresAt);
    return true;
  } catch {
    // Probable doublon de session_id, on considère que c'est déjà réservé
    return false;
  }
}

export function releaseFounderReservation(stripeSessionId: string): void {
  const db = getDb();
  db.prepare(
    "DELETE FROM founder_reservations WHERE stripe_session_id = ?"
  ).run(stripeSessionId);
}

/**
 * Nombre de réservations actives (non expirées) pour une phase.
 * Best-effort GC : purge les expirées au passage.
 */
export function countActiveReservations(phase: 1 | 2): number {
  const db = getDb();
  // Purge expirées (best-effort, non bloquant)
  try {
    db.prepare(
      "DELETE FROM founder_reservations WHERE expires_at < datetime('now')"
    ).run();
  } catch {
    // ignore
  }
  const row = db
    .prepare(
      `SELECT COUNT(*) as n FROM founder_reservations
       WHERE phase = ? AND expires_at > datetime('now')`
    )
    .get(phase) as { n: number };
  return row?.n || 0;
}

/**
 * Marque un event Stripe comme traité. Retourne true si c'est la première fois
 * (à process), false si déjà vu (à skip).
 *
 * Idempotence Stripe : event.id est stable même sur retry.
 */
export function markEventProcessed(eventId: string, eventType: string): boolean {
  const db = getDb();
  try {
    db.prepare(
      `INSERT INTO processed_events (event_id, event_type) VALUES (?, ?)`
    ).run(eventId, eventType);
    return true;
  } catch {
    // UNIQUE constraint failed → déjà traité
    return false;
  }
}
