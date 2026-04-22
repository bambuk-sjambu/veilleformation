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
        avatar_url TEXT,
        phone TEXT,
        plan TEXT DEFAULT 'free' CHECK(plan IN ('free', 'solo', 'equipe', 'agence')),
        preferred_regions TEXT,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        subscription_status TEXT CHECK(subscription_status IN ('active', 'past_due', 'canceled', 'incomplete')),
        subscription_period_end DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        email_verified INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article_id INTEGER NOT NULL,
        action_description TEXT NOT NULL,
        responsible TEXT,
        status TEXT DEFAULT 'a_faire' CHECK(status IN ('a_faire', 'en_cours', 'fait', 'annule')),
        priority TEXT DEFAULT 'moyenne' CHECK(priority IN ('basse', 'moyenne', 'haute')),
        due_date DATE,
        completed_at DATETIME,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS user_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        company_name TEXT NOT NULL,
        siret TEXT,
        nde TEXT,
        address TEXT,
        city TEXT,
        phone TEXT,
        email TEXT,
        website TEXT,
        logo_url TEXT,
        responsible_name TEXT,
        responsible_function TEXT,
        methodology_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Alertes personnalisees
      CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        keywords TEXT NOT NULL,
        regions TEXT,
        indicators TEXT,
        categories TEXT,
        frequency TEXT DEFAULT 'instant' CHECK(frequency IN ('instant', 'daily', 'weekly')),
        active INTEGER DEFAULT 1,
        last_triggered_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Equipes
      CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        owner_id INTEGER NOT NULL,
        plan TEXT DEFAULT 'equipe' CHECK(plan IN ('equipe', 'agence')),
        max_members INTEGER DEFAULT 5,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS team_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        role TEXT DEFAULT 'member' CHECK(role IN ('owner', 'admin', 'member')),
        invited_by INTEGER,
        invited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        joined_at DATETIME,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (invited_by) REFERENCES users(id),
        UNIQUE(team_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS team_invitations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        email TEXT NOT NULL,
        role TEXT DEFAULT 'member' CHECK(role IN ('admin', 'member')),
        token TEXT UNIQUE NOT NULL,
        invited_by INTEGER NOT NULL,
        expires_at DATETIME NOT NULL,
        accepted INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        FOREIGN KEY (invited_by) REFERENCES users(id)
      );

      -- Contenu externe
      CREATE TABLE IF NOT EXISTS external_contents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        team_id INTEGER,
        source_type TEXT NOT NULL CHECK(source_type IN ('url', 'file')),
        source_url TEXT,
        file_name TEXT,
        file_path TEXT,
        title TEXT NOT NULL,
        content TEXT,
        summary TEXT,
        qualiopi_indicators TEXT,
        impact_level TEXT CHECK(impact_level IN ('fort', 'moyen', 'faible')),
        relevance_score INTEGER,
        processed INTEGER DEFAULT 0,
        processed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
      );

      -- Historique des alertes declenchees
      CREATE TABLE IF NOT EXISTS alert_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        alert_id INTEGER NOT NULL,
        article_id INTEGER,
        external_content_id INTEGER,
        triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        notified INTEGER DEFAULT 0,
        FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE,
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
        FOREIGN KEY (external_content_id) REFERENCES external_contents(id) ON DELETE CASCADE
      );
    `);

    // Run migrations for existing databases
    try {
      // Check if plan column exists
      const columns = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
      const columnNames = columns.map(c => c.name);

      if (!columnNames.includes('plan')) {
        db.exec(`ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free'`);
      }
      if (!columnNames.includes('stripe_customer_id')) {
        db.exec(`ALTER TABLE users ADD COLUMN stripe_customer_id TEXT`);
      }
      if (!columnNames.includes('stripe_subscription_id')) {
        db.exec(`ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT`);
      }
      if (!columnNames.includes('subscription_status')) {
        db.exec(`ALTER TABLE users ADD COLUMN subscription_status TEXT`);
      }
      if (!columnNames.includes('subscription_period_end')) {
        db.exec(`ALTER TABLE users ADD COLUMN subscription_period_end DATETIME`);
      }
      if (!columnNames.includes('preferred_regions')) {
        db.exec(`ALTER TABLE users ADD COLUMN preferred_regions TEXT`);
      }
    } catch {
      // Migration failed, table might not exist yet
    }
  }
  return db;
}

export interface DbUser {
  id: number;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  phone: string | null;
  plan: string;
  preferred_regions: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  subscription_period_end: string | null;
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
  read_status: string | null; // 'a_lire', 'interessant', 'a_exploiter'
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

export interface DbAction {
  id: number;
  article_id: number;
  action_description: string;
  responsible: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbUserProfile {
  id: number;
  user_id: number;
  company_name: string;
  siret: string | null;
  nde: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  responsible_name: string | null;
  responsible_function: string | null;
  methodology_notes: string | null;
  created_at: string;
  updated_at: string;
}

// Alertes personnalisees
export interface DbAlert {
  id: number;
  user_id: number;
  name: string;
  keywords: string; // JSON array
  regions: string | null; // JSON array
  indicators: string | null; // JSON array
  categories: string | null; // JSON array
  frequency: string;
  active: number;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

// Equipes
export interface DbTeam {
  id: number;
  name: string;
  owner_id: number;
  plan: string;
  max_members: number;
  created_at: string;
  updated_at: string;
}

export interface DbTeamMember {
  id: number;
  team_id: number;
  user_id: number;
  role: string;
  invited_by: number | null;
  invited_at: string;
  joined_at: string | null;
}

export interface DbTeamInvitation {
  id: number;
  team_id: number;
  email: string;
  role: string;
  token: string;
  invited_by: number;
  expires_at: string;
  accepted: number;
  created_at: string;
}

// Contenu externe
export interface DbExternalContent {
  id: number;
  user_id: number;
  team_id: number | null;
  source_type: string;
  source_url: string | null;
  file_name: string | null;
  file_path: string | null;
  title: string;
  content: string | null;
  summary: string | null;
  qualiopi_indicators: string | null;
  impact_level: string | null;
  relevance_score: number | null;
  processed: number;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Historique des alertes
export interface DbAlertHistory {
  id: number;
  alert_id: number;
  article_id: number | null;
  external_content_id: number | null;
  triggered_at: string;
  notified: number;
}
