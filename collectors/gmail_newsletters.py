"""Gmail newsletter parser for Cipia.

Reads newsletters from Travail.gouv, Education.gouv and other government sources
via Gmail IMAP and extracts article information.

Requirements:
    - Gmail account with 2FA enabled
    - App password generated (https://myaccount.google.com/apppasswords)
    - IMAP enabled in Gmail settings
"""

import imaplib
import email
from email.header import decode_header
import re
import hashlib
import os
from datetime import datetime
from typing import Optional
from html.parser import HTMLParser

# Gmail IMAP settings
IMAP_SERVER = "imap.gmail.com"
IMAP_PORT = 993

# Newsletter senders to monitor
NEWSLETTER_SENDERS = [
    "travail.gouv.fr",
    "education.gouv.fr",
    "francecompetences.fr",
    "legifrance.gouv.fr",
    "boamp.fr",
]

# Formation-related keywords for filtering
FORMATION_KEYWORDS = [
    "formation", "professionnelle", "certification", "competence",
    "cpf", "vae", "qualiopi", "organisme", "apprentissage",
    "alternance", "contrat", "salarie", "employeur", "entreprise",
    "parcours", "bilan", "stage", "diplome", "emploi", "travail",
    "reforme", "dispositif", "financement", "droit", "social",
]


def make_source_id(source: str, url: str) -> str:
    """Generate a deterministic source_id from URL hash."""
    h = hashlib.md5(url.encode()).hexdigest()[:12]
    return f"{source}-{h}"


def decode_mime_header(header_value: str) -> str:
    """Decode MIME header (handles encoded subjects)."""
    if not header_value:
        return ""
    decoded_parts = decode_header(header_value)
    result = []
    for part, encoding in decoded_parts:
        if isinstance(part, bytes):
            try:
                result.append(part.decode(encoding or "utf-8", errors="replace"))
            except (LookupError, UnicodeDecodeError):
                result.append(part.decode("utf-8", errors="replace"))
        else:
            result.append(part)
    return "".join(result)


def extract_links_from_html(html_content: str) -> list[dict]:
    """Extract links and their text from HTML content."""
    links = []
    # Simple regex-based extraction (more robust than HTMLParser for newsletters)
    pattern = r'<a[^>]*href=["\']([^"\']+)["\'][^>]*>([^<]+)</a>'
    for match in re.finditer(pattern, html_content, re.IGNORECASE | re.DOTALL):
        url = match.group(1)
        text = re.sub(r"\s+", " ", match.group(2)).strip()
        if url and text and len(text) > 15:
            links.append({"url": url, "text": text})
    return links


def extract_date_from_email(msg) -> Optional[str]:
    """Extract date from email headers."""
    date_header = msg.get("Date")
    if not date_header:
        return None

    try:
        # Parse email date format
        from email.utils import parsedate_to_datetime
        dt = parsedate_to_datetime(date_header)
        return dt.strftime("%Y-%m-%d")
    except Exception:
        return None


def get_sender_domain(msg) -> str:
    """Extract sender domain from email."""
    from_header = msg.get("From", "")
    # Extract domain from email address
    match = re.search(r"@([\w.-]+)", from_header)
    if match:
        return match.group(1).lower()
    return ""


def determine_source(sender_domain: str) -> str:
    """Determine source name from sender domain."""
    if "travail.gouv" in sender_domain:
        return "travail_gouv"
    elif "education.gouv" in sender_domain:
        return "education_gouv"
    elif "francecompetences" in sender_domain:
        return "france_competences"
    else:
        return sender_domain.replace(".", "_")


def determine_category(title: str) -> str:
    """Determine article category based on title."""
    text_lower = title.lower()
    if any(kw in text_lower for kw in ["appel", "offre", "marche"]):
        return "ao"
    elif any(kw in text_lower for kw in ["financement", "aide", "subvention"]):
        return "financement"
    elif any(kw in text_lower for kw in ["handicap", "accessibilite"]):
        return "handicap"
    elif any(kw in text_lower for kw in ["metier", "emploi", "competence"]):
        return "metier"
    else:
        return "reglementaire"


