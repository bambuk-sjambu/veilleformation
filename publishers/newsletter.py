"""Newsletter generator for Cipia.

Selects processed articles, renders a responsive HTML email,
and marks articles as sent once the newsletter is dispatched.
"""

import json
import logging
import sqlite3
from datetime import date, datetime
from typing import Optional

from jinja2 import Template

from storage.database import get_connection

logger = logging.getLogger("veille.newsletter")


# ---------------------------------------------------------------------------
# Impact ordering helper
# ---------------------------------------------------------------------------
IMPACT_ORDER = {"fort": 0, "moyen": 1, "faible": 2}

IMPACT_COLORS = {
    "fort": "#DC2626",
    "moyen": "#F59E0B",
    "faible": "#10B981",
}

IMPACT_LABELS = {
    "fort": "Fort",
    "moyen": "Moyen",
    "faible": "Faible",
}


# ---------------------------------------------------------------------------
# Article selection
# ---------------------------------------------------------------------------

def select_articles_for_newsletter(
    db_path: str,
    week_start: date,
    week_end: date,
) -> dict:
    """Query eligible articles and group them by newsletter section.

    Only articles with status='done' that have not yet been included in a
    newsletter and whose published_date falls within the given range are
    considered.

    Returns a dict with keys: reglementaire, ao, metier, handicap, stats.
    Returns an empty dict (with stats total=0) when no articles are found.
    """
    conn = get_connection(db_path)
    try:
        rows = conn.execute(
            """
            SELECT *
            FROM articles
            WHERE status = 'done'
              AND sent_in_newsletter_id IS NULL
              AND published_date BETWEEN ? AND ?
            ORDER BY published_date DESC
            """,
            (str(week_start), str(week_end)),
        ).fetchall()
        articles = [dict(r) for r in rows]
    finally:
        conn.close()

    # ----- Group into sections -----

    reglementaire = []
    ao = []
    metier = []
    handicap = []

    for art in articles:
        indicators = _parse_indicators(art.get("qualiopi_indicators"))

        # Handicap section: indicator 26, any relevant category
        if 26 in indicators and art.get("category") in ("metier", "reglementaire"):
            handicap.append(art)
            continue

        if art.get("category") == "reglementaire":
            reglementaire.append(art)
        elif art.get("category") == "ao":
            ao.append(art)
        elif art.get("category") == "metier":
            if indicators & {24, 25}:
                metier.append(art)
            else:
                metier.append(art)

    # ----- Sort and limit -----

    # Reglementaire: by impact (fort first), max 5
    reglementaire.sort(key=lambda a: IMPACT_ORDER.get(a.get("impact_level", "faible"), 2))
    reglementaire = reglementaire[:5]

    # AO: by date_limite ASC (nulls last), then relevance_score DESC, max 10
    def _ao_sort_key(a):
        dl = a.get("date_limite") or "9999-12-31"
        score = a.get("relevance_score") or 0
        return (dl, -score)

    ao.sort(key=_ao_sort_key)
    ao = ao[:10]

    # Metier: max 3, by relevance_score DESC
    metier.sort(key=lambda a: -(a.get("relevance_score") or 0))
    metier = metier[:3]

    # Handicap: max 2, by relevance_score DESC
    handicap.sort(key=lambda a: -(a.get("relevance_score") or 0))
    handicap = handicap[:2]

    total = len(reglementaire) + len(ao) + len(metier) + len(handicap)

    return {
        "reglementaire": reglementaire,
        "ao": ao,
        "metier": metier,
        "handicap": handicap,
        "stats": {
            "total": total,
            "reglementaire": len(reglementaire),
            "ao": len(ao),
            "metier": len(metier),
            "handicap": len(handicap),
        },
    }


def _parse_indicators(raw: Optional[str]) -> set[int]:
    """Parse qualiopi_indicators stored as JSON list or comma-separated string."""
    if not raw:
        return set()
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return {int(i) for i in parsed}
    except (json.JSONDecodeError, TypeError, ValueError):
        pass
    # Fallback: comma-separated
    try:
        return {int(x.strip()) for x in raw.split(",") if x.strip().isdigit()}
    except Exception:
        return set()


