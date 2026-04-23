"""Brevo (ex-Sendinblue) email integration for Cipia.

Handles subscriber management, campaign creation/sending, transactional
emails, and statistics synchronization via the Brevo v3 REST API.
"""

import logging
import os
import time
from datetime import datetime
from typing import Optional

import httpx

from storage.database import get_connection

logger = logging.getLogger("veille.brevo")


# ---------------------------------------------------------------------------
# Rate-limit helper
# ---------------------------------------------------------------------------

class _RateLimiter:
    """Simple token-bucket limiter for Brevo's 400 req/min cap."""

    def __init__(self, max_requests: int = 380, window_seconds: float = 60.0):
        self._max = max_requests
        self._window = window_seconds
        self._timestamps: list[float] = []

    def wait_if_needed(self) -> None:
        """Block until a request slot is available."""
        now = time.monotonic()
        # Purge timestamps older than the window
        self._timestamps = [t for t in self._timestamps if now - t < self._window]
        if len(self._timestamps) >= self._max:
            sleep_for = self._window - (now - self._timestamps[0]) + 0.1
            if sleep_for > 0:
                logger.debug("Rate limit: pause %.1fs", sleep_for)
                time.sleep(sleep_for)
        self._timestamps.append(time.monotonic())


# ---------------------------------------------------------------------------
# Brevo client
# ---------------------------------------------------------------------------

