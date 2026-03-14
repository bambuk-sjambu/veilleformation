"""Legifrance collector using the PISTE API.

Requires OAuth2 credentials (client_id + client_secret) from:
https://api.gouv.fr/les-api/api-legifrance

If credentials are not configured, the collector logs a warning and returns
an empty result set without raising an error.
"""

import os
from datetime import datetime, timedelta
from typing import Optional

import requests

from collectors.base import BaseCollector


TOKEN_URL = "https://oauth.piste.gouv.fr/api/oauth/token"
API_BASE = "https://api.piste.gouv.fr/dila/legifrance/lf-engine-app"

SEARCH_KEYWORDS = [
    "décret formation professionnelle",
    "arrêté certification",
    "qualiopi",
    "organisme de formation",
    "bilan pédagogique",
    "RNCP",
    "répertoire national",
    "France compétences",
    "certification professionnelle",
    "apprentissage",
    "alternance",
    "CPF",
    "VAE",
    "CFA",
    "OPCO",
    "indicateur qualité",
    "référentiel national qualité",
    "contrôle pédagogique",
    "obligation formation",
]


class LegifranceCollector(BaseCollector):
    """Collector for Legifrance legal texts related to vocational training."""

    SOURCE_NAME = "legifrance"

    def __init__(self, db_path: str, logger=None, days_back: int = 30):
        super().__init__(db_path, logger)
        self.days_back = days_back
        self.client_id = os.environ.get("LEGIFRANCE_CLIENT_ID", "")
        self.client_secret = os.environ.get("LEGIFRANCE_CLIENT_SECRET", "")
        self._access_token: Optional[str] = None

    def _has_credentials(self) -> bool:
        """Check if API credentials are configured."""
        return bool(self.client_id and self.client_secret)

    def _get_token(self) -> Optional[str]:
        """Acquire an OAuth2 access token via client credentials flow."""
        if self._access_token:
            return self._access_token

        try:
            response = requests.post(
                TOKEN_URL,
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "scope": "openid",
                },
                timeout=15,
            )
            response.raise_for_status()
            self._access_token = response.json().get("access_token")
            self.logger.info("Legifrance: token OAuth2 obtenu")
            return self._access_token
        except requests.RequestException as e:
            self.logger.error(f"Legifrance: erreur authentification: {e}")
            return None

    def _search(self, keyword: str, token: str) -> list[dict]:
        """Execute a search query against the Legifrance API.

        Args:
            keyword: Search term.
            token: OAuth2 access token.

        Returns:
            List of raw result dicts from the API.
        """
        date_from = (datetime.now() - timedelta(days=self.days_back)).strftime("%Y-%m-%d")

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

        payload = {
            "recherche": {
                "champs": [
                    {
                        "typeChamp": "ALL",
                        "criteres": [
                            {
                                "typeRecherche": "EXACTE",
                                "valeur": keyword,
                                "operateur": "ET",
                            }
                        ],
                        "operateur": "ET",
                    }
                ],
                "filtres": [
                    {
                        "facette": "DATE_SIGNATURE",
                        "dates": {
                            "start": date_from,
                            "end": datetime.now().strftime("%Y-%m-%d"),
                        },
                    },
                    {
                        "facette": "TEXT_LEGAL_STATUS",
                        "valeurs": ["VIGUEUR"],
                    },
                ],
                "pageNumber": 1,
                "pageSize": 25,
                "sort": "SIGNATURE_DATE_DESC",
                "typePagination": "DEFAUT",
            },
            "fond": "JORF",
        }

        try:
            response = requests.post(
                f"{API_BASE}/search",
                headers=headers,
                json=payload,
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()
            return data.get("results", [])
        except requests.RequestException as e:
            self.logger.warning(f"Legifrance: erreur recherche '{keyword}': {e}")
            return []

    def _parse_result(self, result: dict) -> Optional[dict]:
        """Convert a Legifrance API result to an article dict."""
        titles = result.get("titles", [])
        title = titles[0].get("title", "Sans titre") if titles else result.get("title", "Sans titre")

        text_id = result.get("id", "")
        if not text_id:
            return None

        # Construct the legifrance.gouv.fr URL
        url = f"https://www.legifrance.gouv.fr/jorf/id/{text_id}"

        content_parts = []
        if result.get("abstract"):
            content_parts.append(result["abstract"])
        if result.get("nor"):
            content_parts.append(f"NOR: {result['nor']}")
        content = " | ".join(content_parts) if content_parts else None

        # Parse signature date
        published_date = None
        sig_date = result.get("signatureDate") or result.get("dateSignature")
        if sig_date:
            try:
                if isinstance(sig_date, (int, float)):
                    published_date = datetime.fromtimestamp(sig_date / 1000).strftime("%Y-%m-%d")
                else:
                    published_date = sig_date[:10]
            except (ValueError, TypeError):
                pass

        return {
            "source": "legifrance",
            "source_id": f"legi-{text_id}",
            "title": title.strip(),
            "url": url,
            "content": content,
            "published_date": published_date,
            "category": "reglementaire",
            "status": "new",
        }

    def collect(self) -> list[dict]:
        """Fetch Legifrance texts matching training-related keywords.

        Returns an empty list if credentials are missing.
        """
        if not self._has_credentials():
            self.logger.warning(
                "Legifrance: identifiants API manquants "
                "(LEGIFRANCE_CLIENT_ID / LEGIFRANCE_CLIENT_SECRET). "
                "Collecte ignoree."
            )
            return []

        token = self._get_token()
        if not token:
            self.logger.error("Legifrance: impossible d'obtenir le token. Collecte annulee.")
            return []

        seen_ids = set()
        articles = []

        for keyword in SEARCH_KEYWORDS:
            self.logger.info(f"Legifrance: recherche '{keyword}'")
            results = self._search(keyword, token)

            for result in results:
                article = self._parse_result(result)
                if article and article["source_id"] not in seen_ids:
                    seen_ids.add(article["source_id"])
                    articles.append(article)

        self.logger.info(f"Legifrance: {len(articles)} textes uniques collectes")
        return articles