# ---------------------------------------------------------------------------
# Subject line
# ---------------------------------------------------------------------------

def generate_newsletter_subject(
    edition_number: int,
    stats: dict,
    date_debut: date,
    date_fin: date,
    has_high_impact: bool,
) -> str:
    """Generate the email subject line.

    Format: 'Cipia #N -- X textes, Y appels d'offres'
    Prefixed with a warning emoji when a high-impact text is present.
    """
    nb_textes = stats.get("reglementaire", 0) + stats.get("metier", 0) + stats.get("handicap", 0)
    nb_ao = stats.get("ao", 0)

    subject = f"Cipia #{edition_number} \u2014 {nb_textes} texte{'s' if nb_textes != 1 else ''}, {nb_ao} appel{'s' if nb_ao != 1 else ''} d'offres"

    if has_high_impact:
        subject = f"\u26a0\ufe0f Impact fort \u2014 {subject}"

    return subject


# ---------------------------------------------------------------------------
# HTML generation
# ---------------------------------------------------------------------------

# Inline-CSS HTML template, Gmail/Outlook compatible.
# Uses Jinja2 syntax.  Kept under ~12 KB when rendered with typical content.

NEWSLETTER_TEMPLATE = """\
<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Cipia #{{ edition_number }}</title>
</head>
<body style="margin:0;padding:0;background-color:#F3F4F6;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<!-- Wrapper -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F3F4F6;">
<tr><td align="center" style="padding:24px 12px;">

<!-- Main container -->
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:8px;overflow:hidden;">

<!-- ===== HEADER ===== -->
<tr>
<td style="background-color:#1E40AF;padding:28px 32px;text-align:center;">
  <h1 style="margin:0;font-size:24px;color:#FFFFFF;font-weight:700;">Cipia</h1>
  <p style="margin:8px 0 0;font-size:14px;color:#BFDBFE;">
    Edition #{{ edition_number }} &mdash; {{ date_debut_fmt }} au {{ date_fin_fmt }}
  </p>
  <p style="margin:10px 0 0;font-size:12px;">
    <a href="{{ archive_url }}" style="color:#93C5FD;text-decoration:underline;">Voir en ligne</a>
  </p>
</td>
</tr>

<!-- Intro -->
<tr>
<td style="padding:24px 32px 8px;">
  <p style="margin:0;font-size:14px;color:#6B7280;line-height:1.5;">
    Bonjour,<br/>Voici votre veille reglementaire et appels d'offres de la semaine
    pour les organismes de formation certifies Qualiopi.
  </p>
</td>
</tr>

{% if reglementaire %}
<!-- ===== SECTION REGLEMENTAIRE ===== -->
<tr>
<td style="padding:16px 32px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="border-bottom:3px solid #1E40AF;padding-bottom:6px;">
      <h2 style="margin:0;font-size:18px;color:#1E40AF;">Veille reglementaire</h2>
      <p style="margin:2px 0 0;font-size:12px;color:#6B7280;">Indicateur 23 Qualiopi</p>
    </td>
  </tr>
  </table>
</td>
</tr>
{% for art in reglementaire %}
<tr>
<td style="padding:12px 32px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-left:4px solid {{ impact_color(art.impact_level) }};padding-left:12px;">
  <tr><td>
    <p style="margin:0 0 4px;">
      <span style="display:inline-block;padding:2px 8px;font-size:11px;font-weight:700;color:#FFFFFF;background-color:{{ impact_color(art.impact_level) }};border-radius:3px;">{{ impact_label(art.impact_level) }}</span>
    </p>
    <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#111827;line-height:1.3;">{{ art.title }}</p>
    <p style="margin:0 0 6px;font-size:13px;color:#374151;line-height:1.5;">{{ art.summary or '' }}</p>
    {% if art.url %}
    <p style="margin:0;font-size:12px;"><a href="{{ art.url }}" style="color:#1E40AF;text-decoration:underline;">Lire le texte original &rarr;</a></p>
    {% endif %}
  </td></tr>
  </table>
</td>
</tr>
{% endfor %}
{% endif %}

{% if ao %}
<!-- ===== SECTION APPELS D'OFFRES ===== -->
<tr>
<td style="padding:24px 32px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="border-bottom:3px solid #F59E0B;padding-bottom:6px;">
      <h2 style="margin:0;font-size:18px;color:#92400E;">Appels d'offres formation</h2>
      <p style="margin:2px 0 0;font-size:12px;color:#6B7280;">{{ ao|length }} opportunite{{ 's' if ao|length != 1 else '' }} cette semaine</p>
    </td>
  </tr>
  </table>
</td>
</tr>
{% for art in ao %}
<tr>
<td style="padding:12px 32px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FFFBEB;border-radius:6px;padding:12px;">
  <tr><td style="padding:12px;">
    <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#111827;line-height:1.3;">{{ art.title }}</p>
    <p style="margin:0 0 6px;font-size:13px;color:#374151;line-height:1.5;">{{ art.summary or '' }}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-size:12px;color:#6B7280;">
    <tr>
      {% if art.date_limite %}
      <td style="padding-right:16px;"><strong>Limite :</strong> {{ art.date_limite }}</td>
      {% endif %}
      {% if art.montant_estime %}
      <td style="padding-right:16px;"><strong>Montant :</strong> {{ "%.0f"|format(art.montant_estime) }} &euro;</td>
      {% endif %}
      {% if art.region %}
      <td style="padding-right:16px;"><strong>Region :</strong> {{ art.region }}</td>
      {% endif %}
      {% if art.relevance_score %}
      <td><strong>Score :</strong> {{ art.relevance_score }}/10</td>
      {% endif %}
    </tr>
    </table>
    {% if art.url %}
    <p style="margin:8px 0 0;font-size:12px;"><a href="{{ art.url }}" style="color:#92400E;text-decoration:underline;">Voir le marche &rarr;</a></p>
    {% endif %}
  </td></tr>
  </table>
</td>
</tr>
{% endfor %}
{% endif %}

{% if metier %}
<!-- ===== SECTION METIER ===== -->
<tr>
<td style="padding:24px 32px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="border-bottom:3px solid #10B981;padding-bottom:6px;">
      <h2 style="margin:0;font-size:18px;color:#065F46;">Veille metier &amp; innovation</h2>
      <p style="margin:2px 0 0;font-size:12px;color:#6B7280;">Indicateurs 24 &amp; 25 Qualiopi</p>
    </td>
  </tr>
  </table>
</td>
</tr>
{% for art in metier %}
<tr>
<td style="padding:12px 32px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-left:4px solid #10B981;padding-left:12px;">
  <tr><td>
    <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#111827;line-height:1.3;">{{ art.title }}</p>
    <p style="margin:0 0 6px;font-size:13px;color:#374151;line-height:1.5;">{{ art.summary or '' }}</p>
    {% if art.url %}
    <p style="margin:0;font-size:12px;"><a href="{{ art.url }}" style="color:#065F46;text-decoration:underline;">En savoir plus &rarr;</a></p>
    {% endif %}
  </td></tr>
  </table>
</td>
</tr>
{% endfor %}
{% endif %}

{% if handicap %}
<!-- ===== SECTION HANDICAP ===== -->
<tr>
<td style="padding:24px 32px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="border-bottom:3px solid #7C3AED;padding-bottom:6px;">
      <h2 style="margin:0;font-size:18px;color:#5B21B6;">Handicap &amp; accessibilite</h2>
      <p style="margin:2px 0 0;font-size:12px;color:#6B7280;">Indicateur 26 Qualiopi</p>
    </td>
  </tr>
  </table>
</td>
</tr>
{% for art in handicap %}
<tr>
<td style="padding:12px 32px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-left:4px solid #7C3AED;padding-left:12px;">
  <tr><td>
    <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#111827;line-height:1.3;">{{ art.title }}</p>
    <p style="margin:0 0 6px;font-size:13px;color:#374151;line-height:1.5;">{{ art.summary or '' }}</p>
    {% if art.url %}
    <p style="margin:0;font-size:12px;"><a href="{{ art.url }}" style="color:#5B21B6;text-decoration:underline;">En savoir plus &rarr;</a></p>
    {% endif %}
  </td></tr>
  </table>
</td>
</tr>
{% endfor %}
{% endif %}

<!-- ===== LE CHIFFRE DE LA SEMAINE ===== -->
<tr>
<td style="padding:24px 32px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#EFF6FF;border-radius:8px;text-align:center;padding:20px;">
  <tr><td style="padding:20px;">
    <p style="margin:0;font-size:12px;color:#1E40AF;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Le chiffre de la semaine</p>
    <p style="margin:8px 0;font-size:36px;font-weight:700;color:#1E40AF;">{{ stats.total }}</p>
    <p style="margin:0;font-size:13px;color:#374151;">textes et appels d'offres analyses par notre IA pour vous faire gagner du temps sur votre veille Qualiopi.</p>
  </td></tr>
  </table>
</td>
</tr>

<!-- ===== CTA ===== -->
<tr>
<td style="padding:24px 32px;text-align:center;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
  <tr>
    <td style="background-color:#1E40AF;border-radius:6px;">
      <a href="https://cipia.fr" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;">Decouvrir tous les articles</a>
    </td>
  </tr>
  </table>
</td>
</tr>

<!-- ===== FOOTER ===== -->
<tr>
<td style="background-color:#F9FAFB;padding:20px 32px;border-top:1px solid #E5E7EB;">
  <p style="margin:0 0 6px;font-size:12px;color:#9CA3AF;text-align:center;">
    Cette newsletter est generee par IA (Claude) a partir de sources officielles.<br/>
    Les analyses d'impact sont fournies a titre indicatif et ne constituent pas un avis juridique.
  </p>
  <p style="margin:8px 0 0;font-size:12px;color:#9CA3AF;text-align:center;">
    <a href="{{ unsubscribe_url }}" style="color:#6B7280;text-decoration:underline;">Se desabonner</a>
    &nbsp;&bull;&nbsp;
    <a href="mailto:contact@cipia.fr" style="color:#6B7280;text-decoration:underline;">Contact</a>
    &nbsp;&bull;&nbsp;
    <a href="https://cipia.fr" style="color:#6B7280;text-decoration:underline;">Cipia</a>
  </p>
</td>
</tr>

</table>
<!-- /Main container -->

</td></tr>
</table>
<!-- /Wrapper -->

</body>
</html>
"""


