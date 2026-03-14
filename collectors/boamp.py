"""BOAMP (Bulletin Officiel des Annonces de Marches Publics) collector.

Uses the BOAMP open data API via OpenDataSoft (PAPS).
Filters for CPV 80500000 (formation professionnelle) and related keywords.
"""

import re
from datetime import datetime, timedelta
from typing import Optional

import requests

from collectors.base import BaseCollector


# BOAMP OpenDataSoft API endpoint
API_URL = "https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records"

# Keywords to match in title or description
KEYWORDS = [
    "formation professionnelle",
    "organisme de formation",
    "prestation de formation",
    "action de formation",
    "bilan de compétences",
    "bilan de competences",
    "VAE",
    "validation des acquis",
    "apprentissage",
    "alternance",
    "CFA",
    "OPCO",
    "insertion professionnelle",
    "reconversion",
    "compte personnel de formation",
]

# Terms that indicate irrelevant results
EXCLUSION_TERMS = [
    "travaux",
    "fournitures",
    "nettoyage",
    "restauration collective",
    "transport scolaire",
    "transport de marchandises",
]

# CPV code for vocational training services
CPV_CODE = "80500000"


class BOAMPCollector(BaseCollector):
    """Collector for BOAMP public procurement announcements related to training."""

    SOURCE_NAME = "boamp"

    def __init__(self, db_path: str, logger=None, days_back: int = 30):
        super().__init__(db_path, logger)
        self.days_back = days_back

    def _build_query(self) -> dict:
        """Build API query parameters."""
        date_from = (datetime.now() - timedelta(days=self.days_back)).strftime("%Y-%m-%d")

        # Build keyword search clause
        keyword_clauses = " OR ".join(
            [f'search(objet, "{kw}")' for kw in KEYWORDS]
        )

        where_clause = (
            f"dateparution >= '{date_from}' AND "
            f"({keyword_clauses})"
        )

        return {
            "where": where_clause,
            "limit": 100,
            "offset": 0,
            "order_by": "dateparution DESC",
        }

    def _is_relevant(self, record: dict) -> bool:
        """Filter out irrelevant records based on exclusion terms."""
        text = (
            (record.get("objet") or "") + " " + (record.get("descripteurs") or "")
        ).lower()

        for term in EXCLUSION_TERMS:
            if term.lower() in text:
                return False

        return True

    def _extract_region(self, record: dict) -> Optional[str]:
        """Extract region from the record's department or location fields."""
        return record.get("lieu_exec_nom") or record.get("dept") or None

    def _extract_montant(self, record: dict) -> Optional[float]:
        """Extract estimated amount if available."""
        montant = record.get("montant") or record.get("valeur_estimee")
        if montant is not None:
            try:
                return float(montant)
            except (ValueError, TypeError):
                return None
        return None

    def _parse_record(self, record: dict) -> dict:
        """Convert a BOAMP API record to an article dict."""
        source_id = str(record.get("idweb", record.get("id", "")))
        title = record.get("objet", "Sans titre")
        url = f"https://www.boamp.fr/avis/detail/{source_id}" if source_id else None
        content = record.get("descripteurs") or record.get("objet") or ""
        published_date = record.get("dateparution")
        acheteur = record.get("nomacheteur") or record.get("denomination")
        date_limite = record.get("datelimiteremiseoffres") or record.get("date_limite")
        cpv = record.get("codecpv") or CPV_CODE

        return {
            "source": "boamp",
            "source_id": f"boamp-{source_id}",
            "title": title.strip() if title else "Sans titre",
            "url": url,
            "content": content.strip() if content else None,
            "published_date": published_date,
            "category": "ao",
            "status": "new",
            "acheteur": acheteur,
            "region": self._extract_region(record),
            "montant_estime": self._extract_montant(record),
            "date_limite": date_limite,
            "cpv_code": cpv,
        }

    def collect(self) -> list[dict]:
        """Fetch BOAMP announcements matching training-related criteria.

        Returns:
            List of article dicts ready for database insertion.
        """
        all_articles = []
        offset = 0
        max_pages = 10  # Safety limit

        for page in range(max_pages):
            params = self._build_query()
            params["offset"] = offset

            self.logger.info(
                f"BOAMP requete page {page + 1} (offset={offset})"
            )

            try:
                response = requests.get(API_URL, params=params, timeout=30)
                response.raise_for_status()
            except requests.RequestException as e:
                self.logger.error(f"BOAMP erreur API: {e}")
                break

            data = response.json()
            results = data.get("results", [])

            if not results:
                self.logger.info("BOAMP: plus de resultats")
                break

            for record in results:
                if self._is_relevant(record):
                    article = self._parse_record(record)
                    all_articles.append(article)
                else:
                    self.logger.debug(
                        f"BOAMP: exclu '{record.get('objet', '')[:60]}'"
                    )

            total_count = data.get("total_count", 0)
            offset += len(results)
            if offset >= total_count:
                break

        self.logger.info(f"BOAMP: {len(all_articles)} annonces pertinentes collectees")
        return all_articles
