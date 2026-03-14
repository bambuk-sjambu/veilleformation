"""Base collector class for VeilleFormation.fr."""

import logging
from datetime import datetime

from storage.database import get_connection, insert_article


class BaseCollector:
    """Abstract base class for all data collectors.

    Subclasses must implement the `collect` method to fetch articles
    from their respective sources.
    """

    SOURCE_NAME: str = "unknown"

    def __init__(self, db_path: str, logger: logging.Logger = None):
        self.db_path = db_path
        self.logger = logger or logging.getLogger(self.__class__.__name__)

    def collect(self) -> list[dict]:
        """Fetch articles from the source. Override in subclass.

        Returns:
            List of article dicts ready for database insertion.
        """
        raise NotImplementedError(
            f"{self.__class__.__name__} must implement collect()"
        )

    def save(self, articles: list[dict]) -> int:
        """Save articles to the database.

        Args:
            articles: List of article dicts.

        Returns:
            Count of newly inserted articles (duplicates are skipped).
        """
        if not articles:
            return 0

        conn = get_connection(self.db_path)
        inserted = 0
        try:
            for article in articles:
                if insert_article(conn, article):
                    inserted += 1
        finally:
            conn.close()

        return inserted

    def run(self) -> dict:
        """Execute the full collect-and-save pipeline.

        Returns:
            Dict with collection stats: source, collected, inserted, errors, duration.
        """
        start = datetime.now()
        errors = []

        self.logger.info(f"Demarrage collecte {self.SOURCE_NAME}")

        try:
            articles = self.collect()
        except Exception as e:
            self.logger.error(f"Erreur collecte {self.SOURCE_NAME}: {e}")
            articles = []
            errors.append(str(e))

        inserted = 0
        if articles:
            try:
                inserted = self.save(articles)
            except Exception as e:
                self.logger.error(f"Erreur sauvegarde {self.SOURCE_NAME}: {e}")
                errors.append(str(e))

        duration = (datetime.now() - start).total_seconds()

        stats = {
            "source": self.SOURCE_NAME,
            "collected": len(articles),
            "inserted": inserted,
            "duplicates": len(articles) - inserted,
            "errors": errors,
            "duration_seconds": round(duration, 2),
        }

        self.logger.info(
            f"Collecte {self.SOURCE_NAME} terminee: "
            f"{inserted} nouveaux / {len(articles)} collectes "
            f"({duration:.1f}s)"
        )

        return stats