def generate_newsletter_html(
    articles: dict,
    date_debut: date,
    date_fin: date,
    edition_number: int,
    unsubscribe_url: str = "{{unsubscribe}}",
    archive_url: str = "{{archive_url}}",
) -> str:
    """Render the newsletter HTML from grouped articles.

    Args:
        articles: Dict returned by select_articles_for_newsletter with keys
            reglementaire, ao, metier, handicap, stats.
        date_debut: Start of the reporting period.
        date_fin: End of the reporting period.
        edition_number: Sequential edition number.
        unsubscribe_url: Placeholder or real unsubscribe URL (Brevo tag).
        archive_url: URL to view the newsletter in a browser.

    Returns:
        Rendered HTML string, ready for sending via Brevo.

    Raises:
        ValueError: When there are zero articles across all sections.
    """
    stats = articles.get("stats", {})
    if stats.get("total", 0) == 0:
        raise ValueError("Impossible de generer une newsletter sans articles.")

    template = Template(NEWSLETTER_TEMPLATE)

    def _impact_color(level: Optional[str]) -> str:
        return IMPACT_COLORS.get(level or "faible", "#10B981")

    def _impact_label(level: Optional[str]) -> str:
        return IMPACT_LABELS.get(level or "faible", "Faible")

    # Format dates in French style (DD/MM/YYYY)
    from datetime import datetime as _dt
    if isinstance(date_debut, str):
        date_debut = _dt.strptime(date_debut, "%Y-%m-%d")
    if isinstance(date_fin, str):
        date_fin = _dt.strptime(date_fin, "%Y-%m-%d")
    date_debut_fmt = date_debut.strftime("%d/%m/%Y")
    date_fin_fmt = date_fin.strftime("%d/%m/%Y")

    html = template.render(
        reglementaire=articles.get("reglementaire", []),
        ao=articles.get("ao", []),
        metier=articles.get("metier", []),
        handicap=articles.get("handicap", []),
        stats=stats,
        edition_number=edition_number,
        date_debut_fmt=date_debut_fmt,
        date_fin_fmt=date_fin_fmt,
        unsubscribe_url=unsubscribe_url,
        archive_url=archive_url,
        impact_color=_impact_color,
        impact_label=_impact_label,
    )

    return html


