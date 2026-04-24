"""BOAMP (Bulletin Officiel des Annonces de Marches Publics) collector.

Uses the BOAMP open data API via OpenDataSoft (PAPS).
Filters for CPV 80500000 (formation professionnelle) and related keywords.
"""

import re
import time
from datetime import datetime, timedelta
from typing import Optional

import requests

from collectors.base import BaseCollector
from storage.monitoring import send_monitoring_alert

# Retry configuration
RETRY_DELAYS = [30, 60, 120]  # Exponential backoff in seconds
MAX_CONSECUTIVE_FAILURES = 3  # Alert threshold


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


# Mapping departement -> region (INSEE)
DEPT_TO_REGION = {
    # Ile-de-France
    "75": "Ile-de-France", "77": "Ile-de-France", "78": "Ile-de-France",
    "91": "Ile-de-France", "92": "Ile-de-France", "93": "Ile-de-France",
    "94": "Ile-de-France", "95": "Ile-de-France",
    # Auvergne-Rhone-Alpes
    "01": "Auvergne-Rhone-Alpes", "03": "Auvergne-Rhone-Alpes",
    "07": "Auvergne-Rhone-Alpes", "15": "Auvergne-Rhone-Alpes",
    "26": "Auvergne-Rhone-Alpes", "38": "Auvergne-Rhone-Alpes",
    "42": "Auvergne-Rhone-Alpes", "43": "Auvergne-Rhone-Alpes",
    "63": "Auvergne-Rhone-Alpes", "69": "Auvergne-Rhone-Alpes",
    "73": "Auvergne-Rhone-Alpes", "74": "Auvergne-Rhone-Alpes",
    # Hauts-de-France
    "02": "Hauts-de-France", "59": "Hauts-de-France",
    "60": "Hauts-de-France", "62": "Hauts-de-France", "80": "Hauts-de-France",
    # Nouvelle-Aquitaine
    "16": "Nouvelle-Aquitaine", "17": "Nouvelle-Aquitaine",
    "19": "Nouvelle-Aquitaine", "23": "Nouvelle-Aquitaine",
    "24": "Nouvelle-Aquitaine", "33": "Nouvelle-Aquitaine",
    "40": "Nouvelle-Aquitaine", "47": "Nouvelle-Aquitaine",
    "64": "Nouvelle-Aquitaine", "79": "Nouvelle-Aquitaine",
    "86": "Nouvelle-Aquitaine", "87": "Nouvelle-Aquitaine",
    # Occitanie
    "09": "Occitanie", "11": "Occitanie", "12": "Occitanie", "30": "Occitanie",
    "31": "Occitanie", "32": "Occitanie", "34": "Occitanie", "46": "Occitanie",
    "48": "Occitanie", "65": "Occitanie", "66": "Occitanie", "81": "Occitanie",
    "82": "Occitanie",
    # Grand Est
    "08": "Grand Est", "10": "Grand Est", "51": "Grand Est", "52": "Grand Est",
    "54": "Grand Est", "55": "Grand Est", "57": "Grand Est", "67": "Grand Est",
    "68": "Grand Est", "88": "Grand Est",
    # Provence-Alpes-Cote-d'Azur
    "04": "Provence-Alpes-Cote-d'Azur", "05": "Provence-Alpes-Cote-d'Azur",
    "06": "Provence-Alpes-Cote-d'Azur", "13": "Provence-Alpes-Cote-d'Azur",
    "83": "Provence-Alpes-Cote-d'Azur", "84": "Provence-Alpes-Cote-d'Azur",
    # Pays de la Loire
    "44": "Pays de la Loire", "49": "Pays de la Loire",
    "53": "Pays de la Loire", "72": "Pays de la Loire", "85": "Pays de la Loire",
    # Bretagne
    "22": "Bretagne", "29": "Bretagne", "35": "Bretagne", "56": "Bretagne",
    # Normandie
    "14": "Normandie", "27": "Normandie", "50": "Normandie",
    "61": "Normandie", "76": "Normandie",
    # Bourgogne-Franche-Comte
    "21": "Bourgogne-Franche-Comte", "25": "Bourgogne-Franche-Comte",
    "39": "Bourgogne-Franche-Comte", "58": "Bourgogne-Franche-Comte",
    "70": "Bourgogne-Franche-Comte", "71": "Bourgogne-Franche-Comte",
    "89": "Bourgogne-Franche-Comte", "90": "Bourgogne-Franche-Comte",
    # Centre-Val de Loire
    "18": "Centre-Val de Loire", "28": "Centre-Val de Loire",
    "36": "Centre-Val de Loire", "37": "Centre-Val de Loire",
    "41": "Centre-Val de Loire", "45": "Centre-Val de Loire",
    # Corse
    "2A": "Corse", "2B": "Corse", "20": "Corse",
    # DOM-TOM
    "971": "Guadeloupe", "972": "Martinique", "973": "Guyane",
    "974": "Reunion", "976": "Mayotte",
}