class GmailNewsletterCollector:
    """Collect articles from Gmail newsletters."""

    def __init__(self, email_address: str, app_password: str, db_path: str, logger=None):
        self.email_address = email_address
        self.app_password = app_password
        self.db_path = db_path
        self.logger = logger or self._default_logger()
        self.imap = None

    def _default_logger(self):
        import logging
        logger = logging.getLogger("gmail_newsletter")
        logger.setLevel(logging.INFO)
        if not logger.handlers:
            handler = logging.StreamHandler()
            handler.setFormatter(logging.Formatter("%(levelname)s: %(message)s"))
            logger.addHandler(handler)
        return logger

    def connect(self) -> bool:
        """Connect to Gmail IMAP server."""
        try:
            self.imap = imaplib.IMAP4_SSL(IMAP_SERVER, IMAP_PORT)
            self.imap.login(self.email_address, self.app_password)
            self.logger.info(f"Connected to Gmail as {self.email_address}")
            return True
        except Exception as e:
            self.logger.error(f"Failed to connect to Gmail: {e}")
            return False

    def disconnect(self):
        """Disconnect from Gmail."""
        if self.imap:
            try:
                self.imap.close()
                self.imap.logout()
            except Exception:
                pass
            self.imap = None

    def get_newsletter_emails(self, days_back: int = 7) -> list[dict]:
        """Fetch newsletter emails from the last N days."""
        if not self.imap:
            return []

        emails_data = []

        try:
            # Select inbox
            self.imap.select("INBOX")

            # Search for emails from newsletter senders
            since_date = datetime.now().strftime("%d-%b-%Y")

            for sender in NEWSLETTER_SENDERS:
                try:
                    # Search by sender
                    status, message_ids = self.imap.search(
                        None, f'(FROM "{sender}" SINCE "{since_date}")'
                    )

                    if status != "OK":
                        continue

                    for msg_id in message_ids[0].split():
                        if not msg_id:
                            continue

                        status, msg_data = self.imap.fetch(msg_id, "(RFC822)")
                        if status != "OK":
                            continue

                        # Parse email
                        raw_email = msg_data[0][1]
                        msg = email.message_from_bytes(raw_email)

                        # Extract basic info
                        subject = decode_mime_header(msg.get("Subject", ""))
                        sender_domain = get_sender_domain(msg)
                        date_str = extract_date_from_email(msg)

                        # Get email body
                        body = self._get_email_body(msg)

                        emails_data.append({
                            "subject": subject,
                            "sender_domain": sender_domain,
                            "date": date_str,
                            "body": body,
                        })

                except Exception as e:
                    self.logger.error(f"Error fetching emails from {sender}: {e}")

        except Exception as e:
            self.logger.error(f"Error searching emails: {e}")

        return emails_data

    def _get_email_body(self, msg) -> str:
        """Extract text/HTML body from email."""
        body = ""

        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                if content_type == "text/html":
                    try:
                        payload = part.get_payload(decode=True)
                        body = payload.decode("utf-8", errors="replace")
                        break
                    except Exception:
                        pass
                elif content_type == "text/plain" and not body:
                    try:
                        payload = part.get_payload(decode=True)
                        body = payload.decode("utf-8", errors="replace")
                    except Exception:
                        pass
        else:
            try:
                payload = msg.get_payload(decode=True)
                body = payload.decode("utf-8", errors="replace")
            except Exception:
                pass

        return body

    def extract_articles_from_emails(self, emails: list[dict]) -> list[dict]:
        """Extract articles from newsletter emails."""
        articles = []
        seen_urls = set()

        for email_data in emails:
            body = email_data.get("body", "")
            sender_domain = email_data.get("sender_domain", "")
            date_str = email_data.get("date")

            source = determine_source(sender_domain)

            # Extract links from HTML body
            links = extract_links_from_html(body)

            for link in links:
                url = link["url"]
                title = link["text"]

                # Skip duplicates
                if url in seen_urls:
                    continue

                # Skip navigation/subscription links
                skip_patterns = [
                    "unsubscribe", "desinscription", "privacy", "confidentialite",
                    "facebook.com", "twitter.com", "linkedin.com", "youtube.com",
                    "play.google.com", "apps.apple.com", "mailto:",
                ]
                if any(skip in url.lower() for skip in skip_patterns):
                    continue

                # Filter for formation-related content
                text_lower = title.lower()
                if not any(kw in text_lower for kw in FORMATION_KEYWORDS):
                    continue

                seen_urls.add(url)

                articles.append({
                    "source": source,
                    "source_id": make_source_id(source, url),
                    "title": title[:500],
                    "url": url,
                    "content": None,
                    "published_date": date_str,
                    "category": determine_category(title),
                    "status": "new",
                    "acheteur": sender_domain,
                    "region": None,
                })

        return articles

    def collect(self) -> list[dict]:
        """Main collection method."""
        articles = []

        if not self.connect():
            return articles

        try:
            emails = self.get_newsletter_emails(days_back=30)
            self.logger.info(f"Found {len(emails)} newsletter emails")

            articles = self.extract_articles_from_emails(emails)
            self.logger.info(f"Extracted {len(articles)} articles from newsletters")

        except Exception as e:
            self.logger.error(f"Error during collection: {e}")
        finally:
            self.disconnect()

        return articles


def test_connection(email_address: str, app_password: str) -> bool:
    """Test Gmail IMAP connection."""
    try:
        imap = imaplib.IMAP4_SSL(IMAP_SERVER, IMAP_PORT)
        imap.login(email_address, app_password)
        imap.logout()
        print(f"✅ Connection successful for {email_address}")
        return True
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False


if __name__ == "__main__":
    import sys

    # Test mode
    if len(sys.argv) < 3:
        print("Usage: python gmail_newsletters.py <email> <app_password>")
        print("\nTo create an app password:")
        print("1. Go to https://myaccount.google.com/apppasswords")
        print("2. Sign in with your Google account")
        print("3. Create a new app password named 'Cipia'")
        print("4. Use the 16-character password shown")
        sys.exit(1)

    email_addr = sys.argv[1]
    password = sys.argv[2]

    # Test connection
    print(f"\nTesting Gmail connection for {email_addr}...")
    if test_connection(email_addr, password):
        print("\n✅ Gmail IMAP connection works!")
        print("\nYou can now use this collector in the main collection pipeline.")
    else:
        print("\n❌ Please check your email and app password.")