# ---------------------------------------------------------------------------
# Mark as sent
# ---------------------------------------------------------------------------

def mark_articles_as_sent(
    article_ids: list[int],
    newsletter_id: int,
    db_path: str,
) -> None:
    """Update articles to record they were included in a newsletter.

    Sets sent_in_newsletter_id and changes status to 'sent' for all
    provided article IDs.
    """
    if not article_ids:
        return

    conn = get_connection(db_path)
    try:
        placeholders = ",".join("?" for _ in article_ids)
        conn.execute(
            f"""
            UPDATE articles
            SET sent_in_newsletter_id = ?,
                status = 'sent'
            WHERE id IN ({placeholders})
            """,
            [newsletter_id] + article_ids,
        )
        conn.commit()
        logger.info(
            "Marque %d articles comme envoyes (newsletter #%d)",
            len(article_ids),
            newsletter_id,
        )
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Convenience: full generation pipeline
# ---------------------------------------------------------------------------

def create_newsletter(
    db_path: str,
    week_start: date,
    week_end: date,
    edition_number: int,
    unsubscribe_url: str = "{{unsubscribe}}",
) -> Optional[dict]:
    """End-to-end newsletter creation.

    1. Selects articles for the period.
    2. Generates subject and HTML.
    3. Inserts the newsletter record in the DB.
    4. Returns newsletter metadata (does NOT mark articles as sent yet --
       that should happen after Brevo confirms dispatch).

    Returns None if no articles are available.
    """
    articles = select_articles_for_newsletter(db_path, week_start, week_end)
    stats = articles["stats"]

    if stats["total"] == 0:
        logger.info("Aucun article pour la periode %s - %s", week_start, week_end)
        return None

    has_high_impact = any(
        a.get("impact_level") == "fort"
        for a in articles.get("reglementaire", [])
    )

    subject = generate_newsletter_subject(
        edition_number, stats, week_start, week_end, has_high_impact
    )
    html = generate_newsletter_html(
        articles, week_start, week_end, edition_number, unsubscribe_url
    )

    # Collect all article IDs for later marking
    all_ids = []
    for section in ("reglementaire", "ao", "metier", "handicap"):
        all_ids.extend(a["id"] for a in articles.get(section, []))

    # Insert newsletter record
    conn = get_connection(db_path)
    try:
        cursor = conn.execute(
            """
            INSERT INTO newsletters (edition_number, subject, html_content)
            VALUES (?, ?, ?)
            """,
            (edition_number, subject, html),
        )
        conn.commit()
        newsletter_id = cursor.lastrowid
    finally:
        conn.close()

    html_size_kb = len(html.encode("utf-8")) / 1024
    logger.info(
        "Newsletter #%d generee: %d articles, %.1f KB, sujet='%s'",
        edition_number,
        stats["total"],
        html_size_kb,
        subject,
    )

    return {
        "newsletter_id": newsletter_id,
        "edition_number": edition_number,
        "subject": subject,
        "html": html,
        "html_size_kb": round(html_size_kb, 1),
        "article_ids": all_ids,
        "stats": stats,
        "has_high_impact": has_high_impact,
    }
