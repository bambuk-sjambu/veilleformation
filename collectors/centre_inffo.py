"""Centre Inffo collector via WordPress REST API.

Centre Inffo (centre-inffo.fr) est l'organisme public de référence sur la
formation professionnelle en France. Il édite "Le Quotidien de la Formation",
agrège les actualités OPCO/Régions/France compétences, et commente les
décrets/arrêtés/lois Légifrance.

Source ultra-stable (WordPress REST API publique, pas anti-bot, pas de captcha).
"""

import re
import time
from datetime import datetime, timedelta
from html import unescape
from typing import Optional

import requests

from collectors.base import BaseCollector
from storage.monitoring import send_monitoring_alert

API_BASE = "https://www.centre-inffo.fr/wp-json/wp/v2"
RETRY_DELAYS = [10, 30, 60]
MAX_CONSECUTIVE_FAILURES = 3

# Mots-clés couvrant les indicateurs Qualiopi 23-26 et la formation pro globale.
KEYWORDS = [
    "qualiopi",
    "formation professionnelle",
    "organisme de formation",
    "compte personnel de formation",
    "apprentissage",
    "alternance",
    "OPCO",
    "France compétences",
    "France Travail",
    "VAE",
    "validation des acquis",
    "bilan de compétences",
    "CFA",
    "décret formation",
    "arrêté formation",
    "loi formation",
    "certification",
    "handicap formation",
]

USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) Cipia/1.0 +https://cipia.fr"

# Strip HTML tags
_HTML_TAG = re.compile(r"<[^>]+>")
# Strip Centre Inffo "Continue reading" markup
_READMORE = re.compile(r"\[\&hellip;\].*$|Continue reading.*$", re.DOTALL)


def _clean_html(text: str) -> str:
    """Strip HTML tags and decode entities."""
    if not text:
        return ""
    text = _HTML_TAG.sub("", text)
    text = _READMORE.sub("", text)
    text = unescape(text)
    return re.sub(r"\s+", " ", text).strip()


class CentreInffoCollector(BaseCollector):
    """Collect articles from Centre Inffo (Le Quotidien de la Formation)."""

    SOURCE_NAME = "centre_inffo"

    def __init__(self, db_path: str, logger=None, days_back: int = 30):
        super().__init__(db_path, logger)
        self.days_back = days_back

    def _fetch_with_retry(self, params: dict) -> Optional[list]:
        """GET API WP REST avec retry exponentiel."""
        last_error = None
        url = f"{API_BASE}/posts"
        for attempt, delay in enumerate(RETRY_DELAYS):
            try:
                r = requests.get(
                    url,
                    params=params,
                    headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
                    timeout=30,
                )
                r.raise_for_status()
                return r.json()
            except requests.RequestException as e:
                last_error = e
                self.logger.warning(
                    f"CentreInffo tentative {attempt + 1}/{len(RETRY_DELAYS)} echouee: {e}"
                )
                if attempt < len(RETRY_DELAYS) - 1:
                    time.sleep(delay)
        self.logger.error(f"CentreInffo: toutes les tentatives ont echoue - {last_error}")
        return None

    def _classify_category(self, title: str, excerpt: str) -> str:
        """Devine la catégorie selon le contenu : reglementaire / metier / handicap."""
        text = (title + " " + excerpt).lower()
        if any(kw in text for kw in ("handicap", "rqth", "psh", "compensation")):
            return "handicap"
        if any(kw in text for kw in ("décret", "arrêté", "loi", "ordonnance", "code du travail", "qualiopi", "audit", "certification")):
            return "reglementaire"
        if any(kw in text for kw in ("métier", "compétence", "emploi", "ressources humaines")):
            return "metier"
        return "reglementaire"  # défaut : actualités Centre Inffo = réglementaire formation

    def _parse_post(self, post: dict) -> dict:
        """Convertit un post WordPress en article structuré pour la DB."""
        post_id = post.get("id", 0)
        title = _clean_html(post.get("title", {}).get("rendered", "Sans titre"))
        excerpt = _clean_html(post.get("excerpt", {}).get("rendered", ""))
        url = post.get("link", "")
        published = post.get("date", "")
        if published:
            # Format ISO -> YYYY-MM-DD pour la colonne DATE
            try:
                published = datetime.fromisoformat(published.replace("Z", "+00:00")).strftime("%Y-%m-%d")
            except (ValueError, AttributeError):
                published = published[:10]

        return {
            "source": self.SOURCE_NAME,
            "source_id": f"centre_inffo-{post_id}",
            "title": title,
            "url": url,
            "content": excerpt,
            "published_date": published,
            "category": self._classify_category(title, excerpt),
            "status": "new",
        }

    def collect(self) -> list[dict]:
        """Récupère les articles Centre Inffo correspondant aux mots-clés.

        Stratégie :
        1. Pour chaque keyword, requête /posts?search=KW&after=ISO&per_page=100
        2. Dédupliquer par post.id (un article peut matcher plusieurs keywords)
        3. Retourner la liste consolidée
        """
        cutoff = (datetime.now() - timedelta(days=self.days_back)).strftime("%Y-%m-%dT00:00:00")
        seen_ids: set = set()
        articles: list[dict] = []
        consecutive_failures = 0

        for kw in KEYWORDS:
            params = {
                "search": kw,
                "after": cutoff,
                "per_page": 100,
                "_fields": "id,date,title,link,excerpt",
                "orderby": "date",
                "order": "desc",
            }

            self.logger.info(f"CentreInffo: search '{kw}'")
            posts = self._fetch_with_retry(params)

            if posts is None:
                consecutive_failures += 1
                if consecutive_failures >= MAX_CONSECUTIVE_FAILURES:
                    self.logger.error(
                        f"CentreInffo: {consecutive_failures} echecs consecutifs - alerte"
                    )
                    send_monitoring_alert(
                        db_path=self.db_path,
                        severity="critical",
                        alert_type="api_failure",
                        source="centre_inffo",
                        message="API Centre Inffo inaccessible",
                        details={"keyword": kw},
                    )
                    break
                continue

            consecutive_failures = 0

            for post in posts:
                pid = post.get("id")
                if not pid or pid in seen_ids:
                    continue
                seen_ids.add(pid)
                articles.append(self._parse_post(post))

        self.logger.info(f"CentreInffo: {len(articles)} articles uniques collectes")
        return articles
