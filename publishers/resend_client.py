"""Resend email integration for Cipia newsletter.

Replaces Brevo for the weekly newsletter. Resend has no campaign/list concept,
so we iterate over active subscribers from the local SQLite DB and send one
email per recipient via the Resend API.

Rate limit: Resend free tier = 10 req/s. We sleep 0.12s between sends.
"""

import logging
import os
import time
import uuid
from typing import Optional

import httpx

from storage.database import get_connection

logger = logging.getLogger("veille.resend")


class ResendClient:
    """Minimal Resend client for newsletter delivery."""

    BASE_URL = "https://api.resend.com"
    SEND_INTERVAL_S = 0.12  # ~8 req/s, under the 10 req/s free tier limit

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("RESEND_API_KEY", "")
        self.sender_name = os.environ.get("RESEND_FROM_NAME", "Cipia")
        self.sender_email = os.environ.get("RESEND_FROM_EMAIL", "newsletter@cipia.fr")
        self.reply_to = os.environ.get("RESEND_REPLY_TO", "contact@cipia.fr")

        self._headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        if not self.api_key:
            logger.warning("RESEND_API_KEY non configuree -- les envois Resend echoueront")

    def get_subscriber_count(self, db_path: str) -> int:
        """Return number of active (non-unsubscribed) subscribers."""
        conn = get_connection(db_path)
        try:
            row = conn.execute(
                "SELECT COUNT(*) FROM subscribers WHERE unsubscribed_at IS NULL AND is_active = 1"
            ).fetchone()
            return int(row[0]) if row else 0
        finally:
            conn.close()

    def _send_one(self, client: httpx.Client, to: str, subject: str, html: str,
                  max_retries: int = 3) -> Optional[str]:
        """Send a single email with exponential backoff on 429/5xx.

        Returns Resend email_id on success, None on definitive failure.
        """
        payload = {
            "from": f"{self.sender_name} <{self.sender_email}>",
            "to": [to],
            "subject": subject,
            "html": html,
            "reply_to": self.reply_to,
        }
        for attempt in range(max_retries):
            try:
                resp = client.post(f"{self.BASE_URL}/emails", json=payload, headers=self._headers)
                # Retry on rate limit or transient server errors
                if resp.status_code in (429, 500, 502, 503, 504):
                    delay = 2 ** attempt  # 1s, 2s, 4s
                    logger.warning(
                        "Resend %s for %s (attempt %d/%d), retry in %ds",
                        resp.status_code, to, attempt + 1, max_retries, delay,
                    )
                    time.sleep(delay)
                    continue
                if resp.status_code >= 400:
                    # Definitive client error (400, 401, 422 = bad email, etc.)
                    logger.warning(
                        "Resend send failed (definitive) for %s: %s %s",
                        to, resp.status_code, resp.text[:200],
                    )
                    return None
                data = resp.json()
                return data.get("id")
            except (httpx.RequestError, httpx.TimeoutException) as e:
                delay = 2 ** attempt
                logger.warning(
                    "Resend network error for %s (attempt %d/%d): %s, retry in %ds",
                    to, attempt + 1, max_retries, e, delay,
                )
                time.sleep(delay)
        logger.error("Resend send exhausted retries for %s", to)
        return None

    def send_newsletter(self, html: str, subject: str, db_path: str) -> dict:
        """Send the newsletter HTML to all active subscribers.

        Returns a result dict:
          {"batch_id": str|None, "sent": int, "failed": int, "total": int}
        batch_id is None if zero successful sends (caller should treat as failure).
        """
        if not self.api_key:
            logger.error("Resend send_newsletter: RESEND_API_KEY manquante")
            return {"batch_id": None, "sent": 0, "failed": 0, "total": 0}

        conn = get_connection(db_path)
        try:
            rows = conn.execute(
                "SELECT email FROM subscribers "
                "WHERE unsubscribed_at IS NULL AND is_active = 1 AND email IS NOT NULL"
            ).fetchall()
        finally:
            conn.close()

        emails = [r[0] for r in rows]  # SQL already filtered NULL
        if not emails:
            logger.warning("Resend send_newsletter: aucun subscriber actif")
            return {"batch_id": None, "sent": 0, "failed": 0, "total": 0}

        batch_id = f"resend-{uuid.uuid4().hex[:12]}"
        logger.info("Resend: envoi newsletter a %d destinataires (batch=%s)", len(emails), batch_id)

        sent = 0
        failed = 0
        with httpx.Client(timeout=20.0) as client:
            for i, email in enumerate(emails):
                if i > 0:
                    time.sleep(self.SEND_INTERVAL_S)
                email_id = self._send_one(client, email, subject, html)
                if email_id:
                    sent += 1
                else:
                    failed += 1

        logger.info("Resend: %d envoyes / %d echecs / %d total", sent, failed, len(emails))

        return {
            "batch_id": batch_id if sent > 0 else None,
            "sent": sent,
            "failed": failed,
            "total": len(emails),
        }
