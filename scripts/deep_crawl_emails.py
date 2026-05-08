#!/usr/bin/env python3
"""Deep crawl emails — pour les OF dont email_status IS NULL.

Stratégie :
1. Charge tous les sites où email IS NULL et site_url IS NOT NULL.
2. Pour chaque site : BFS depth=2, max 50 pages internes, suivi liens contact/mentions en priorité.
3. Extrait emails (mailto + regex), accepte gmail/yahoo/free/etc. (= email pro de la PME).
4. Choisit le meilleur email (priorité : contact@/secretariat@/info@ > same_domain > gmail/yahoo).
5. UPDATE of_enrich SET email, email_source='deep_crawl', step='email_found'.

Usage :
    python3 scripts/deep_crawl_emails.py --limit 100        # test
    python3 scripts/deep_crawl_emails.py --all              # full batch (background)
    python3 scripts/deep_crawl_emails.py --resume           # reprendre où on s'était arrêté
"""

from __future__ import annotations

import argparse
import logging
import re
import sqlite3
import sys
import time
from collections import deque
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Optional
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

HERE = Path(__file__).resolve().parent.parent
DB_PATH = HERE / "data" / "of_enriched.sqlite"

HTTP_TIMEOUT = 10
USER_AGENT = "Mozilla/5.0 (compatible; CipiaBot/1.0; +https://cipia.fr/bot)"

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")

# Filtres : on garde gmail/yahoo/free etc. (email pro indiqué sur le site)
EMAIL_BLACKLIST_RE = re.compile(
    r"^(noreply|no-reply|postmaster|webmaster|webmestre|admin|support-?wp|wordpress|"
    r"mailer|notifications?|no_reply|donotreply|ne-?pas-?repondre|privacy|dpo|"
    r"abuse|hostmaster|security)@", re.I
)
EMAIL_LOCAL_PLACEHOLDERS = {
    "nomprenom", "nom.prenom", "prenom.nom", "votreemail", "votre.email",
    "tonemail", "ton.email", "monemail", "mon.email", "email",
    "exemple", "example", "test", "votre-nom",
}
EMAIL_NOISE_TLDS = {"png", "jpg", "jpeg", "gif", "svg", "webp", "ico",
                     "css", "js", "woff", "woff2", "ttf", "otf",
                     "mp4", "mp3", "webm", "pdf", "zip"}
EMAIL_EXT_BLACKLIST = {"sentry.io", "wixsite.com", "wordpress.com",
                        "jimdo.com", "wix.com", "weebly.com",
                        "example.com", "domain.com", "domain.fr",
                        "exemple.fr", "votre-domaine.fr",
                        "entreprise.fr", "societe.fr",
                        "rankplace.fr", "pages-1a-zone.com",
                        "2x.png", "3x.png"}

# Priorité sur le local part (plus haut = mieux)
LOCAL_PRIORITY = {
    "contact": 100, "secretariat": 95, "secretariat-general": 95,
    "accueil": 90, "info": 85, "infos": 85,
    "formation": 80, "formations": 80,
    "direction": 75, "directeur": 75, "direction-generale": 75,
    "hello": 70, "bonjour": 70,
    "rh": 60, "commercial": 60, "ventes": 60,
}

