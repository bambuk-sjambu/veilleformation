#!/usr/bin/env python3
"""
Cipia - Generateur d'articles de blog autonome
Lit la file editoriale, genere 5 articles via Claude et les enregistre en SQLite.

Usage: python scripts/generate_blog.py
"""

import json
import logging
import os
import sqlite3
import sys
from datetime import date
from pathlib import Path
from typing import Optional

from openai import OpenAI

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
DB_PATH = PROJECT_ROOT / "data" / "veille.db"
QUEUE_PATH = SCRIPT_DIR / "editorial_queue.json"
LOG_DIR = PROJECT_ROOT / "logs"

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
LOG_DIR.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger("generate_blog")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
ARTICLES_PER_RUN = 5
MODEL = "gpt-4o-mini"

# gpt-4o-mini pricing
INPUT_TOKEN_PRICE_PER_M = 0.15   # USD
OUTPUT_TOKEN_PRICE_PER_M = 0.60  # USD
USD_TO_EUR = 0.92


# ---------------------------------------------------------------------------
# CTA blocks by funnel stage
# ---------------------------------------------------------------------------
CTA_BLOCKS = {
    "TOFU": """
<div class="cta-block bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
  <h3 class="text-lg font-bold text-blue-900 mb-2">Recevez la veille réglementaire chaque semaine</h3>
  <p class="text-blue-800 mb-4">Chaque mardi matin, notre newsletter résume les textes publiés au Journal officiel, les appels à projets OPCO et les évolutions Qualiopi. Gratuit, sans engagement.</p>
  <a href="/inscription" class="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition">S'inscrire gratuitement</a>
</div>
""",
    "MOFU": """
<div class="cta-block bg-green-50 border border-green-200 rounded-lg p-6 mt-8">
  <h3 class="text-lg font-bold text-green-900 mb-2">Voir Cipia en action</h3>
  <p class="text-green-800 mb-4">Découvrez comment notre dashboard automatise votre veille réglementaire, classe les textes par indicateur Qualiopi et génère vos preuves pour l'audit. Démonstration gratuite, sans carte bancaire.</p>
  <a href="/inscription" class="inline-block bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition">Démarrer l'essai gratuit</a>
</div>
""",
    "BOFU": """
<div class="cta-block bg-orange-50 border border-orange-200 rounded-lg p-6 mt-8">
  <h3 class="text-lg font-bold text-orange-900 mb-2">Essayez Cipia gratuitement</h3>
  <p class="text-orange-800 mb-4">14 jours d'accès complet au plan Solo : veille automatisée, alertes personnalisées, export PDF Qualiopi. Aucune carte bancaire requise. Résiliable en un clic.</p>
  <a href="/inscription" class="inline-block bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 transition">Commencer l'essai gratuit</a>
</div>
""",
}


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------
def get_db_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def ensure_blog_table(conn: sqlite3.Connection) -> None:
    """Create blog_articles table if it doesn't exist yet."""
    conn.executescript("""
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
    """)
    conn.commit()


def insert_blog_article(conn: sqlite3.Connection, article: dict) -> bool:
    """Insert a blog article. Returns True on success, False if slug already exists."""
    sql = """
        INSERT OR IGNORE INTO blog_articles
          (slug, title, h1, excerpt, category, cluster, funnel,
           keyword_main, keywords_secondary, content_html, meta_description,
           word_count, read_time, internal_links, published_at, status)
        VALUES
          (:slug, :title, :h1, :excerpt, :category, :cluster, :funnel,
           :keyword_main, :keywords_secondary, :content_html, :meta_description,
           :word_count, :read_time, :internal_links, :published_at, :status)
    """
    cursor = conn.execute(sql, article)
    conn.commit()
    return cursor.rowcount > 0


def slug_exists(conn: sqlite3.Connection, slug: str) -> bool:
    row = conn.execute(
        "SELECT 1 FROM blog_articles WHERE slug = ?", (slug,)
    ).fetchone()
    return row is not None


