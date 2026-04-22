import { getDb } from "./db";

export type PlanType = "free" | "solo" | "equipe" | "agence";

export interface PlanFeatures {
  maxExports: number; // -1 = unlimited
  hasAlertes: boolean;
  hasEquipe: boolean;
  maxUsers: number;
  hasApi: boolean;
  hasWhiteLabel: boolean;
  historyMonths: number;
}

export const PLAN_FEATURES: Record<PlanType, PlanFeatures> = {
  free: {
    maxExports: 1,
    hasAlertes: false,
    hasEquipe: false,
    maxUsers: 1,
    hasApi: false,
    hasWhiteLabel: false,
    historyMonths: 1,
  },
  solo: {
    maxExports: -1,
    hasAlertes: true,
    hasEquipe: false,
    maxUsers: 1,
    hasApi: false,
    hasWhiteLabel: false,
    historyMonths: 6,
  },
  equipe: {
    maxExports: -1,
    hasAlertes: true,
    hasEquipe: true,
    maxUsers: 5,
    hasApi: false,
    hasWhiteLabel: false,
    historyMonths: 12,
  },
  agence: {
    maxExports: -1,
    hasAlertes: true,
    hasEquipe: true,
    maxUsers: 20,
    hasApi: true,
    hasWhiteLabel: true,
    historyMonths: 24,
  },
};

export function getPlanFeatures(plan: PlanType): PlanFeatures {
  return PLAN_FEATURES[plan] || PLAN_FEATURES.free;
}

export function getUserPlan(userId: number): PlanType {
  const db = getDb();
  const user = db
    .prepare("SELECT plan FROM users WHERE id = ?")
    .get(userId) as { plan: string } | undefined;
  return (user?.plan as PlanType) || "free";
}

export function canExport(userId: number): { allowed: boolean; reason?: string } {
  const plan = getUserPlan(userId);
  const features = getPlanFeatures(plan);

  if (features.maxExports === -1) {
    return { allowed: true };
  }

  // Check exports this month for free users
  const db = getDb();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Ensure export_logs table exists
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS export_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        articles_count INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
  } catch {
    // Table already exists or creation failed
  }

  try {
    const exportsCount = db
      .prepare(`
        SELECT COUNT(*) as count
        FROM export_logs
        WHERE user_id = ? AND created_at >= ?
      `)
      .get(userId, startOfMonth) as { count: number };

    if (exportsCount.count >= features.maxExports) {
      return {
        allowed: false,
        reason: `Limite d'exports atteinte (${features.maxExports}/mois). Passez a un plan superieur pour des exports illimites.`,
      };
    }
  } catch {
    // If query fails, allow export
  }

  return { allowed: true };
}

export function logExport(userId: number, articlesCount: number): void {
  const db = getDb();
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS export_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        articles_count INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    db.prepare("INSERT INTO export_logs (user_id, articles_count) VALUES (?, ?)").run(userId, articlesCount);
  } catch {
    // Ignore errors
  }
}
