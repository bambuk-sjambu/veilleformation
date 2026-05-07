"""Newsletter generator (paramétrable par secteur).

Selects processed articles, renders a responsive HTML email,
and marks articles as sent once the newsletter is dispatched.

Refactor multi-secteur A.6 : tous les libellés utilisateur (sujet, header,
sections, footer, CTA) sont lus depuis `sector.newsletter` plutôt que
hardcodés. Les couleurs (CSS) restent en dur — non user-facing.
"""

import json
import logging
import sqlite3
from datetime import date, datetime
from typing import Optional

from jinja2 import Template

from config import load_sector
from storage.database import get_connection

logger = logging.getLogger("veille.newsletter")


# ---------------------------------------------------------------------------
# Impact ordering helper
# ---------------------------------------------------------------------------
IMPACT_ORDER = {"fort": 0, "moyen": 1, "faible": 2}

# Couleurs CSS — pas user-facing donc hardcodées (cohérent avec les classes
# Tailwind/styles utilisés par le frontend).
IMPACT_COLORS = {
    "fort": "#DC2626",
    "moyen": "#F59E0B",
    "faible": "#10B981",
}

# Fallback hardcoded — la source de vérité est `sector.newsletter.impactLabels`.
# Ce dict est conservé pour des cas où la config ne serait pas disponible
# (tests bas niveau, scripts utilitaires).
IMPACT_LABELS = {
    "fort": "Fort",
    "moyen": "Moyen",
    "faible": "Faible",
}


# ---------------------------------------------------------------------------
# Templating helper
# ---------------------------------------------------------------------------

def _render_tpl(tpl: str, **kwargs) -> str:
    """Substitution {placeholder} -> value, robuste aux placeholders inconnus.

    Évite str.format() qui crashe sur un placeholder inattendu, et qui n'aime
    pas les accolades littérales dans le texte.
    """
    out = tpl
    for key, value in kwargs.items():
        out = out.replace("{" + key + "}", str(value))
    return out


# ---------------------------------------------------------------------------
# Article selection
# ---------------------------------------------------------------------------

def select_articles_for_newsletter(
    db_path: str,
    week_start: date,
    week_end: date,
    sector_id: Optional[str] = None,
) -> dict:
    """Query eligible articles and group them by newsletter section.

    Only articles with status='done' that have not yet been included in a
    newsletter and whose published_date falls within the given range are
    considered. If `sector_id` is provided, the query is filtered on
    articles.sector_id (pivot multi-personas C.5).

    Returns a dict with keys: reglementaire, ao, metier, handicap, stats.
    Returns an empty dict (with stats total=0) when no articles are found.
    """
    conn = get_connection(db_path)
    try:
        if sector_id:
            rows = conn.execute(
                """
                SELECT *
                FROM articles
                WHERE status = 'done'
                  AND sent_in_newsletter_id IS NULL
                  AND published_date BETWEEN ? AND ?
                  AND sector_id = ?
                ORDER BY published_date DESC
                """,
                (str(week_start), str(week_end), sector_id),
            ).fetchall()
        else:
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

    # Unpack extra_meta fields into each article dict so that
    # template variables (art.date_limite, art.region, etc.) resolve.
    for art in articles:
        try:
            meta = json.loads(art.get("extra_meta") or "{}")
        except (json.JSONDecodeError, TypeError):
            meta = {}
        for field, value in meta.items():
            if art.get(field) is None:
                art[field] = value

    # ----- Group into sections -----

    reglementaire = []
    ao = []
    metier = []
    handicap = []

    for art in articles:
        indicators = _parse_indicators(art.get("taxonomy_indicators"))

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
    """Parse taxonomy_indicators stored as JSON list or comma-separated string."""
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
    sector_id: Optional[str] = None,
) -> str:
    """Generate the email subject line.

    Sujet et pr\u00e9fixe haut-impact lus depuis `sector.newsletter.subject`.
    Format Cipia par d\u00e9faut : "Cipia #N \u2014 X textes, Y appels d'offres"
    avec pr\u00e9fixe "\u26a0\ufe0f Impact fort \u2014 " quand has_high_impact.

    `sector_id` permet de forcer le secteur (pivot C.5). Sinon, env SECTOR
    ou fallback "cipia".
    """
    sector = load_sector(sector_id)
    nl_subject = sector.newsletter.subject

    nb_textes = stats.get("reglementaire", 0) + stats.get("metier", 0) + stats.get("handicap", 0)
    nb_ao = stats.get("ao", 0)

    subject = _render_tpl(
        nl_subject.template,
        brandName=sector.brand.name,
        edition=edition_number,
        nbTextes=nb_textes,
        textesPlural="s" if nb_textes != 1 else "",
        nbAo=nb_ao,
        aoPlural="s" if nb_ao != 1 else "",
    )

    if has_high_impact:
        subject = nl_subject.highImpactPrefix + subject

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
<title>{{ header_title }} #{{ edition_number }}</title>
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
  <h1 style="margin:0;font-size:24px;color:#FFFFFF;font-weight:700;">{{ header_title }}</h1>
  <p style="margin:8px 0 0;font-size:14px;color:#BFDBFE;">
    {{ header_edition_line }}
  </p>
  <p style="margin:10px 0 0;font-size:12px;">
    <a href="{{ archive_url }}" style="color:#93C5FD;text-decoration:underline;">{{ header_view_online_label }}</a>
  </p>
