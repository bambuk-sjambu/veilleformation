import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "..", "data", "veille.db");

let db: Database.Database | null = null;

export function dbExists(): boolean {
  return fs.existsSync(DB_PATH);
}

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        email_verified INTEGER DEFAULT 0
      );
    `);
  }
  return db;
}

export interface DbUser {
  id: number;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  created_at: string;
  email_verified: number;
}

export interface DbArticle {
  id: number;
  source: string;
  source_id: string;
  title: string;
  url: string | null;
  content: string | null;
  published_date: string | null;
  collected_at: string;
  category: string | null;
  status: string;
  summary: string | null;
  impact_level: string | null;
  impact_justification: string | null;
  qualiopi_indicators: string | null;
  qualiopi_justification: string | null;
  relevance_score: number | null;
  typologie_ao: string | null;
  acheteur: string | null;
  region: string | null;
  montant_estime: number | null;
  date_limite: string | null;
  cpv_code: string | null;
  processed_at: string | null;
  sent_in_newsletter_id: number | null;
  is_read: number;
  is_starred: number;
}

export interface DbNewsletter {
  id: number;
  edition_number: number;
  subject: string;
  html_content: string | null;
  sent_at: string | null;
  recipients_count: number;
  brevo_campaign_id: string | null;
  open_rate: number | null;
  click_rate: number | null;
  unsubscribe_count: number;
  archive_url: string | null;
}
