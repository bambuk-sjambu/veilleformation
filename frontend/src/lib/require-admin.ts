/**
 * Helper de protection admin pour les routes API internes (pipeline tests,
 * outils techniques). Refuse 403 si l'utilisateur n'est pas super-admin.
 *
 * Usage :
 *   const guard = await requireAdmin();
 *   if (guard) return guard; // NextResponse 401/403 prêt à retourner
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "./auth";
import { isSuperAdmin } from "./admin";
import { getDb } from "./db";

export async function requireAdmin(): Promise<NextResponse | null> {
  const user = await getCurrentUser();
  if (!user || !user.userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const db = getDb();
  if (!isSuperAdmin(user.userId, db)) {
    return NextResponse.json({ error: "Réservé aux administrateurs" }, { status: 403 });
  }
  return null;
}
