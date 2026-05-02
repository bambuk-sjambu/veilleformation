"""Anthropic Batch API integration for Cipia.

Provides 50% cost reduction compared to synchronous API calls.
Handles batch creation, polling, and result retrieval.

Usage:
    batch_processor = BatchProcessor(api_key="...")
    batch_id = batch_processor.create_batch(articles)
    results = batch_processor.wait_for_results(batch_id)
"""

import json
import logging
import os
import time
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

import anthropic

from processors.prompts import build_user_prompt, get_system_prompt
from storage.database import get_connection

logger = logging.getLogger("veille.batch")

# Cost per token for Claude Haiku 4.5 Batch API (50% discount)
# Input: $0.50 / 1M tokens, Output: $2.50 / 1M tokens
COST_INPUT_PER_TOKEN_BATCH = 0.50 / 1_000_000
COST_OUTPUT_PER_TOKEN_BATCH = 2.50 / 1_000_000

# Batch API limits
MAX_REQUESTS_PER_BATCH = 10000
POLLING_INTERVAL_SECONDS = 60
MAX_POLLING_DURATION_MINUTES = 30


@dataclass
class BatchResult:
    """Result from processing a single article via batch API."""
    article_id: int
    custom_id: str
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None
    input_tokens: int = 0
    output_tokens: int = 0


@dataclass
class BatchStatus:
    """Status of a batch processing job."""
    batch_id: str
    status: str  # in_progress, completed, failed, expired
    created_at: datetime
    completed_at: Optional[datetime] = None
    request_counts: dict = None
    error: Optional[str] = None


