"""SQLite database layer for Cipia.

Aligned with Cahier des Charges v1.2.
"""

import json
import os
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional


# ------------------------------------------------------------
# Multi-sector extra_meta helpers
# ------------------------------------------------------------
# Champs AO / sector-specific regroupes dans le JSON `extra_meta`.
# Ces champs ne sont PAS des colonnes DB depuis A.4.d — ils vivent
# uniquement dans extra_meta.
EXTRA_META_FIELDS = [
    "theme_formation",
    "typologie_ao",
    "cpv_code",
    "acheteur",
    "montant_estime",
    "region",
    "date_limite",
]


def build_extra_meta(article: dict) -> str:
    """Construit le JSON `extra_meta` a partir des champs AO non-null.

    Aligne avec le backfill de scripts/migrate_004_taxonomy_extra_meta.py :
    - parcourt EXTRA_META_FIELDS,
    - garde uniquement les valeurs non-null et non vides,
    - serialise en JSON (UTF-8, default=str pour les dates/datetime).
    Si aucun champ n'est present, retourne '{}'.
    """
    meta = {}
    for field in EXTRA_META_FIELDS:
        value = article.get(field)
        if value is not None and value != "":
            meta[field] = value
    return json.dumps(meta, ensure_ascii=False, default=str)


# Complete schema aligned with Cahier des Charges v1.2