</td>
</tr>

<!-- Intro -->
<tr>
<td style="padding:24px 32px 8px;">
  <p style="margin:0;font-size:14px;color:#6B7280;line-height:1.5;">
    {{ intro_html|safe }}
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
      <h2 style="margin:0;font-size:18px;color:#1E40AF;">{{ section_reglementaire.title }}</h2>
      <p style="margin:2px 0 0;font-size:12px;color:#6B7280;">{{ section_reglementaire.subtitle }}</p>
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
    <p style="margin:0;font-size:12px;"><a href="{{ art.url }}" style="color:#1E40AF;text-decoration:underline;">{{ section_reglementaire.readMoreLabel }}</a></p>
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
      <h2 style="margin:0;font-size:18px;color:#92400E;">{{ section_ao.title }}</h2>
      <p style="margin:2px 0 0;font-size:12px;color:#6B7280;">{{ section_ao_subtitle }}</p>
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
      <td style="padding-right:16px;"><strong>{{ ao_labels.deadline }}</strong> {{ art.date_limite }}</td>
      {% endif %}
      {% if art.montant_estime %}
      <td style="padding-right:16px;"><strong>{{ ao_labels.amount }}</strong> {{ "%.0f"|format(art.montant_estime) }} &euro;</td>
      {% endif %}
      {% if art.region %}
      <td style="padding-right:16px;"><strong>{{ ao_labels.region }}</strong> {{ art.region }}</td>
      {% endif %}
      {% if art.relevance_score %}
      <td><strong>{{ ao_labels.score }}</strong> {{ art.relevance_score }}/10</td>
      {% endif %}
    </tr>
    </table>
    {% if art.url %}
    <p style="margin:8px 0 0;font-size:12px;"><a href="{{ art.url }}" style="color:#92400E;text-decoration:underline;">{{ section_ao.readMoreLabel }}</a></p>
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
      <h2 style="margin:0;font-size:18px;color:#065F46;">{{ section_metier.title }}</h2>
      <p style="margin:2px 0 0;font-size:12px;color:#6B7280;">{{ section_metier.subtitle }}</p>
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
    <p style="margin:0;font-size:12px;"><a href="{{ art.url }}" style="color:#065F46;text-decoration:underline;">{{ section_metier.readMoreLabel }}</a></p>
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
      <h2 style="margin:0;font-size:18px;color:#5B21B6;">{{ section_handicap.title }}</h2>
      <p style="margin:2px 0 0;font-size:12px;color:#6B7280;">{{ section_handicap.subtitle }}</p>
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
    <p style="margin:0;font-size:12px;"><a href="{{ art.url }}" style="color:#5B21B6;text-decoration:underline;">{{ section_handicap.readMoreLabel }}</a></p>
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
    <p style="margin:0;font-size:12px;color:#1E40AF;font-weight:700;text-transform:uppercase;letter-spacing:1px;">{{ stat_block_label }}</p>
    <p style="margin:8px 0;font-size:36px;font-weight:700;color:#1E40AF;">{{ stats.total }}</p>
    <p style="margin:0;font-size:13px;color:#374151;">{{ stat_block_caption }}</p>
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
      <a href="{{ cta_url }}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;">{{ cta_label }}</a>
    </td>
  </tr>
  </table>
