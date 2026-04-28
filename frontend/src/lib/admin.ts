import type Database from "better-sqlite3";

/**
 * Whitelist d'emails super-admin Cipia.
 * Ne JAMAIS modifier sans validation Stephane.
 * Le check est re-effectue cote serveur dans /api/admin/* — pas bypassable client.
 */
export const SUPER_ADMIN_EMAILS: ReadonlyArray<string> = [
  "stephane@hi-commerce.fr",
  "hicommerceweb@gmail.com",
];

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

/**
 * Verifie qu'un userId correspond a un super-admin.
 * Va lire l'email en DB pour eviter de se fier au cookie de session.
 */
export function isSuperAdmin(
  userId: number | undefined,
  db: Database.Database
): boolean {
  if (!userId) return false;
  try {
    const row = db
      .prepare("SELECT email FROM users WHERE id = ?")
      .get(userId) as { email: string } | undefined;
    if (!row) return false;
    return isSuperAdminEmail(row.email);
  } catch {
    return false;
  }
}