SCHEMA_SQL = """
-- Articles (articles collectes from all sources)
CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  source_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  url TEXT,
  content TEXT,
  published_date DATE,
  collected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  category TEXT CHECK(category IN ('reglementaire', 'ao', 'metier', 'handicap', 'financement')),
  status TEXT DEFAULT 'new' CHECK(status IN ('new', 'processing', 'done', 'failed', 'sent')),
  summary TEXT,
  titre_reformule TEXT,
  impact_level TEXT CHECK(impact_level IN ('fort', 'moyen', 'faible')),
  impact_justification TEXT,
  impact_phrase TEXT,
  relevance_score INTEGER CHECK(relevance_score BETWEEN 1 AND 10),
  mots_cles TEXT,
  date_entree_vigueur DATE,
  -- Multi-secteur (A.4.a+) : colonnes generiques remplacant les 9 legacy
  taxonomy_indicators TEXT,
  taxonomy_justification TEXT,
  extra_meta TEXT,
  processed_at DATETIME,
  sent_in_newsletter_id INTEGER,
  is_read INTEGER DEFAULT 0,
  is_starred INTEGER DEFAULT 0,
  -- Pivot multi-personas (C.1) : routage par secteur (cipia/haccp/medical/avocats/experts-comptables)
  sector_id TEXT NOT NULL DEFAULT 'cipia'
);

CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source);
CREATE INDEX IF NOT EXISTS idx_articles_status on articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_category on articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_date DESC);
CREATE INDEX IF NOT EXISTS idx_articles_impact on articles(impact_level);
CREATE INDEX IF NOT EXISTS idx_articles_source_id ON articles(source_id);
CREATE INDEX IF NOT EXISTS idx_articles_sector_id ON articles(sector_id);

-- Newsletters(weekly editions)
CREATE TABLE IF NOT EXISTS newsletters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  edition_number INTEGER NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT,
  week_start DATE,
  week_end DATE,
  articles_reglementaire INTEGER DEFAULT 0,
  articles_ao INTEGER DEFAULT 0,
  articles_metier INTEGER DEFAULT 0,
  articles_handicap INTEGER DEFAULT 0,
  articles_total INTEGER DEFAULT 0,
  brevo_campaign_id TEXT,
  sent_at DATETIME,
  recipients_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft',
  open_rate REAL,
  click_rate REAL,
  unsubscribe_count INTEGER DEFAULT 0,
  bounce_count INTEGER DEFAULT 0,
  stats_fetched_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  archive_url TEXT,
  -- Pivot multi-personas (C.1)
  sector_id TEXT NOT NULL DEFAULT 'cipia',
  -- Pivot C.3 : numerotation independante par secteur
  UNIQUE(sector_id, edition_number)
);

CREATE INDEX IF NOT EXISTS idx_newsletters_edition ON newsletters(edition_number);
CREATE INDEX IF NOT EXISTS idx_newsletters_sent ON newsletters(sent_at);
CREATE INDEX IF NOT EXISTS idx_newsletters_status on newsletters(status);
CREATE INDEX IF NOT EXISTS idx_newsletters_sector_id ON newsletters(sector_id);

-- Subscribers(email subscribers)
CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  organisme TEXT,
  region TEXT,
  plan TEXT DEFAULT 'gratuit' CHECK(plan IN ('gratuit', 'solo', 'equipe', 'agence')),
  brevo_contact_id TEXT,
  subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  unsubscribed_at DATETIME,
  is_active INTEGER DEFAULT 1,
  -- Pivot multi-personas (C.1) : V1 = 1 subscriber = 1 secteur d'intérêt
  sector_id TEXT NOT NULL DEFAULT 'cipia'
);

CREATE INDEX IF NOT EXISTS idx_subscribers_email on subscribers(email);
CREATE INDEX IF NOT EXISTS idx_subscribers_active on subscribers(is_active);
CREATE INDEX IF NOT EXISTS idx_subscribers_sector_id on subscribers(sector_id);

-- Collection logs(automated collection tracking)
CREATE TABLE IF NOT EXISTS collection_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    finished_at TEXT,
    status TEXT NOT null check(status IN ('success', 'failed', 'partial')),
    articles_found INTEGER DEFAULT 0,
    articles_filtered INTEGER DEFAULT 0,
    articles_inserted INTEGER DEFAULT 0,
    articles_duplicate INTEGER DEFAULT 0,
    error_message TEXT,
    execution_time_seconds REAL
);

CREATE INDEX IF NOT EXISTS idx_collection_logs_source on collection_logs(source);
CREATE INDEX IF NOT EXISTS idx_collection_logs_status on collection_logs(status);
CREATE INDEX IF NOT EXISTS idx_collection_logs_started on collection_logs(started_at DESC);

-- Processing logs(AI pipeline tracking)
CREATE TABLE IF NOT exists processing_logs (
    id INTEGER PRIMARY KEY AUTOincrement,
    batch_id TEXT,
    started_at TEXT NOT null default (datetime('now')),
    finished_at TEXT,
    status TEXT not null check(status in ('success', 'failed', 'partial')),
    articles_submitted INTEGER DEFAULT 0,
    articles_processed INTEGER DEFAULT 0,
    articles_failed INTEGER DEFAULT 0,
    articles_non_pertinent INTEGER DEFAULT 0,
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    cost_usd REAL,
    error_message TEXT,
    execution_time_seconds REAL
);

CREATE INDEX IF NOT EXISTS idx_processing_logs_batch ON processing_logs(batch_id);
CREATE INDEX IF NOT EXISTS idx_processing_logs_status ON processing_logs(status);
CREATE INDEX IF NOT EXISTS idx_processing_logs_started ON processing_logs(started_at DESC);

-- Alert logs(monitoring alerts)
CREATE TABLE IF NOT EXISTS alert_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_type TEXT NOT NULL CHECK(alert_type IN ('zero_articles', 'api_error', 'send_error', 'quota_warning', 'system_error')),
    source TEXT NOT NULL,
    message TEXT NOT NULL,
    sent_at TEXT NOT NULL DEFAULT (datetime('now')),
    acknowledged INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_alert_logs_type ON alert_logs(alert_type);
CREATE INDEX IF NOT EXISTS idx_alert_logs_source ON alert_logs(source);
CREATE INDEX IF NOT EXISTS idx_alert_logs_sent ON alert_logs(sent_at DESC);

-- Logs table (legacy, kept for compatibility)
CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    level TEXT NOT NULL,
    module TEXT NOT NULL,
    message TEXT NOT null,
    details TEXT
);

-- Actions (plan d'action per article for Qualiopi audit)
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

CREATE INDEX IF NOT EXISTS idx_actions_article ON actions(article_id);
CREATE INDEX IF NOT EXISTS idx_actions_status ON actions(status);
CREATE INDEX IF NOT EXISTS idx_actions_priority ON actions(priority);
CREATE INDEX IF NOT EXISTS idx_actions_due ON actions(due_date);

-- User profiles (OF info for audit reports)
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

-- Blog articles (generated SEO content)
CREATE TABLE IF NOT EXISTS blog_articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  h1 TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  category TEXT NOT NULL,
  cluster TEXT NOT NULL,
  funnel TEXT NOT NULL CHECK(funnel IN ('TOFU', 'MOFU', 'BOFU')),
  keyword_main TEXT NOT NULL,
  keywords_secondary TEXT,
  content_html TEXT NOT NULL,
  meta_description TEXT NOT NULL,
  word_count INTEGER DEFAULT 0,
  read_time TEXT DEFAULT '10 min',
  internal_links TEXT,
  published_at DATE NOT NULL,
  status TEXT DEFAULT 'published' CHECK(status IN ('published', 'draft', 'failed')),
  verified_at DATETIME,
  verified_status_code INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_blog_published ON blog_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_slug ON blog_articles(slug);
CREATE INDEX IF NOT EXISTS idx_blog_status ON blog_articles(status);
"""

# ------------------------------------------------------------
# Helper functions
# ------------------------------------------------------------
def get_connection(db_path: str) -> sqlite3.Connection:
    """Return a SQLite connection with WAL mode and foreign keys enabled."""
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db(db_path: str) -> None:
    """Create all tables and indexes."""
    conn = get_connection(db_path)
    try:
        conn.executescript(SCHEMA_SQL)
        conn.commit()
    finally:
        conn.close()