class BrevoClient:
    """Client for the Brevo v3 API (email campaigns, contacts, SMTP)."""

    BASE_URL = "https://api.brevo.com/v3"

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("BREVO_API_KEY", "")
        self.list_id = int(os.environ.get("BREVO_LIST_ID", "3"))
        self.sender_name = os.environ.get("BREVO_SENDER_NAME", "Cipia")
        self.sender_email = os.environ.get("BREVO_SENDER_EMAIL", "newsletter@cipia.fr")
        self.reply_to = os.environ.get("BREVO_REPLY_TO", "contact@cipia.fr")

        self._headers = {
            "api-key": self.api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        self._rate_limiter = _RateLimiter()

        if not self.api_key:
            logger.warning(
                "BREVO_API_KEY non configuree -- les appels Brevo echoueront"
            )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _check_api_key(self) -> bool:
        """Return True if the API key is set, log a warning otherwise."""
        if not self.api_key:
            logger.warning("Appel Brevo ignore: BREVO_API_KEY manquante")
            return False
        return True

    def _request(
        self,
        method: str,
        path: str,
        json_body: Optional[dict] = None,
        params: Optional[dict] = None,
        timeout: float = 30.0,
    ) -> Optional[httpx.Response]:
        """Execute an HTTP request against the Brevo API.

        Handles rate limiting, timeouts, and HTTP errors gracefully.
        Returns the Response on success, None on failure.
        """
        if not self._check_api_key():
            return None

        self._rate_limiter.wait_if_needed()
        url = f"{self.BASE_URL}{path}"

        try:
            response = httpx.request(
                method,
                url,
                headers=self._headers,
                json=json_body,
                params=params,
                timeout=timeout,
            )
            response.raise_for_status()
            return response
        except httpx.HTTPStatusError as exc:
            body = exc.response.text[:500] if exc.response else ""
            logger.error(
                "Brevo %s %s -> HTTP %s: %s",
                method, path, exc.response.status_code, body,
            )
        except httpx.TimeoutException:
            logger.error("Brevo %s %s -> timeout (%.0fs)", method, path, timeout)
        except httpx.HTTPError as exc:
            logger.error("Brevo %s %s -> erreur reseau: %s", method, path, exc)

        return None

    # ------------------------------------------------------------------
    # Subscriber management
    # ------------------------------------------------------------------

    def add_subscriber(
        self,
        email: str,
        first_name: Optional[str] = None,
        company_name: Optional[str] = None,
        source: str = "landing_page",
    ) -> bool:
        """Add or update a contact in the Brevo list.

        Returns True on success, False on error.
        """
        attributes = {"SOURCE": source}
        if first_name:
            attributes["PRENOM"] = first_name
        if company_name:
            attributes["ENTREPRISE"] = company_name

        body = {
            "email": email,
            "attributes": attributes,
            "listIds": [self.list_id],
            "updateEnabled": True,
        }

        resp = self._request("POST", "/contacts", json_body=body)
        if resp is not None:
            logger.info("Subscriber ajoute/mis a jour: %s", email)
            return True
        return False

    def remove_subscriber(self, email: str) -> bool:
        """Remove a contact from the newsletter list.

        Returns True on success, False on error.
        """
        body = {"emails": [email]}
        path = f"/contacts/lists/{self.list_id}/contacts/remove"

        resp = self._request("POST", path, json_body=body)
        if resp is not None:
            logger.info("Subscriber retire de la liste %d: %s", self.list_id, email)
            return True
        return False

    def get_subscriber_count(self) -> int:
        """Return the number of subscribers in the newsletter list.

        Returns 0 on error.
        """
        resp = self._request("GET", f"/contacts/lists/{self.list_id}")
        if resp is None:
            return 0

        try:
            data = resp.json()
            count = data.get("subscribersCount", 0)
            logger.info("Liste %d: %d abonnes", self.list_id, count)
            return count
        except Exception as exc:
            logger.error("Erreur parsing subscriber count: %s", exc)
            return 0

    # ------------------------------------------------------------------
    # Campaign management
    # ------------------------------------------------------------------

    def create_and_send_campaign(
        self,
        html_content: str,
        subject: str,
        scheduled_at: Optional[str] = None,
    ) -> Optional[int]:
        """Create an email campaign and send it (or schedule it).

        Args:
            html_content: Rendered HTML of the newsletter.
            subject: Email subject line.
            scheduled_at: ISO 8601 datetime for scheduled send. If None,
                the campaign is sent immediately.

        Returns:
            The Brevo campaign ID on success, None on failure.
        """
        body: dict = {
            "name": f"Cipia #{subject}",
            "subject": subject,
            "sender": {"name": self.sender_name, "email": self.sender_email},
            "replyTo": {"email": self.reply_to},
            "htmlContent": html_content,
            "recipients": {"listIds": [self.list_id]},
            "inlineImageActivation": False,
        }

        if scheduled_at:
            body["scheduledAt"] = scheduled_at

        # Step 1: create the campaign
        resp = self._request("POST", "/emailCampaigns", json_body=body)
        if resp is None:
            return None

        try:
            campaign_id = resp.json().get("id")
        except Exception as exc:
            logger.error("Erreur parsing campaign ID: %s", exc)
            return None

        if campaign_id is None:
            logger.error("Campaign creee mais ID absent de la reponse")
            return None

        logger.info("Campaign #%s creee: '%s'", campaign_id, subject)

        # Step 2: send immediately if not scheduled
        if not scheduled_at:
            send_resp = self._request(
                "POST", f"/emailCampaigns/{campaign_id}/sendNow"
            )
            if send_resp is None:
                logger.error(
                    "Campaign #%s creee mais envoi echoue", campaign_id
                )
                # Return the ID anyway -- the campaign exists in Brevo
                return campaign_id
            logger.info("Campaign #%s envoyee", campaign_id)
        else:
            logger.info(
                "Campaign #%s programmee pour %s", campaign_id, scheduled_at
            )

        return campaign_id

    # ------------------------------------------------------------------
    # Campaign statistics
    # ------------------------------------------------------------------

    def get_campaign_stats(self, campaign_id: int) -> Optional[dict]:
        """Retrieve delivery statistics for a campaign.

        Returns a dict with: recipients, delivered, opens, clicks,
        unsubscribes, bounces, open_rate, click_rate.
        Returns None on error.
        """
        resp = self._request("GET", f"/emailCampaigns/{campaign_id}")
        if resp is None:
            return None

        try:
            data = resp.json()
            stats_raw = data.get("statistics", {}).get("globalStats", {})

            delivered = stats_raw.get("delivered", 0)
            opens = stats_raw.get("uniqueOpens", 0)
            clicks = stats_raw.get("uniqueClicks", 0)

            stats = {
                "recipients": data.get("recipients", {}).get("recipientsCount", 0),
                "delivered": delivered,
                "opens": opens,
                "clicks": clicks,
                "unsubscribes": stats_raw.get("unsubscribed", 0),
                "bounces": (
                    stats_raw.get("hardBounces", 0)
                    + stats_raw.get("softBounces", 0)
                ),
                "open_rate": round(opens / delivered * 100, 1) if delivered else 0.0,
                "click_rate": round(clicks / delivered * 100, 1) if delivered else 0.0,
            }

            logger.info(
                "Campaign #%s stats: %d delivered, %.1f%% open, %.1f%% click",
                campaign_id, delivered, stats["open_rate"], stats["click_rate"],
            )
            return stats
        except Exception as exc:
            logger.error("Erreur parsing campaign stats: %s", exc)
            return None

    # ------------------------------------------------------------------
    # Transactional email
    # ------------------------------------------------------------------

    def send_transactional_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
    ) -> bool:
        """Send a transactional email (monitoring alerts, etc.).

        Returns True on success, False on error.
        """
        body = {
            "sender": {"name": self.sender_name, "email": self.sender_email},
            "to": [{"email": to_email}],
            "subject": subject,
            "htmlContent": html_content,
        }

        resp = self._request("POST", "/smtp/email", json_body=body)
        if resp is not None:
            logger.info("Email transactionnel envoye a %s: '%s'", to_email, subject)
            return True
        return False

    # ------------------------------------------------------------------
    # Synchronization helpers
    # ------------------------------------------------------------------

    def sync_unsubscribes(self, db_path: str) -> int:
        """Synchronize unsubscribed/blacklisted contacts from Brevo to SQLite.

        Fetches contacts from the list and checks for emailBlacklisted flag.
        Updates the subscribers table accordingly.

        Returns the number of newly unsubscribed contacts.
        """
        if not self._check_api_key():
            return 0

        unsubscribed_count = 0
        offset = 0
        limit = 50  # Brevo max per page

        conn = get_connection(db_path)
        try:
            while True:
                resp = self._request(
                    "GET",
                    f"/contacts/lists/{self.list_id}/contacts",
                    params={"limit": limit, "offset": offset},
                )
                if resp is None:
                    break

                try:
                    data = resp.json()
                    contacts = data.get("contacts", [])
                except Exception as exc:
                    logger.error("Erreur parsing contacts: %s", exc)
                    break

                if not contacts:
                    break

                for contact in contacts:
                    email = contact.get("email", "")
                    is_blacklisted = contact.get("emailBlacklisted", False)

                    if is_blacklisted and email:
                        cursor = conn.execute(
                            """
                            UPDATE subscribers
                            SET is_active = 0,
                                unsubscribed_at = datetime('now')
                            WHERE email = ?
                              AND is_active = 1
                            """,
                            (email,),
                        )
                        if cursor.rowcount > 0:
                            unsubscribed_count += 1
                            logger.info("Desabonnement synchronise: %s", email)

                conn.commit()

                # Check if we fetched all contacts
                total_count = data.get("count", 0)
                offset += limit
                if offset >= total_count:
                    break

        finally:
            conn.close()

        logger.info(
            "Sync desabonnements: %d nouveaux desabonnes", unsubscribed_count
        )
        return unsubscribed_count

    def fetch_and_store_stats(
        self,
        campaign_id: int,
        newsletter_id: int,
        db_path: str,
    ) -> Optional[dict]:
        """Fetch campaign stats from Brevo and persist them in the database.

        Updates the newsletters table with open_rate, click_rate, and
        unsubscribe_count.

        Returns the stats dict on success, None on failure.
        """
        stats = self.get_campaign_stats(campaign_id)
        if stats is None:
            return None

        conn = get_connection(db_path)
        try:
            conn.execute(
                """
                UPDATE newsletters
                SET open_rate = ?,
                    click_rate = ?,
                    unsubscribe_count = ?,
                    recipients_count = ?
                WHERE id = ?
                """,
                (
                    stats["open_rate"],
                    stats["click_rate"],
                    stats["unsubscribes"],
                    stats["recipients"],
                    newsletter_id,
                ),
            )
            conn.commit()
            logger.info(
                "Stats newsletter #%d mises a jour (campaign %s): "
                "open=%.1f%%, click=%.1f%%, unsub=%d",
                newsletter_id,
                campaign_id,
                stats["open_rate"],
                stats["click_rate"],
                stats["unsubscribes"],
            )
        finally:
            conn.close()

        return stats
