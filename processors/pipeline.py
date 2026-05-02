"""Main AI processing pipeline for Cipia.

Processes collected articles through Claude to generate summaries,
impact assessments, and Qualiopi indicator classifications.
"""

import json
import logging
import os
import re
import time
from datetime import datetime

import anthropic

from processors.prompts import build_user_prompt, get_system_prompt
from storage.database import (
    get_connection,
    get_articles,
    get_articles_round_robin,
    update_article_status,
)

# Cost per token for Claude Haiku 4.5 (as of 2025)
# Input: $1.00 / 1M tokens, Output: $5.00 / 1M tokens
COST_INPUT_PER_TOKEN = 1.00 / 1_000_000
COST_OUTPUT_PER_TOKEN = 5.00 / 1_000_000

# Required fields in the AI response
REQUIRED_FIELDS_BASE = [
    "summary",
    "impact_level",
    "impact_justification",
    "qualiopi_indicators",
    "qualiopi_justification",
    "relevance_score",
    "category",
]

REQUIRED_FIELDS_AO = REQUIRED_FIELDS_BASE + ["typologie_ao"]


class AIProcessor:
    """Processes articles through Claude AI for analysis and classification."""

    def __init__(
        self,
        db_path: str,
        api_key: str = None,
        model: str = "claude-haiku-4-5-20251001",
        logger: logging.Logger = None,
    ):
        self.db_path = db_path
        self.client = anthropic.Anthropic(
            api_key=api_key or os.environ.get("ANTHROPIC_API_KEY")
        )
        self.model = model
        self.logger = logger or logging.getLogger("veille.processor")
        self.max_tokens = 1024
        self.batch_size = 20
        self.rate_limit_delay = 0.5  # seconds between API calls

        # Tracking
        self.total_input_tokens = 0
        self.total_output_tokens = 0

    def get_pending_articles(self, limit: int = 50) -> list[dict]:
        """Fetch pending articles in round-robin fashion across sources.

        Without round-robin, a single high-volume source (JORF with 268 articles
        per cron) would monopolize the LIMIT slots and starve smaller sources
        like Centre Inffo (56 articles, older published_date).

        Args:
            limit: Maximum number of articles to fetch.

        Returns:
            List of article dicts.
        """
        conn = get_connection(self.db_path)
        try:
            return get_articles_round_robin(conn, status="new", limit=limit)
        finally:
            conn.close()

    def get_failed_articles(self, limit: int = 50) -> list[dict]:
        """Fetch articles with status='failed' for retry.

        Args:
            limit: Maximum number of articles to fetch.

        Returns:
            List of article dicts.
        """
        conn = get_connection(self.db_path)
        try:
            return get_articles(conn, status="failed", limit=limit)
        finally:
            conn.close()

    @staticmethod
    def parse_json_response(text: str) -> dict:
        """Parse a JSON response from Claude, handling markdown code blocks.

        Args:
            text: Raw text response from Claude.

        Returns:
            Parsed dict.

        Raises:
            ValueError: If the text cannot be parsed as JSON.
        """
        cleaned = text.strip()

        # Remove markdown code blocks if present
        match = re.match(r"```(?:json)?\s*\n?(.*?)\n?\s*```", cleaned, re.DOTALL)
        if match:
            cleaned = match.group(1).strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON response: {e}") from e

    @staticmethod
    def validate_response(data: dict, is_ao: bool = False) -> bool:
        """Validate that the AI response contains all required fields.

        Args:
            data: Parsed JSON response dict.
            is_ao: Whether this is an AO article (requires extra fields).

        Returns:
            True if valid.

        Raises:
            ValueError: If required fields are missing.
        """
        required = REQUIRED_FIELDS_AO if is_ao else REQUIRED_FIELDS_BASE
        missing = [f for f in required if f not in data]
        if missing:
            raise ValueError(f"Missing required fields: {', '.join(missing)}")

        # Validate impact_level
        if data["impact_level"] not in ("fort", "moyen", "faible"):
            raise ValueError(
                f"Invalid impact_level: {data['impact_level']}. "
                "Must be 'fort', 'moyen', or 'faible'."
            )

        # Validate relevance_score
        score = data["relevance_score"]
        if not isinstance(score, (int, float)) or not (1 <= score <= 10):
            raise ValueError(
                f"Invalid relevance_score: {score}. Must be between 1 and 10."
            )

        return True

    def process_article(self, article: dict) -> dict:
        """Process a single article through Claude AI.

        Steps:
        1. Set status to 'processing'
        2. Build prompts
        3. Call Claude API
        4. Parse and validate response
        5. Update article in DB with AI results

        Args:
            article: Article dict from the database.

        Returns:
            Dict with processing result: {success, article_id, impact_level,
            relevance_score, error, input_tokens, output_tokens}.
        """
        article_id = article["id"]
        conn = get_connection(self.db_path)

        try:
            # Step 1: Set status to processing
            update_article_status(conn, article_id, "processing")

            # Step 2: Build prompts
            system_prompt = get_system_prompt(article)
            user_prompt = build_user_prompt(article)

            # Step 3: Call Claude API
            response = self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )

            # Track tokens
            input_tokens = response.usage.input_tokens
            output_tokens = response.usage.output_tokens
            self.total_input_tokens += input_tokens
            self.total_output_tokens += output_tokens

            # Step 4: Parse and validate
            raw_text = response.content[0].text
            self.logger.debug(f"Reponse brute IA pour article {article_id}: {raw_text[:500]}...")
            try:
                data = self.parse_json_response(raw_text)
            except ValueError as parse_error:
                self.logger.error(f"Erreur parsing JSON: {parse_error}")
                self.logger.error(f"Texte complet: {raw_text}")
                raise

            is_ao = article.get("source") == "boamp" or article.get("category") == "ao"
            self.validate_response(data, is_ao=is_ao)

            # Step 5: Update article in DB
            taxonomy_indicators_json = json.dumps(
                data["qualiopi_indicators"], ensure_ascii=False
            )

            mots_cles_raw = data.get("mots_cles")
            mots_cles = (
                json.dumps(mots_cles_raw, ensure_ascii=False)
                if isinstance(mots_cles_raw, list)
                else None
            )

            # Merge existing extra_meta (collector fields: cpv_code, acheteur,
            # region, montant_estime, date_limite) with AI-added fields.
            existing_meta = json.loads(article.get("extra_meta") or "{}")
            if data.get("theme_formation") is not None:
                existing_meta["theme_formation"] = data.get("theme_formation")
            if data.get("typologie_ao") is not None:
                existing_meta["typologie_ao"] = data.get("typologie_ao")
            extra_meta_json = json.dumps(
                {k: v for k, v in existing_meta.items() if v is not None},
                ensure_ascii=False, default=str
            )

            update_sql = """
                UPDATE articles SET
                    summary = ?,
                    titre_reformule = ?,
                    impact_level = ?,
                    impact_justification = ?,
                    taxonomy_indicators = ?,
                    taxonomy_justification = ?,
                    relevance_score = ?,
                    category = ?,
                    mots_cles = ?,
                    date_entree_vigueur = ?,
                    extra_meta = ?,
                    status = 'done',
                    processed_at = ?
                WHERE id = ?
            """
            conn.execute(
                update_sql,
                (
                    data["summary"],
                    data.get("titre_reformule"),
                    data["impact_level"],
                    data["impact_justification"],
                    taxonomy_indicators_json,
                    data["qualiopi_justification"],
                    int(data["relevance_score"]),
                    data["category"],
                    mots_cles,
                    data.get("date_entree_vigueur"),
                    extra_meta_json,
                    datetime.now().isoformat(),
                    article_id,
                ),
            )
            conn.commit()

            self.logger.info(
                f"Article {article_id} traite: impact={data['impact_level']}, "
                f"score={data['relevance_score']}/10"
            )

            return {
                "success": True,
                "article_id": article_id,
                "impact_level": data["impact_level"],
                "relevance_score": int(data["relevance_score"]),
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "error": None,
            }

        except Exception as e:
            # On error: set status to failed, log
            self.logger.error(f"Erreur traitement article {article_id}: {e}")
            try:
                update_article_status(conn, article_id, "failed")
            except Exception:
                pass

            return {
                "success": False,
                "article_id": article_id,
                "impact_level": None,
                "relevance_score": None,
                "input_tokens": 0,
                "output_tokens": 0,
                "error": str(e),
            }

        finally:
            conn.close()

    def process_batch(self, articles: list[dict]) -> list[dict]:
        """Process a list of articles sequentially with rate limiting.

        Args:
            articles: List of article dicts.

        Returns:
            List of result dicts from process_article.
        """
        results = []
        for i, article in enumerate(articles):
            result = self.process_article(article)
            results.append(result)

            # Rate limiting between calls
            if i < len(articles) - 1:
                time.sleep(self.rate_limit_delay)

        return results

    def estimated_cost(self) -> float:
        """Estimate the total cost in EUR based on tracked token usage.

        Returns:
            Estimated cost in EUR (approximate, using USD rates).
        """
        cost_usd = (
            self.total_input_tokens * COST_INPUT_PER_TOKEN
            + self.total_output_tokens * COST_OUTPUT_PER_TOKEN
        )
        # Approximate EUR conversion
        return round(cost_usd * 0.92, 4)

    def run(self, limit: int = 50) -> dict:
        """Main entry point: fetch pending articles and process them.

        Args:
            limit: Maximum number of articles to process.

        Returns:
            Dict with stats: {total, processed, failed, input_tokens,
            output_tokens, cost_eur, duration_seconds, results}.
        """
        start_time = time.time()

        # Reset token tracking
        self.total_input_tokens = 0
        self.total_output_tokens = 0

        articles = self.get_pending_articles(limit=limit)
        total = len(articles)

        if total == 0:
            self.logger.info("Aucun article a traiter")
            return {
                "total": 0,
                "processed": 0,
                "failed": 0,
                "input_tokens": 0,
                "output_tokens": 0,
                "cost_eur": 0.0,
                "duration_seconds": 0.0,
                "results": [],
            }

        self.logger.info(f"Traitement de {total} articles avec {self.model}")

        # Process in batches
        all_results = []
        for batch_start in range(0, total, self.batch_size):
            batch = articles[batch_start : batch_start + self.batch_size]
            results = self.process_batch(batch)
            all_results.extend(results)

        duration = round(time.time() - start_time, 1)
        processed = sum(1 for r in all_results if r["success"])
        failed = sum(1 for r in all_results if not r["success"])

        self.logger.info(
            f"Traitement termine: {processed}/{total} OK, "
            f"{failed} erreurs, {duration}s"
        )

        return {
            "total": total,
            "processed": processed,
            "failed": failed,
            "input_tokens": self.total_input_tokens,
            "output_tokens": self.total_output_tokens,
            "cost_eur": self.estimated_cost(),
            "duration_seconds": duration,
            "results": all_results,
        }

    def retry_failed(self, limit: int = 50) -> dict:
        """Reprocess articles with status='failed'.

        Resets their status to 'new' first, then processes them.

        Args:
            limit: Maximum number of articles to retry.

        Returns:
            Same stats dict as run().
        """
        conn = get_connection(self.db_path)
        try:
            failed_articles = get_articles(conn, status="failed", limit=limit)

            if not failed_articles:
                self.logger.info("Aucun article en erreur a retraiter")
                return {
                    "total": 0,
                    "processed": 0,
                    "failed": 0,
                    "input_tokens": 0,
                    "output_tokens": 0,
                    "cost_eur": 0.0,
                    "duration_seconds": 0.0,
                    "results": [],
                }

            # Reset status to 'new' so they get picked up
            for article in failed_articles:
                update_article_status(conn, article["id"], "new")
        finally:
            conn.close()

        self.logger.info(
            f"Relance de {len(failed_articles)} articles en erreur"
        )
        return self.run(limit=limit)