# ---------------------------------------------------------------------------
# Queue helpers
# ---------------------------------------------------------------------------
def load_queue() -> list[dict]:
    with open(QUEUE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def save_queue(queue: list[dict]) -> None:
    with open(QUEUE_PATH, "w", encoding="utf-8") as f:
        json.dump(queue, f, ensure_ascii=False, indent=2)


def get_pending_articles(queue: list[dict], limit: int = 5) -> list[dict]:
    """Return up to `limit` articles where generated is False."""
    return [a for a in queue if a.get("generated") is False][:limit]


# ---------------------------------------------------------------------------
# Claude prompt builder
# ---------------------------------------------------------------------------
def build_prompt(article: dict) -> str:
    plan_items = "\n".join(f"- {item}" for item in article["plan"])
    keywords_secondary = ", ".join(article.get("keywords_secondary", []))
    internal_targets = article.get("internal_links_targets", [])
    internal_links_str = "\n".join(
        f"- <a href=\"/blog/{slug}\">[texte anchor pertinent]</a>"
        for slug in internal_targets
    )
    cta_funnel = article.get("cta", article.get("funnel", "TOFU"))
    cta_block = CTA_BLOCKS.get(cta_funnel, CTA_BLOCKS["TOFU"])

    return f"""Tu es Sophie Marchand (ou Marc Dubois selon le sujet), experte en formation professionnelle et certification Qualiopi, rédactrice SEO senior pour Cipia.

Ton article sera publié sur un blog spécialisé lu par des responsables de formation, directeurs d'OF et auditeurs Qualiopi.

## Paramètres
- Mot-clé principal : {article['keyword_main']}
- Mots-clés secondaires : {keywords_secondary}
- Titre suggéré : {article['title_suggestion']}
- Catégorie : {article['category']}
- Nombre de mots cible : {article['word_count_target']} mots minimum (OBLIGATOIRE)
- Tonalité : "vous" (vouvoiement), expert praticien, données concrètes

## Plan imposé (respecte cet ordre)
{plan_items}

## Liens internes (intègre 3-5 naturellement dans le texte)
{internal_links_str}

## RÈGLES DE RÉDACTION ABSOLUES — E-E-A-T + SEO 2026

### Structure HTML obligatoire
1. **Introduction** : commence OBLIGATOIREMENT par une donnée chiffrée précise ou une affirmation tranchée. Ex: "73% des organismes de formation échouent l'indicateur 23 lors du premier audit..." — JAMAIS "Dans le paysage", "Il est important de noter que", "À l'ère du numérique"
2. **H2** : toujours formulés comme des questions ("Comment ?", "Pourquoi ?", "Quelles sont ?")
3. **H3** : sous-points avec listes à puces ou exemples concrets
4. **Paragraphes** : 3 phrases maximum, texte aéré
5. **Termes clés** en <strong>, exemples pratiques dans chaque section

### Marqueurs E-E-A-T obligatoires (experience vécue)
- Citer des exemples concrets d'organismes (types d'OF, taille, secteur)
- Mentionner des sources officielles réelles (JORF, France Compétences, noms d'OPCO)
- Utiliser des références précises (numéros d'indicateurs, articles du Code du travail)
- Ajouter des chiffres issus de l'expérience : "Parmi les 80+ OF que nous accompagnons..."

### Section FAQ obligatoire
- Utilise les balises <details> et <summary> pour l'accordion
- 3 à 5 questions réelles de responsables de formation
- Format : <h2>FAQ</h2> suivi de <details><summary>Question ?</summary><p>Réponse détaillée...</p></details>

### Erreurs INTERDITES
- Intro bateau (voir ci-dessus)
- Plan Wikipedia (Définition → Avantages → Conclusion) — plan action/problème/solution uniquement
- Bourrage mots-clés — max 3x le mot-clé exact, champ lexical développé
- Murs de texte (paragraphes > 3 phrases)

## CTA de fin (à insérer tel quel avant </article>)
{cta_block}

## FORMAT DE RÉPONSE
Réponds UNIQUEMENT avec un objet JSON valide (pas de markdown, pas de backticks) :
{{
  "title": "titre final 50-60 caractères avec mot-clé",
  "h1": "même que title",
  "meta_description": "150-160 caractères avec mot-clé principal",
  "excerpt": "2-3 phrases percutantes qui résument l'article et donnent envie de lire",
  "content_html": "<article>contenu HTML complet</article>",
  "word_count": nombre_entier,
  "read_time": "X min"
}}

Le content_html doit contenir dans l'ordre :
- <h1> avec titre
- <p> introduction (donnée chiffrée)
- <h2> sections en questions
  - <h3> sous-points avec <ul>/<ol> et <strong>
- <h2>FAQ</h2> avec <details><summary>...</summary><p>...</p></details>
- CTA block (fourni ci-dessus)
"""


# ---------------------------------------------------------------------------
# Article generation
# ---------------------------------------------------------------------------
def count_words(html: str) -> int:
    """Approximate word count from HTML by stripping tags."""
    import re
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"\s+", " ", text).strip()
    return len(text.split())


def estimate_read_time(word_count: int) -> str:
    """Estimate reading time at 200 words per minute (French average)."""
    minutes = max(1, round(word_count / 200))
    return f"{minutes} min"


