/**
 * Multi-secteurs (pivot X.1) : helpers de lookup côté server.
 *
 * Un user peut être abonné à 1+ secteurs (table `user_sectors`). Le secteur
 * affiché à un instant t est `users.active_sector_id`. Le switcher en header
 * change cette colonne via POST /api/sectors/switch.
 */

import { getDb } from "./db";
import { getCurrentUser } from "./auth";

export const DEFAULT_SECTOR_ID = "cipia";

/**
 * Secteur effectif pour la requête courante :
 * - user authentifié → users.active_sector_id
 * - visiteur public  → DEFAULT_SECTOR_ID ('cipia')
 *
 * À utiliser dans toutes les routes API qui retournent du contenu sectoriel
 * (articles, stats, export, alertes…).
 */
export async function getCurrentSectorId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user || !user.userId) return DEFAULT_SECTOR_ID;
  return getActiveSectorIdForUser(user.userId);
}

export interface UserSector {
  sector_id: string;
  is_primary: number; // 0 / 1
  subscribed_at: string | null;
}

export function getActiveSectorIdForUser(userId: number): string {
  try {
    const db = getDb();
    const row = db
      .prepare("SELECT active_sector_id FROM users WHERE id = ?")
      .get(userId) as { active_sector_id: string | null } | undefined;
    return row?.active_sector_id || DEFAULT_SECTOR_ID;
  } catch {
    return DEFAULT_SECTOR_ID;
  }
}

export function getUserSectors(userId: number): UserSector[] {
  try {
    const db = getDb();
    return db
      .prepare(
        `SELECT sector_id, is_primary, subscribed_at
           FROM user_sectors
          WHERE user_id = ?
          ORDER BY is_primary DESC, subscribed_at ASC`
      )
      .all(userId) as UserSector[];
  } catch {
    return [];
  }
}

export function userHasSector(userId: number, sectorId: string): boolean {
  try {
    const db = getDb();
    const row = db
      .prepare(
        "SELECT 1 FROM user_sectors WHERE user_id = ? AND sector_id = ? LIMIT 1"
      )
      .get(userId, sectorId);
    return !!row;
  } catch {
    return false;
  }
}

export function setActiveSectorForUser(
  userId: number,
  sectorId: string
): boolean {
  if (!userHasSector(userId, sectorId)) return false;
  const db = getDb();
  db.prepare("UPDATE users SET active_sector_id = ? WHERE id = ?").run(
    sectorId,
    userId
  );
  return true;
}

export function addSectorForUser(
  userId: number,
  sectorId: string,
  isPrimary = false
): void {
  const db = getDb();
  db.prepare(
    `INSERT OR IGNORE INTO user_sectors (user_id, sector_id, is_primary)
     VALUES (?, ?, ?)`
  ).run(userId, sectorId, isPrimary ? 1 : 0);
  if (isPrimary) {
    // S'assure qu'il n'y a qu'un seul primary par user
    db.prepare(
      "UPDATE user_sectors SET is_primary = 0 WHERE user_id = ? AND sector_id != ?"
    ).run(userId, sectorId);
    db.prepare(
      "UPDATE user_sectors SET is_primary = 1 WHERE user_id = ? AND sector_id = ?"
    ).run(userId, sectorId);
  }
}