class BatchProcessor:
    """Handles batch processing of articles through Claude Haiku 4.5."""

    def __init__(
        self,
        api_key: str = None,
        model: str = "claude-haiku-4-5-20251001",
        logger: logging.Logger = None,
    ):
        self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY")
        self.client = anthropic.Anthropic(api_key=self.api_key)
        self.model = model
        self.logger = logger or logging.getLogger("veille.batch")

        # Token tracking
        self.total_input_tokens = 0
        self.total_output_tokens = 0

    def _build_batch_request(self, article: dict, custom_id: str) -> dict:
        """Build a single request for the batch API."""
        system_prompt = get_system_prompt(article)
        user_prompt = build_user_prompt(article)

        return {
            "custom_id": custom_id,
            "params": {
                "model": self.model,
                "max_tokens": 1024,
                "system": system_prompt,
                "messages": [
                    {"role": "user", "content": user_prompt}
                ]
            }
        }

    def create_batch(self, articles: list[dict]) -> Optional[str]:
        """Create a batch processing job.

        Args:
            articles: List of article dicts with at least 'id' and content fields.

        Returns:
            Batch ID if successful, None otherwise.
        """
        if not articles:
            self.logger.warning("No articles to batch")
            return None

        if len(articles) > MAX_REQUESTS_PER_BATCH:
            self.logger.warning(
                f"Batch size {len(articles)} exceeds max {MAX_REQUESTS_PER_BATCH}, truncating"
            )
            articles = articles[:MAX_REQUESTS_PER_BATCH]

        # Build requests
        requests = []
        for article in articles:
            article_id = article.get("id")
            custom_id = f"article-{article_id}"
            try:
                request = self._build_batch_request(article, custom_id)
                requests.append(request)
            except Exception as e:
                self.logger.error(f"Failed to build request for article {article_id}: {e}")

        if not requests:
            self.logger.error("No valid requests to batch")
            return None

        # Create batch file
        batch_file_content = "\n".join(json.dumps(req) for req in requests)

        try:
            # Upload the batch file
            batch_file = self.client.files.upload(
                file=batch_file_content.encode("utf-8"),
                purpose="batch"
            )

            # Create the batch
            batch = self.client.batches.create(
                requests_file_id=batch_file.id,
                endpoint="/v1/messages",
            )

            self.logger.info(f"Created batch {batch.id} with {len(requests)} requests")
            return batch.id

        except anthropic.APIError as e:
            self.logger.error(f"Failed to create batch: {e}")
            return None

    def check_batch_status(self, batch_id: str) -> BatchStatus:
        """Check the status of a batch job.

        Args:
            batch_id: The batch ID to check.

        Returns:
            BatchStatus object with current status.
        """
        try:
            batch = self.client.batches.retrieve(batch_id)

            return BatchStatus(
                batch_id=batch.id,
                status=batch.status,
                created_at=datetime.fromisoformat(batch.created_at.replace("Z", "+00:00")),
                completed_at=datetime.fromisoformat(batch.completed_at.replace("Z", "+00:00")) if batch.completed_at else None,
                request_counts={
                    "total": batch.request_counts.total,
                    "completed": batch.request_counts.completed,
                    "failed": batch.request_counts.failed,
                    "expired": batch.request_counts.expired,
                } if batch.request_counts else None,
                error=batch.error_message if hasattr(batch, "error_message") else None,
            )

        except anthropic.APIError as e:
            self.logger.error(f"Failed to check batch status: {e}")
            return BatchStatus(
                batch_id=batch_id,
                status="failed",
                created_at=datetime.now(),
                error=str(e),
            )

    def wait_for_results(
        self,
        batch_id: str,
        timeout_minutes: int = MAX_POLLING_DURATION_MINUTES,
    ) -> list[BatchResult]:
        """Poll batch status until completion and retrieve results.

        Args:
            batch_id: The batch ID to wait for.
            timeout_minutes: Maximum time to wait in minutes.

        Returns:
            List of BatchResult objects.
        """
        start_time = time.time()
        timeout_seconds = timeout_minutes * 60

        self.logger.info(f"Waiting for batch {batch_id} (timeout: {timeout_minutes}min)")

        while True:
            status = self.check_batch_status(batch_id)
            elapsed = time.time() - start_time

            if status.status == "completed":
                self.logger.info(f"Batch {batch_id} completed in {elapsed:.0f}s")
                return self._retrieve_results(batch_id)

            if status.status == "failed":
                self.logger.error(f"Batch {batch_id} failed: {status.error}")
                return []

            if status.status == "expired":
                self.logger.error(f"Batch {batch_id} expired")
                return []

            if elapsed >= timeout_seconds:
                self.logger.error(f"Batch {batch_id} timed out after {timeout_minutes}min")
                return []

            self.logger.debug(
                f"Batch {batch_id} status: {status.status}, "
                f"completed: {status.request_counts.get('completed', 0) if status.request_counts else 0}/{status.request_counts.get('total', 0) if status.request_counts else 0}, "
                f"elapsed: {elapsed:.0f}s"
            )

            time.sleep(POLLING_INTERVAL_SECONDS)

    def _retrieve_results(self, batch_id: str) -> list[BatchResult]:
        """Retrieve and parse batch results.

        Args:
            batch_id: The completed batch ID.

        Returns:
            List of BatchResult objects.
        """
        results = []

        try:
            # Get the results file
            batch = self.client.batches.retrieve(batch_id)

            if not batch.results_file_id:
                self.logger.error(f"No results file for batch {batch_id}")
                return []

            # Download results
            results_content = self.client.files.download(batch.results_file_id)

            # Parse each line as JSON
            for line in results_content.decode("utf-8").strip().split("\n"):
                if not line:
                    continue

                try:
                    result_data = json.loads(line)
                    custom_id = result_data.get("custom_id", "")

                    # Extract article ID from custom_id
                    article_id = int(custom_id.replace("article-", ""))

                    # Check for errors
                    if result_data.get("error"):
                        results.append(BatchResult(
                            article_id=article_id,
                            custom_id=custom_id,
                            success=False,
                            error=result_data.get("error", {}).get("message", "Unknown error"),
                        ))
                        continue

                    # Parse successful response
                    response = result_data.get("result", {})
                    content = response.get("content", [{}])[0].get("text", "")

                    # Track tokens
                    usage = response.get("usage", {})
                    input_tokens = usage.get("input_tokens", 0)
                    output_tokens = usage.get("output_tokens", 0)
                    self.total_input_tokens += input_tokens
                    self.total_output_tokens += output_tokens

                    # Parse JSON response
                    try:
                        parsed_data = self._parse_json_response(content)
                        results.append(BatchResult(
                            article_id=article_id,
                            custom_id=custom_id,
                            success=True,
                            data=parsed_data,
                            input_tokens=input_tokens,
                            output_tokens=output_tokens,
                        ))
                    except ValueError as e:
                        results.append(BatchResult(
                            article_id=article_id,
                            custom_id=custom_id,
                            success=False,
                            error=f"JSON parse error: {e}",
                        ))

                except json.JSONDecodeError as e:
                    self.logger.error(f"Failed to parse result line: {e}")
                    continue

        except anthropic.APIError as e:
            self.logger.error(f"Failed to retrieve batch results: {e}")

        return results

    @staticmethod
    def _parse_json_response(text: str) -> dict:
        """Parse a JSON response from Claude, handling markdown code blocks."""
        import re

        cleaned = text.strip()

        # Remove markdown code blocks if present
        match = re.match(r"```(?:json)?\s*\n?(.*?)\n?\s*```", cleaned, re.DOTALL)
        if match:
            cleaned = match.group(1).strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON response: {e}") from e

    def estimated_cost(self) -> float:
        """Estimate the total cost in EUR based on tracked token usage."""
        cost_usd = (
            self.total_input_tokens * COST_INPUT_PER_TOKEN_BATCH
            + self.total_output_tokens * COST_OUTPUT_PER_TOKEN_BATCH
        )
        # Approximate EUR conversion
        return round(cost_usd * 0.92, 4)