</td>
</tr>

<!-- ===== FOOTER ===== -->
<tr>
<td style="background-color:#F9FAFB;padding:20px 32px;border-top:1px solid #E5E7EB;">
  <p style="margin:0 0 6px;font-size:12px;color:#9CA3AF;text-align:center;">
    {{ footer_disclaimer_html|safe }}
  </p>
  <p style="margin:8px 0 0;font-size:12px;color:#9CA3AF;text-align:center;">
    <a href="{{ unsubscribe_url }}" style="color:#6B7280;text-decoration:underline;">{{ footer_unsubscribe_label }}</a>
    &nbsp;&bull;&nbsp;
    <a href="mailto:{{ footer_contact_email }}" style="color:#6B7280;text-decoration:underline;">{{ footer_contact_label }}</a>
    &nbsp;&bull;&nbsp;
    <a href="{{ footer_site_url }}" style="color:#6B7280;text-decoration:underline;">{{ footer_site_label }}</a>
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
    sector_id: Optional[str] = None,
) -> str:
    """Render the newsletter HTML from grouped articles.

    `sector_id` force la config secteur (pivot C.5). Sinon env SECTOR ou
    fallback "cipia".

    Raises:
        ValueError: When there are zero articles across all sections.
    """
    stats = articles.get("stats", {})
    if stats.get("total", 0) == 0:
        raise ValueError("Impossible de generer une newsletter sans articles.")

    sector = load_sector(sector_id)
    nl = sector.newsletter
    domain = sector.brand.domain
    audience = sector.vocab.audience
    brand_name = sector.brand.name
    regulator_name = sector.vocab.regulatorName

    template = Template(NEWSLETTER_TEMPLATE)

    nl_impact_labels = {
        "fort": nl.impactLabels.fort,
        "moyen": nl.impactLabels.moyen,
        "faible": nl.impactLabels.faible,
    }

    def _impact_color(level: Optional[str]) -> str:
        return IMPACT_COLORS.get(level or "faible", "#10B981")

    def _impact_label(level: Optional[str]) -> str:
        return nl_impact_labels.get(level or "faible", nl.impactLabels.faible)

    # Format dates in French style (DD/MM/YYYY)
    from datetime import datetime as _dt
    if isinstance(date_debut, str):
        date_debut = _dt.strptime(date_debut, "%Y-%m-%d")
    if isinstance(date_fin, str):
        date_fin = _dt.strptime(date_fin, "%Y-%m-%d")
    date_debut_fmt = date_debut.strftime("%d/%m/%Y")
    date_fin_fmt = date_fin.strftime("%d/%m/%Y")

    # Templates rendus côté Python pour éviter de fuiter Jinja dans la config.
    header_edition_line = _render_tpl(
        nl.header.editionLine,
        edition=edition_number,
        dateStart=date_debut_fmt,
        dateEnd=date_fin_fmt,
    )
    intro_html = _render_tpl(nl.intro, audience=audience)

    nb_ao = len(articles.get("ao", []))
    section_ao_subtitle = _render_tpl(
        nl.sections.ao.subtitle,
        count=nb_ao,
        plural="s" if nb_ao != 1 else "",
    )

    cta_url = _render_tpl(nl.cta.urlTemplate, domain=domain, brandName=brand_name)
    stat_block_caption = _render_tpl(
        nl.statBlock.caption,
        regulatorName=regulator_name,
        brandName=brand_name,
    )

    # Si l'appelant fournit un `unsubscribe_url` non-default, on garde sa valeur ;
    # sinon on utilise le template footer (qui par défaut redonne la balise Brevo).
    if unsubscribe_url == "{{unsubscribe}}":
        unsubscribe_url_final = _render_tpl(
            nl.footer.unsubscribeUrlTemplate,
            unsubscribeToken="{{unsubscribe}}",
        )
    else:
        unsubscribe_url_final = unsubscribe_url

    footer_contact_email = _render_tpl(nl.footer.contactEmail, domain=domain)
    footer_site_url = _render_tpl(nl.footer.siteUrl, domain=domain)

    # Conversion des dataclasses sections en dicts pour Jinja (accès .title etc.)
    def _section_to_dict(s):
        return {
            "title": s.title,
            "subtitle": s.subtitle,
            "readMoreLabel": s.readMoreLabel,
        }

    html = template.render(
        reglementaire=articles.get("reglementaire", []),
        ao=articles.get("ao", []),
        metier=articles.get("metier", []),
        handicap=articles.get("handicap", []),
        stats=stats,
        edition_number=edition_number,
        unsubscribe_url=unsubscribe_url_final,
        archive_url=archive_url,
        impact_color=_impact_color,
        impact_label=_impact_label,
        # Header
        header_title=nl.header.title,
        header_edition_line=header_edition_line,
        header_view_online_label=nl.header.viewOnlineLabel,
        # Intro
        intro_html=intro_html,
        # Sections
        section_reglementaire=_section_to_dict(nl.sections.reglementaire),
        section_ao=_section_to_dict(nl.sections.ao),
        section_ao_subtitle=section_ao_subtitle,
        section_metier=_section_to_dict(nl.sections.metier),
        section_handicap=_section_to_dict(nl.sections.handicap),
        # AO labels
        ao_labels={
            "deadline": nl.aoLabels.deadline,
            "amount": nl.aoLabels.amount,
            "region": nl.aoLabels.region,
            "score": nl.aoLabels.score,
        },
        # Stat block
        stat_block_label=nl.statBlock.label,
        stat_block_caption=stat_block_caption,
        # CTA
        cta_label=nl.cta.label,
        cta_url=cta_url,
        # Footer
        footer_disclaimer_html=nl.footer.disclaimer,
        footer_unsubscribe_label=nl.footer.unsubscribeLabel,
        footer_contact_email=footer_contact_email,
        footer_contact_label=nl.footer.contactLabel,
        footer_site_url=footer_site_url,
        footer_site_label=nl.footer.siteLabel,
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
    sector_id: Optional[str] = None,
) -> Optional[dict]:
    """End-to-end newsletter creation.

    1. Selects articles for the period (filtré par sector_id si fourni).
    2. Generates subject and HTML (avec config secteur correspondante).
    3. Inserts the newsletter record in the DB (avec sector_id).
    4. Returns newsletter metadata (does NOT mark articles as sent yet --
       that should happen after Brevo confirms dispatch).

    Returns None if no articles are available.
    """
    articles = select_articles_for_newsletter(
        db_path, week_start, week_end, sector_id=sector_id
    )
    stats = articles["stats"]

    if stats["total"] == 0:
        logger.info(
            "Aucun article pour la periode %s - %s (secteur=%s)",
            week_start, week_end, sector_id or "all",
        )
        return None

    has_high_impact = any(
        a.get("impact_level") == "fort"
        for a in articles.get("reglementaire", [])
    )

    subject = generate_newsletter_subject(
        edition_number, stats, week_start, week_end, has_high_impact,
        sector_id=sector_id,
    )
    html = generate_newsletter_html(
        articles, week_start, week_end, edition_number, unsubscribe_url,
        sector_id=sector_id,
    )

    # Collect all article IDs for later marking
    all_ids = []
    for section in ("reglementaire", "ao", "metier", "handicap"):
        all_ids.extend(a["id"] for a in articles.get(section, []))

    # Insert newsletter record (avec sector_id, fallback 'cipia' au niveau DB)
    conn = get_connection(db_path)
    try:
        if sector_id:
            cursor = conn.execute(
                """
                INSERT INTO newsletters (edition_number, subject, html_content, sector_id)
                VALUES (?, ?, ?, ?)
                """,
                (edition_number, subject, html, sector_id),
            )
        else:
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
