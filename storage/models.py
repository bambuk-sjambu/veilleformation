"""Data classes for VeilleFormation.fr entities."""

from dataclasses import dataclass, field
from datetime import datetime, date
from typing import Optional


@dataclass
class Article:
    """Represents a collected article from any source."""

    source: str
    source_id: str
    title: str
    url: Optional[str] = None
    content: Optional[str] = None
    published_date: Optional[date] = None
    collected_at: Optional[datetime] = None
    category: Optional[str] = None
    status: str = "new"
    summary: Optional[str] = None
    impact_level: Optional[str] = None
    impact_justification: Optional[str] = None
    qualiopi_indicators: Optional[str] = None
    qualiopi_justification: Optional[str] = None
    relevance_score: Optional[int] = None
    typologie_ao: Optional[str] = None
    acheteur: Optional[str] = None
    region: Optional[str] = None
    montant_estime: Optional[float] = None
    date_limite: Optional[date] = None
    cpv_code: Optional[str] = None
    processed_at: Optional[datetime] = None
    sent_in_newsletter_id: Optional[int] = None
    is_read: int = 0
    is_starred: int = 0
    id: Optional[int] = None

    def to_dict(self) -> dict:
        """Convert to dictionary for database insertion."""
        d = {}
        for key, value in self.__dict__.items():
            if key == "id" and value is None:
                continue
            if isinstance(value, (date, datetime)):
                d[key] = value.isoformat()
            else:
                d[key] = value
        return d


@dataclass
class Newsletter:
    """Represents a newsletter edition."""

    edition_number: int
    subject: str
    html_content: Optional[str] = None
    sent_at: Optional[datetime] = None
    recipients_count: int = 0
    brevo_campaign_id: Optional[str] = None
    open_rate: Optional[float] = None
    click_rate: Optional[float] = None
    unsubscribe_count: int = 0
    archive_url: Optional[str] = None
    id: Optional[int] = None


@dataclass
class Subscriber:
    """Represents an email subscriber."""

    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    organisme: Optional[str] = None
    region: Optional[str] = None
    plan: str = "gratuit"
    brevo_contact_id: Optional[str] = None
    subscribed_at: Optional[datetime] = None
    unsubscribed_at: Optional[datetime] = None
    is_active: int = 1
    id: Optional[int] = None