class BOAMPCollector(BaseCollector):
    """Collector for BOAMP public procurement announcements related to training."""

    SOURCE_NAME = "boamp"

    def __init__(self, db_path: str, logger=None, days_back: int = 30):
        super().__init__(db_path, logger)
        self.days_back = days_back

    def _build_query(self) -> dict:
        """Build API query parameters."""
        date_from = (datetime.now() - timedelta(days=self.days_back)).strftime("%Y-%m-%d")

        keyword_clauses = " OR ".join(
            [f'search(objet, "{kw}")' for kw in KEYWORDS]
        )

        # Note : l'API OpenDataSoft BOAMP n'expose pas directement le code CPV.
        # Le filtrage se fait via keywords uniquement (descripteur_code non indexe en where).
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
        """Derive region name from department code.

        BOAMP expose code_departement et code_departement_prestation comme des listes
        (ex : ['75']), pas des scalaires. On prend la premiere valeur de la liste.
        """
        def first(val):
            if isinstance(val, list):
                return val[0] if val else None
            return val

        dept = (
            first(record.get("code_departement_prestation"))
            or first(record.get("code_departement"))
            or first(record.get("dept"))
        )
        if dept:
            dept_str = str(dept).strip().upper()
            # Essaie match direct (2A, 2B, 971-976) puis zfill
            return (
                DEPT_TO_REGION.get(dept_str)
                or DEPT_TO_REGION.get(dept_str.zfill(2))
                or DEPT_TO_REGION.get(dept_str[:3])
                or DEPT_TO_REGION.get(dept_str[:2])
            )
        return first(record.get("lieu_exec_nom"))

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
        def _first(val):
            if isinstance(val, list):
                return val[0] if val else None
            return val

        acheteur = record.get("nomacheteur") or record.get("denomination")
        # Le champ officiel OpenDataSoft est datelimitereponse (verifie via l'API)
        date_limite = (
            record.get("datelimitereponse")
            or record.get("datelimiteremiseoffres")
            or record.get("date_limite")
        )
        # descripteur_code est une liste (ex: ["80500000"]). Extraire le premier.
        cpv = _first(record.get("descripteur_code")) or CPV_CODE

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

    def _fetch_with_retry(self, params: dict) -> Optional[dict]:
        """Fetch API with exponential backoff retry.

        Args:
            params: Query parameters for the API.

        Returns:
            JSON response dict or None if all retries failed.
        """
        last_error = None

        for attempt, delay in enumerate(RETRY_DELAYS):
            try:
                response = requests.get(API_URL, params=params, timeout=30)
                response.raise_for_status()
                return response.json()
            except requests.RequestException as e:
                last_error = e
                self.logger.warning(
                    f"BOAMP tentative {attempt + 1}/{len(RETRY_DELAYS)} echouee: {e}"
                )
                if attempt < len(RETRY_DELAYS) - 1:
                    self.logger.info(f"BOAMP retry dans {delay}s...")
                    time.sleep(delay)

        self.logger.error(f"BOAMP: toutes les tentatives ont echoue - {last_error}")
        return None

    def collect(self) -> list[dict]:
        """Fetch BOAMP announcements matching training-related criteria.

        Returns:
            List of article dicts ready for database insertion.
        """
        all_articles = []
        offset = 0
        max_pages = 10  # Safety limit
        consecutive_failures = 0

        for page in range(max_pages):
            params = self._build_query()
            params["offset"] = offset

            self.logger.info(
                f"BOAMP requete page {page + 1} (offset={offset})"
            )

            data = self._fetch_with_retry(params)

            if data is None:
                consecutive_failures += 1
                if consecutive_failures >= MAX_CONSECUTIVE_FAILURES:
                    self.logger.error(
                        f"BOAMP: {consecutive_failures} echecs consecutifs - alerte monitoring"
                    )
                    send_monitoring_alert(
                        db_path=self.db_path,
                        severity="critical",
                        alert_type="api_failure",
                        source="boamp",
                        message=f"API BOAMP inaccessible apres {MAX_CONSECUTIVE_FAILURES} tentatives",
                        details={"consecutive_failures": consecutive_failures},
                    )
                break

            consecutive_failures = 0  # Reset on success
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
