/**
 * Magic links pour activation Founder (set password) et reset password.
 *
 * Workflow :
 * 1. Webhook Stripe crée user Founder avec password_set=0
 * 2. createMagicLink(userId) → token clair retourné, hash stocké en DB
 * 3. Email Resend envoyé avec lien /connexion/activer?token=<clair>
 * 4. User clique → POST /api/auth/set-password { token, password }
 * 5. consumeMagicLink(token, purpose) → valide expiration, retourne userId
 * 6. bcrypt.hash(password) + UPDATE users.password_hash + password_set=1
 */

import crypto from "crypto";
import { getDb } from "./db";

const TOKEN_TTL_HOURS = 72; // 3 jours pour activer
const TOKEN_BYTES = 32;

export interface MagicLink {
  token: string;       // clair, à envoyer au user (jamais stocké en clair)
  expiresAt: Date;
}

function hashToken(plain: string): string {
  return crypto.createHash("sha256").update(plain).digest("hex");
}

/**
 * Crée un magic link pour un user. Retourne le token clair (à inclure dans
 * l'URL email). Le hash sha256 est stocké en DB.
 */
export function createMagicLink(
  userId: number,
  purpose: "set_password" | "reset_password" = "set_password"
): MagicLink {
  const tokenPlain = crypto.randomBytes(TOKEN_BYTES).toString("hex");
  const tokenHash = hashToken(tokenPlain);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 3600 * 1000);

  const db = getDb();
  db.prepare(
    `INSERT INTO password_reset_tokens (user_id, token_hash, purpose, expires_at)
     VALUES (?, ?, ?, ?)`
  ).run(userId, tokenHash, purpose, expiresAt.toISOString());

  return { token: tokenPlain, expiresAt };
}

/**
 * Valide un magic link. Retourne le user_id si valide, null sinon.
 * Le token est marqué comme used (single-use) à la consommation.
 */
export function consumeMagicLink(
  tokenPlain: string,
  purpose: "set_password" | "reset_password" = "set_password"
): number | null {
  if (!tokenPlain || tokenPlain.length < 32) return null;

  const tokenHash = hashToken(tokenPlain);
  const db = getDb();

  const row = db
    .prepare(
      `SELECT id, user_id, expires_at, used_at
         FROM password_reset_tokens
        WHERE token_hash = ? AND purpose = ?`
    )
    .get(tokenHash, purpose) as
    | { id: number; user_id: number; expires_at: string; used_at: string | null }
    | undefined;

  if (!row) return null;
  if (row.used_at) return null; // single-use
  if (new Date(row.expires_at) < new Date()) return null;

  // Mark as used
  db.prepare(
    "UPDATE password_reset_tokens SET used_at = datetime('now') WHERE id = ?"
  ).run(row.id);

  return row.user_id;
}

/**
 * Vérifie qu'un token est valide SANS le consommer (pour la page d'affichage
 * du formulaire de mot de passe).
 */
export function checkMagicLink(
  tokenPlain: string,
  purpose: "set_password" | "reset_password" = "set_password"
): { valid: boolean; userId?: number; reason?: string } {
  if (!tokenPlain || tokenPlain.length < 32) {
    return { valid: false, reason: "Token invalide" };
  }
  const tokenHash = hashToken(tokenPlain);
  const db = getDb();
  const row = db
    .prepare(
      `SELECT user_id, expires_at, used_at
         FROM password_reset_tokens
        WHERE token_hash = ? AND purpose = ?`
    )
    .get(tokenHash, purpose) as
    | { user_id: number; expires_at: string; used_at: string | null }
    | undefined;

  if (!row) return { valid: false, reason: "Lien invalide ou expiré" };
  if (row.used_at) return { valid: false, reason: "Ce lien a déjà été utilisé" };
  if (new Date(row.expires_at) < new Date()) {
    return { valid: false, reason: "Lien expiré (3 jours max)" };
  }

  return { valid: true, userId: row.user_id };
}
