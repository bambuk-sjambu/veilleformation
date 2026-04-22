#!/usr/bin/env python3
"""
VeilleFormation.fr - Notificateur Telegram pour le blog
Envoie un rapport Telegram apres la generation des articles.

Usage: python scripts/telegram_blog.py [--generate-json '...' --verify-json '...']

Le script lit les summaries JSON produits par generate_blog.py et verify_blog.py
depuis stdin (recherche les blocs delimites), ou accepte des chemins de fichiers.
"""

import json
import logging
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import URLError
import urllib.parse

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
LOG_DIR = PROJECT_ROOT / "logs"

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("telegram_blog")

# ---------------------------------------------------------------------------
# Telegram helpers
# ---------------------------------------------------------------------------
TELEGRAM_API = "https://api.telegram.org/bot{token}/sendMessage"
MAX_MESSAGE_LENGTH = 4096


def send_telegram_message(token: str, chat_id: str, text: str) -> bool:
    """Send a message via Telegram Bot API. Returns True on success."""
    url = TELEGRAM_API.format(token=token)

    # Truncate if needed
    if len(text) > MAX_MESSAGE_LENGTH:
        text = text[: MAX_MESSAGE_LENGTH - 50] + "\n\n[... message tronque]"

    payload = json.dumps(
        {"chat_id": chat_id, "text": text, "parse_mode": "HTML"}
    ).encode("utf-8")

    req = Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urlopen(req, timeout=15) as resp:
            body = json.loads(resp.read().decode("utf-8"))
            if body.get("ok"):
                logger.info("Telegram message sent successfully.")
                return True
            else:
                logger.error("Telegram API returned error: %s", body)
                return False
    except URLError as exc:
        logger.error("Failed to send Telegram message: %s", exc)
        return False


# ---------------------------------------------------------------------------
# Message builder
# ---------------------------------------------------------------------------
def build_message(generate_summary: dict, verify_summary: dict) -> str:
    today_str = datetime.now().strftime("%d/%m/%Y")

    generated = generate_summary.get("generated", [])
    gen_failed = generate_summary.get("failed", [])
    cost_eur = generate_summary.get("total_cost_eur", 0.0)

    verified = verify_summary.get("verified", [])
    ver_failed = verify_summary.get("failed", [])
    total_published = verify_summary.get("total_published_in_db", 0)

    # Count stats
    total_ok = len(verified)
    total_fail_gen = len(gen_failed)
    total_fail_ver = len(ver_failed)

    # Header
    if total_ok > 0:
        header_icon = "Nouveau"
    else:
        header_icon = "Attention"

    lines = [
        f"<b>{header_icon} VeilleFormation.fr — Blog du {today_str}</b>",
        "",
    ]

    # Successfully verified articles
    if verified:
        lines.append(f"<b>Articles publiés et vérifiés ({total_ok}) :</b>")
        for i, art in enumerate(verified, 1):
            url_display = f"veilleformation.fr/blog/{art['slug']}"
            words = art.get("word_count", 0)
            read_time = art.get("read_time", "?")
            funnel = art.get("funnel", "")
            cluster = art.get("cluster", "")
            lines.append(
                f"\n{i}. {art['title']}\n"
                f"   {url_display}\n"
                f"   {words} mots | {read_time} | {funnel} | {cluster}"
            )
    else:
        lines.append("Aucun article publié et vérifié aujourd'hui.")

    lines.append("")

    # Generation failures
    if gen_failed:
        lines.append(f"<b>Erreurs de génération ({total_fail_gen}) :</b>")
        for art in gen_failed:
            lines.append(f"  - {art.get('title', art.get('slug', '?'))}")
        lines.append("")

    # Verification failures (generated but not yet live)
    if ver_failed:
        lines.append(f"<b>Articles générés mais non vérifiés ({total_fail_ver}) :</b>")
        for art in ver_failed:
            status = art.get("status_code", "?")
            lines.append(f"  - {art['title']} (HTTP {status})")
        lines.append("")

    # Stats footer
    lines.append(f"Total publié dans la base : <b>{total_published} articles</b>")
    if cost_eur > 0:
        lines.append(f"Coût génération : ~{cost_eur:.2f}€")

    # Next run info
    lines.append("Prochain article : demain 8h00")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# JSON extraction helpers
# ---------------------------------------------------------------------------
def extract_json_block(text: str, start_marker: str, end_marker: str) -> dict:
    """Extract a JSON block from text between two markers."""
    pattern = re.escape(start_marker) + r"(.*?)" + re.escape(end_marker)
    match = re.search(pattern, text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except json.JSONDecodeError:
            pass
    return {}


def load_summary_from_log(log_path: Path, start_marker: str, end_marker: str) -> dict:
    """Load a JSON summary from a log file containing marker blocks."""
    if not log_path.exists():
        return {}
    content = log_path.read_text(encoding="utf-8", errors="replace")
    return extract_json_block(content, start_marker, end_marker)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> None:
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID", "")

    if not token or token == "PLACEHOLDER_SETUP_REQUIRED":
        logger.error("TELEGRAM_BOT_TOKEN not configured. Set it in your .env file.")
        sys.exit(1)
    if not chat_id or chat_id == "PLACEHOLDER_SETUP_REQUIRED":
        logger.error("TELEGRAM_CHAT_ID not configured. Set it in your .env file.")
        sys.exit(1)

    today = datetime.now().strftime("%Y%m%d")
    log_path = LOG_DIR / f"blog_{today}.log"

    # Load both summaries from today's log file
    generate_summary = load_summary_from_log(
        log_path,
        "--- BLOG_SUMMARY_JSON ---",
        "--- END_BLOG_SUMMARY_JSON ---",
    )
    verify_summary = load_summary_from_log(
        log_path,
        "--- VERIFY_SUMMARY_JSON ---",
        "--- END_VERIFY_SUMMARY_JSON ---",
    )

    if not generate_summary and not verify_summary:
        logger.warning(
            "No summary data found in log file %s. Sending generic message.", log_path
        )
        generate_summary = {"generated": [], "failed": [], "total_cost_eur": 0.0}
        verify_summary = {"verified": [], "failed": [], "total_published_in_db": 0}

    message = build_message(generate_summary, verify_summary)
    logger.info("Sending Telegram notification:\n%s", message)
    send_telegram_message(token, chat_id, message)


if __name__ == "__main__":
    main()