def run_batch_pipeline(
    articles: list[dict],
    db_path: str,
    api_key: str = None,
    logger: logging.Logger = None,
) -> dict:
    """Run the full batch pipeline: create batch, wait, store results.

    Args:
        articles: List of article dicts to process.
        db_path: Path to SQLite database.
        api_key: Anthropic API key (optional, uses env var if not provided).
        logger: Logger instance.

    Returns:
        Dict with stats: {total, processed, failed, cost_eur, duration_seconds}
    """
    import sqlite3
    from storage.database import get_connection

    logger = logger or logging.getLogger("veille.batch")
    start_time = time.time()

    if not articles:
        return {
            "total": 0,
            "processed": 0,
            "failed": 0,
            "input_tokens": 0,
            "output_tokens": 0,
            "cost_eur": 0.0,
            "duration_seconds": 0.0,
        }

    processor = BatchProcessor(api_key=api_key, logger=logger)

    # Create batch
    batch_id = processor.create_batch(articles)
    if not batch_id:
        logger.error("Failed to create batch")
        return {
            "total": len(articles),
            "processed": 0,
            "failed": len(articles),
            "input_tokens": 0,
            "output_tokens": 0,
            "cost_eur": 0.0,
            "duration_seconds": time.time() - start_time,
        }

    # Wait for results
    results = processor.wait_for_results(batch_id)

    # Store results in database
    conn = get_connection(db_path)
    try:
        processed = 0
        failed = 0

        for result in results:
            if result.success and result.data:
                try:
                    # Update article with AI results
                    taxonomy_indicators_json = json.dumps(
                        result.data.get("qualiopi_indicators", []), ensure_ascii=False
                    )
                    taxonomy_justification = result.data.get("qualiopi_justification")

                    # Merge existing extra_meta with AI-added fields
                    row = conn.execute(
                        "SELECT extra_meta FROM articles WHERE id = ?",
                        (result.article_id,),
                    ).fetchone()
                    existing_meta = json.loads((row["extra_meta"] if row else None) or "{}")
                    if result.data.get("theme_formation") is not None:
                        existing_meta["theme_formation"] = result.data.get("theme_formation")
                    if result.data.get("typologie_ao") is not None:
                        existing_meta["typologie_ao"] = result.data.get("typologie_ao")
                    extra_meta_json = json.dumps(
                        {k: v for k, v in existing_meta.items() if v is not None},
                        ensure_ascii=False, default=str
                    )

                    conn.execute(
                        """UPDATE articles SET
                            summary = ?,
                            impact_level = ?,
                            impact_justification = ?,
                            taxonomy_indicators = ?,
                            taxonomy_justification = ?,
                            extra_meta = ?,
                            relevance_score = ?,
                            category = ?,
                            status = 'done',
                            processed_at = ?
                        WHERE id = ?""",
                        (
                            result.data.get("resume") or result.data.get("summary"),
                            result.data.get("impact_level"),
                            result.data.get("impact_phrase") or result.data.get("impact_justification"),
                            taxonomy_indicators_json,
                            taxonomy_justification,
                            extra_meta_json,
                            int(result.data.get("relevance_score", 5)),
                            result.data.get("category", "reglementaire"),
                            datetime.now().isoformat(),
                            result.article_id,
                        ),
                    )
                    processed += 1
                except Exception as e:
                    logger.error(f"Failed to store result for article {result.article_id}: {e}")
                    failed += 1
            else:
                # Mark as failed
                conn.execute(
                    "UPDATE articles SET status = 'failed' WHERE id = ?",
                    (result.article_id,),
                )
                failed += 1

        conn.commit()
    finally:
        conn.close()

    duration = time.time() - start_time
    cost = processor.estimated_cost()

    logger.info(
        f"Batch pipeline complete: {processed}/{len(articles)} processed, "
        f"{failed} failed, {duration:.1f}s, {cost:.4f} EUR"
    )

    return {
        "total": len(articles),
        "processed": processed,
        "failed": failed,
        "input_tokens": processor.total_input_tokens,
        "output_tokens": processor.total_output_tokens,
        "cost_eur": cost,
        "duration_seconds": round(duration, 1),
        "batch_id": batch_id,
    }