def generate_article(client: OpenAI, article: dict) -> Optional[dict]:
    """Call OpenAI API and return parsed article data, or None on failure."""
    logger.info("Generating: %s", article["slug"])
    prompt = build_prompt(article)

    try:
        response = client.chat.completions.create(
            model=MODEL,
            max_tokens=8192,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        raw_text = response.choices[0].message.content.strip()

        # Strip markdown code fences if present
        if raw_text.startswith("```"):
            lines = raw_text.split("\n")
            raw_text = "\n".join(lines[1:-1]) if lines[-1] == "```" else "\n".join(lines[1:])

        try:
            data = json.loads(raw_text)
        except json.JSONDecodeError:
            import re
            match = re.search(r"\{.*\}", raw_text, re.DOTALL)
            if match:
                data = json.loads(match.group())
            else:
                raise ValueError("No valid JSON found in GPT response")

        # Validate required fields
        required = ["title", "h1", "meta_description", "excerpt", "content_html"]
        for field in required:
            if field not in data:
                raise ValueError(f"Missing required field: {field}")

        # Compute/fix word count and read time
        word_count = data.get("word_count") or count_words(data["content_html"])
        read_time = data.get("read_time") or estimate_read_time(word_count)

        if isinstance(read_time, int):
            read_time = f"{read_time} min"

        input_tokens = response.usage.prompt_tokens
        output_tokens = response.usage.completion_tokens
        cost_usd = (
            input_tokens * INPUT_TOKEN_PRICE_PER_M / 1_000_000
            + output_tokens * OUTPUT_TOKEN_PRICE_PER_M / 1_000_000
        )

        logger.info(
            "Generated '%s': %d words, %s read, %.4f USD",
            article["slug"], word_count, read_time, cost_usd,
        )

        return {
            "title": data["title"],
            "h1": data["h1"],
            "meta_description": data["meta_description"][:160],
            "excerpt": data["excerpt"],
            "content_html": data["content_html"],
            "word_count": word_count,
            "read_time": read_time,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cost_usd": cost_usd,
        }

    except Exception as exc:
        logger.error("GPT API error for '%s': %s", article["slug"], exc)
        return None


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> dict:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        logger.error("OPENAI_API_KEY environment variable not set")
        sys.exit(1)

    client = OpenAI(api_key=api_key)
    queue = load_queue()
    pending = get_pending_articles(queue, limit=ARTICLES_PER_RUN)

    if not pending:
        logger.info("No pending articles in queue. Nothing to generate.")
        return {
            "generated": [],
            "failed": [],
            "total_cost_usd": 0.0,
            "total_cost_eur": 0.0,
        }

    logger.info("Found %d pending articles to generate.", len(pending))

    conn = get_db_connection()
    ensure_blog_table(conn)

    today = date.today().isoformat()
    generated_articles = []
    failed_articles = []
    total_cost_usd = 0.0

    # Map queue by slug for quick updates
    queue_by_id = {item["slug"]: item for item in queue}

    for article_spec in pending:
        slug = article_spec["slug"]

        # Skip if already in DB (idempotency)
        if slug_exists(conn, slug):
            logger.info("Slug '%s' already in DB, skipping.", slug)
            queue_by_id[article_spec["slug"]]["generated"] = True
            continue

        result = generate_article(client, article_spec)

        if result is None:
            logger.error("Generation failed for '%s'", slug)
            queue_by_id[article_spec["slug"]]["generated"] = "failed"
            failed_articles.append({"slug": slug, "title": article_spec["title_suggestion"]})
            continue

        # Build DB row
        db_row = {
            "slug": slug,
            "title": result["title"],
            "h1": result["h1"],
            "excerpt": result["excerpt"],
            "category": article_spec["category"],
            "cluster": article_spec["cluster"],
            "funnel": article_spec["funnel"],
            "keyword_main": article_spec["keyword_main"],
            "keywords_secondary": json.dumps(article_spec.get("keywords_secondary", []), ensure_ascii=False),
            "content_html": result["content_html"],
            "meta_description": result["meta_description"],
            "word_count": result["word_count"],
            "read_time": result["read_time"],
            "internal_links": json.dumps(article_spec.get("internal_links_targets", []), ensure_ascii=False),
            "published_at": today,
            "status": "published",
        }

        success = insert_blog_article(conn, db_row)
        if success:
            total_cost_usd += result["cost_usd"]
            queue_by_id[article_spec["slug"]]["generated"] = True
            queue_by_id[article_spec["slug"]]["generated_at"] = today

            generated_articles.append({
                "slug": slug,
                "title": result["title"],
                "word_count": result["word_count"],
                "read_time": result["read_time"],
                "funnel": article_spec["funnel"],
                "cluster": article_spec["cluster"],
                "category": article_spec["category"],
                "cost_usd": result["cost_usd"],
            })
            logger.info("Saved to DB: %s", slug)
        else:
            logger.warning("Duplicate slug in DB (race condition?): %s", slug)

    conn.close()

    # Persist updated queue
    save_queue(list(queue_by_id.values()))

    total_cost_eur = total_cost_usd * USD_TO_EUR

    # Count total published articles
    conn2 = get_db_connection()
    total_row = conn2.execute(
        "SELECT COUNT(*) as cnt FROM blog_articles WHERE status = 'published'"
    ).fetchone()
    total_published = total_row[0] if total_row else 0
    conn2.close()

    summary = {
        "generated": generated_articles,
        "failed": failed_articles,
        "total_cost_usd": round(total_cost_usd, 4),
        "total_cost_eur": round(total_cost_eur, 4),
        "total_published_in_db": total_published,
        "date": today,
    }

    logger.info(
        "Done. Generated: %d, Failed: %d, Cost: %.4f EUR",
        len(generated_articles),
        len(failed_articles),
        total_cost_eur,
    )

    # Write summary to stdout as JSON for the orchestrator
    print("\n--- BLOG_SUMMARY_JSON ---")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print("--- END_BLOG_SUMMARY_JSON ---")

    return summary


if __name__ == "__main__":
    main()