# Priorité de chemin pour BFS
PATH_PRIORITY = re.compile(
    r"contact|mentions|impressum|coordonnees|nous-trouver|legales|legal|"
    r"a-propos|about|qui-sommes|qui-nous-sommes|equipe|infos|footer",
    re.I,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
log = logging.getLogger("deep_crawl")


def _extract_emails(html: str) -> list[str]:
    """Extrait emails depuis HTML (mailto + regex + obfuscations simples)."""
    emails = []

    # 1. mailto: links
    soup = BeautifulSoup(html, "html.parser")
    for a in soup.find_all("a", href=True):
        if a["href"].lower().startswith("mailto:"):
            e = a["href"].split(":", 1)[1].split("?")[0].strip()
            if "@" in e:
                emails.append(e)

    # 2. Désobfuscation simple : (at), [at], {at}, " at ", (point), [point]
    deobf = html
    deobf = re.sub(r"\s*[\(\[\{]\s*at\s*[\)\]\}]\s*", "@", deobf, flags=re.I)
    deobf = re.sub(r"\s+at\s+", "@", deobf)
    deobf = re.sub(r"\s*[\(\[\{]\s*(?:dot|point)\s*[\)\]\}]\s*", ".", deobf, flags=re.I)
    deobf = re.sub(r"\s+(?:dot|point)\s+", ".", deobf, flags=re.I)

    # 3. Regex
    emails.extend(EMAIL_RE.findall(deobf))

    # Dédup + filtres
    seen, cleaned = set(), []
    for e in emails:
        e = e.strip().lower().rstrip(".,;:)>")
        if e in seen or "@" not in e:
            continue
        seen.add(e)
        if EMAIL_BLACKLIST_RE.match(e):
            continue
        local, _, domain = e.rpartition("@")
        if not domain:
            continue
        tld = domain.rsplit(".", 1)[-1]
        if tld.lower() in EMAIL_NOISE_TLDS:
            continue
        if local.isdigit() or local.lower() in EMAIL_LOCAL_PLACEHOLDERS:
            continue
        if any(domain == b or domain.endswith("." + b) for b in EMAIL_EXT_BLACKLIST):
            continue
        cleaned.append(e)
    return cleaned


def _score_email(email: str, site_host: str) -> int:
    """Score plus haut = meilleur email. Priorité : same_domain > pattern pro > generic."""
    local, _, domain = email.partition("@")
    score = 0
    # Bonus same domain (énorme)
    if site_host and site_host in domain:
        score += 1000
    # Bonus local part standard
    score += LOCAL_PRIORITY.get(local.split(".")[0], 0)
    # Pénalité personnel (gmail/yahoo etc.) — mais on les garde
    free_providers = {"gmail.com", "yahoo.fr", "yahoo.com", "hotmail.fr", "hotmail.com",
                      "outlook.fr", "outlook.com", "free.fr", "orange.fr", "wanadoo.fr",
                      "laposte.net", "sfr.fr", "bbox.fr", "live.fr", "icloud.com"}
    if domain in free_providers:
        score -= 50
    return score


def _deep_crawl(site_url: str, max_pages: int = 50) -> tuple[Optional[str], Optional[str], Optional[str]]:
    """BFS sur le site, priorise les pages contact/mentions, retourne le meilleur email."""
    try:
        parsed = urlparse(site_url)
        host = (parsed.hostname or "").lower()
        if host.startswith("www."):
            host = host[4:]
        if not host or not parsed.scheme:
            return None, None, None
        root = f"{parsed.scheme}://{parsed.hostname}"
    except Exception:
        return None, None, None

    visited: set[str] = set()
    queue: deque = deque([(root + "/", 0, 100)])  # (url, depth, priority_score)
    found_emails: list[tuple[str, str]] = []  # (email, source_url)

    with httpx.Client(
        timeout=HTTP_TIMEOUT,
        follow_redirects=True,
        headers={"User-Agent": USER_AGENT},
        verify=False,
    ) as client:
        page_count = 0
        while queue and page_count < max_pages:
            # Sort by priority desc, take highest
            queue = deque(sorted(queue, key=lambda x: -x[2]))
            url, depth, _ = queue.popleft()

            if url in visited:
                continue
            visited.add(url)
            page_count += 1

            try:
                r = client.get(url)
            except Exception:
                continue
            if r.status_code != 200 or not r.text:
                continue

            # Extraire emails de cette page
            for e in _extract_emails(r.text):
                found_emails.append((e, url))

            # Si on a déjà trouvé un email same_domain de qualité → arrêt rapide
            if found_emails:
                best = max(found_emails, key=lambda x: _score_email(x[0], host))
                if _score_email(best[0], host) >= 1080:  # same_domain + contact@/info@/etc.
                    return best[0], "deep_crawl", best[1]

            # Si depth max atteinte, ne pas suivre
            if depth >= 2:
                continue

            # Trouver liens internes
            try:
                soup = BeautifulSoup(r.text, "html.parser")
            except Exception:
                continue
            for a in soup.find_all("a", href=True):
                href = a["href"].strip()
                if not href or href.startswith("#") or href.startswith("javascript:"):
                    continue
                if href.startswith("mailto:") or href.startswith("tel:"):
                    continue
                full = urljoin(url, href)
                fp = urlparse(full)
                if (fp.hostname or "").lower().lstrip("www.").replace("www.", "") != host:
                    continue
                # Strip fragment
                clean = full.split("#")[0]
                if clean in visited:
                    continue
                # Score path
                score = 100 if PATH_PRIORITY.search(clean) else 10
                queue.append((clean, depth + 1, score))

    if not found_emails:
        return None, None, None
    best = max(found_emails, key=lambda x: _score_email(x[0], host))
    return best[0], "deep_crawl", best[1]


def _process_one(siret: str, site_url: str, max_pages: int = 25) -> Optional[dict]:
    """Worker : un OF → email."""
    import gc
    try:
        email, source, page = _deep_crawl(site_url, max_pages=max_pages)
        if email:
            return {"siret": siret, "email": email, "email_source": source, "email_page": page}
        return None
    finally:
        gc.collect()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="Nb max d'OF à traiter (0=all)")
    ap.add_argument("--workers", type=int, default=10)
    ap.add_argument("--max-pages", type=int, default=50)
    ap.add_argument("--db", default=str(DB_PATH))
    args = ap.parse_args()

    conn = sqlite3.connect(args.db, timeout=30)
    conn.execute("PRAGMA busy_timeout = 30000")

    # Cibles : OF avec site_url et sans email
    rows = conn.execute("""
        SELECT siret, site_url FROM of_enrich
        WHERE site_url IS NOT NULL AND site_url != ''
          AND (email IS NULL OR email = '')
        ORDER BY siret
    """).fetchall()
    conn.close()

    log.info(f"Total OF à traiter (site_url présent, email NULL) : {len(rows)}")
    if args.limit > 0:
        rows = rows[:args.limit]
        log.info(f"  → limité à {len(rows)} pour test")

    found = 0
    processed = 0
    t0 = time.time()
    batch_to_save: list[dict] = []

    def save_batch(batch):
        if not batch:
            return
        c = sqlite3.connect(args.db, timeout=30)
        c.execute("PRAGMA busy_timeout = 30000")
        c.executemany("""
            UPDATE of_enrich
            SET email = :email, email_source = :email_source,
                email_page = :email_page, email_found_at = datetime('now'),
                step = CASE WHEN step IN ('site_found', 'email_not_found') THEN 'email_found' ELSE step END
            WHERE siret = :siret
        """, batch)
        c.commit()
        c.close()

    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = {ex.submit(_process_one, siret, url, args.max_pages): siret for siret, url in rows}
        for f in as_completed(futs):
            processed += 1
            try:
                res = f.result()
            except Exception as e:
                log.warning(f"err: {e}")
                continue
            if res:
                found += 1
                batch_to_save.append(res)
                if len(batch_to_save) >= 20:
                    save_batch(batch_to_save)
                    batch_to_save = []
            if processed % 50 == 0:
                rate = processed / max(1, time.time() - t0)
                yield_ = 100 * found / processed
                eta_min = (len(rows) - processed) / max(0.1, rate) / 60
                log.info(f"  {processed}/{len(rows)} — {found} emails ({yield_:.1f}%) — {rate:.1f} OF/s — ETA {eta_min:.0f} min")

    save_batch(batch_to_save)

    yield_ = 100 * found / max(1, processed)
    log.info(f"FINI : {processed} OF traités, {found} emails trouvés ({yield_:.1f}% yield) en {(time.time()-t0)/60:.1f} min")


if __name__ == "__main__":
    main()