def insert_article(conn: sqlite3.Connection, article: dict) -> bool:
    """Insert an article, ignoring duplicates (dedup by source_id).
    Returns True if the article was inserted, False if it already existed.
    """
    schema_columns = [
        "source", "source_id", "title", "url", "content", "published_date",
        "category", "status", "summary", "titre_reformule", "impact_level",
        "impact_justification", "impact_phrase",
        "relevance_score", "mots_cles", "date_entree_vigueur",
        "taxonomy_indicators", "taxonomy_justification", "extra_meta",
        "sector_id",
    ]
    present = {k: v for k, v in article.items() if k in schema_columns and v is not None}

    # Build extra_meta from any AO/sector fields present in the article dict
    # (e.g. acheteur, region, montant_estime, date_limite, cpv_code from BOAMP collector)
    if "extra_meta" not in present:
        present["extra_meta"] = build_extra_meta(article)

    cols = ", ".join(present.keys())
    placeholders = ", ".join(["?"] * len(present))
    sql = f"INSERT OR IGNORE INTO articles ({cols}) VALUES ({placeholders})"
    cursor = conn.execute(sql, list(present.values()))
    conn.commit()
    return cursor.rowcount > 0


def get_articles(
    conn: sqlite3.Connection,
    status: Optional[str] = None,
    source: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 50,
) -> list[dict]:
    """Retrieve articles with optional filters."""
    conditions = []
    params = []

    if status is not None:
        conditions.append("status = ?")
        params.append(status)
    if source is not None:
        conditions.append("source = ?")
        params.append(source)
    if category is not None:
        conditions.append("category = ?")
        params.append(category)

    where = ""
    if conditions:
        where = "WHERE " + " AND ".join(conditions)

    sql = f"SELECT * FROM articles {where} ORDER BY published_date DESC LIMIT ?"
    params.append(limit)

    rows = conn.execute(sql, params).fetchall()
    return [dict(row) for row in rows]


def get_articles_round_robin(
    conn: sqlite3.Connection,
    status: str,
    limit: int = 50,
) -> list[dict]:
    """Retrieve articles in round-robin fashion across sources.

    Avoids starvation when one high-volume source (e.g. JORF with 268 articles)
    monopolizes the limited LIMIT slots and leaves smaller sources unprocessed.

    Uses ROW_NUMBER() OVER (PARTITION BY source ORDER BY collected_at DESC,
    published_date DESC) so we pick the most recent article from each source
    first, then the second-most-recent from each, etc.
    """
    sql = """
        WITH ranked AS (
            SELECT
                *,
                ROW_NUMBER() OVER (
                    PARTITION BY source
                    ORDER BY collected_at DESC, published_date DESC
                ) AS rn
            FROM articles
            WHERE status = ?
        )
        SELECT * FROM ranked
        ORDER BY rn ASC, collected_at DESC, published_date DESC
        LIMIT ?
    """
    rows = conn.execute(sql, (status, limit)).fetchall()
    return [{k: v for k, v in dict(row).items() if k != "rn"} for row in rows]


def update_article_status(
    conn: sqlite3.Connection, article_id: int, status: str
) -> bool:
    """Update the status of an article. Returns True if a row was updated."""
    cursor = conn.execute(
        "UPDATE articles SET status = ? WHERE id = ?",
        (status, article_id),
    )
    conn.commit()
    return cursor.rowcount > 0


def get_stats(conn: sqlite3.Connection) -> dict:
    """Return a dictionary with counts by source, status, and category."""
    stats = {
        "total": 0,
        "by_source": {},
        "by_status": {},
        "by_category": {},
        "last_collected": None
    }

    row = conn.execute("SELECT COUNT(*) as cnt FROM articles").fetchone()
    stats["total"] = row["cnt"]

    for row in conn.execute(
        "SELECT source, COUNT(*) as cnt FROM articles GROUP BY source"
    ).fetchall():
        stats["by_source"][row["source"]] = row["cnt"]

    for row in conn.execute(
        "SELECT status, COUNT(*) as cnt FROM articles GROUP BY status"
    ).fetchall():
        stats["by_status"][row["status"]] = row["cnt"]

    for row in conn.execute(
        "SELECT category, COUNT(*) as cnt FROM articles GROUP BY category"
    ).fetchall():
        stats["by_category"][row["category"]] = row["cnt"]

    row = conn.execute(
        "SELECT MAX(collected_at) as last_dt FROM articles"
    ).fetchone()
    stats["last_collected"] = row["last_dt"]

    return stats


# ------------------------------------------------------------
# Logging functions
# ------------------------------------------------------------
def setup_logger(name: str = "veille"):
    """Configure logging for the application."""
    import sys
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    # Console handler (plain text)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(
        logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
    )
    logger.addHandler(console_handler)

    return logger
