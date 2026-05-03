// Tables SQLite isolees pour les landings beta (HACCP + pricing-test).
// Idempotent : appele depuis chaque route /api/beta/*.

import type Database from "better-sqlite3";

let initialized = false;

export function initBetaTables(db: Database.Database): void {
  if (initialized) return;
  db.exec(`
    CREATE TABLE IF NOT EXISTS beta_signups_haccp (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      sector TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip TEXT,
      user_agent TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_beta_signups_haccp_email
      ON beta_signups_haccp(email);

    CREATE TABLE IF NOT EXISTS beta_pricing_visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      variant TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip TEXT,
      user_agent TEXT
    );

    CREATE TABLE IF NOT EXISTS beta_pricing_intents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      variant_seen TEXT NOT NULL,
      plan_clicked TEXT NOT NULL,
      price_eur INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip TEXT,
      email TEXT
    );
  `);
  initialized = true;
}

export function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "";
}
