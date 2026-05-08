#!/usr/bin/env python3
"""WHOIS bulk emails — extraction email registrant/admin/tech.

En FR (.fr/.com), la plupart des WHOIS sont GDPR-cachés pour les particuliers
mais exposés pour les sociétés (entreprises immatriculées).

Usage :
    python3 scripts/whois_emails.py --limit 100
    python3 scripts/whois_emails.py --all
"""

from __future__ import annotations

import argparse
import logging
import re
import sqlite3
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

import whois  # python-whois

HERE = Path(__file__).resolve().parent.parent
DB_PATH = HERE / "data" / "of_enriched.sqlite"

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")

# Domaines à ignorer (registrar / GDPR proxy)
WHOIS_PROXY_DOMAINS = {
    "afnic.fr", "registrar-tech.com",
    "gandi.net", "domains.gandi.net", "contact.gandi.net", "proxy-service.fr",
    "ovh.com", "ovh.net",
    "ionos.com", "ionos.fr", "1and1.fr", "1and1.com", "godaddy.com", "godaddy.fr",
    "namecheap.com", "name.com", "google.com", "googlemail.com",
    "pdr.com", "publicdomainregistry.com", "tucows.com",
    "registrar.amazon.com", "amazon.com", "registrar.amazonaws.com",
    "abuse-mailbox", "domainabuse", "support@", "abuse@",
    "dataprotection", "anonymous", "withheld",
    "whoisproxy", "domainproxy", "privacyguardian",
    "webhosting.fr", "lws.fr", "netissime.com", "registrar-servers.com",
    "infomaniak.com",
    # Proxies WHOIS additionnels (découverts 2026-05-07)
    "wix-domains.com", "wixdomain.com",
    "domprivacy.de", "data-protected.net", "data-private.net",
    "o-w-o.info", "m.o-w-o.info", "p.o-w-o.info", "c.o-w-o.info", "x.o-w-o.info",
    "whoisprivacyprotect.com", "whoisguard.com",
    "domainsbyproxy.com", "withheldforprivacy.com",
    "whoisprivacycorp.com",
    "domains-anonymous.com", "anonymise.tech",
    "wkglobal.com", "gandi-net.com",
    "proxy.dnsuk.net", "email-domain-broker.com",
}

# Pattern hash/uuid : <hex_long>@... ou <uuid>@... = quasi toujours un proxy
HASH_LIKE_RE = re.compile(r"^([a-f0-9]{16,}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|[a-f0-9]{16,}-\d{4,})@", re.I)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
log = logging.getLogger("whois_emails")


def _domain_from_url(url: str) -> Optional[str]:
    try:
        host = (urlparse(url).hostname or "").lower()
        if host.startswith("www."):
            host = host[4:]
        return host or None
    except Exception:
        return None


def _whois_email(domain: str) -> Optional[tuple[str, str]]:
    """Query python-whois, parse pour email registrant/admin/tech valide."""
    try:
        w = whois.whois(domain)
    except Exception:
        return None

    # Aggregate raw text + structured fields
    text_parts = []
    if hasattr(w, "text") and w.text:
        text_parts.append(str(w.text))
    for key in ("emails", "registrant_email", "admin_email", "tech_email"):
        v = getattr(w, key, None) if hasattr(w, key) else w.get(key) if hasattr(w, "get") else None
        if v:
            if isinstance(v, list):
                text_parts.extend(str(x) for x in v)
            else:
                text_parts.append(str(v))
    text = "\n".join(text_parts)
    if not text:
        return None

    emails = EMAIL_RE.findall(text)
    if not emails:
        return None

    # Filtrer
    candidates = []
    for e in emails:
        e = e.strip().lower().rstrip(".,;:)>")
        local, _, dom = e.partition("@")
        if not dom:
            continue
        # Skip pattern hash/uuid (typique des proxies anonymes)
        if HASH_LIKE_RE.match(e):
            continue
        # Skip registrar/proxy par domaine
        if any(dom == p or dom.endswith("." + p) for p in WHOIS_PROXY_DOMAINS):
            continue
        if "abuse" in local or "noc" in local:
            continue
        candidates.append(e)

    if not candidates:
        return None

    # Préférer un email @<domain> ou @<sous-domain>
    same_domain = [e for e in candidates if domain in e.split("@", 1)[1]]
    picked = same_domain[0] if same_domain else candidates[0]
    return picked, "whois"


def _process_one(siret: str, site_url: str) -> Optional[dict]:
    domain = _domain_from_url(site_url)
    if not domain:
        return None
    res = _whois_email(domain)
    if res:
        email, source = res
        return {"siret": siret, "email": email, "email_source": source, "email_page": f"whois:{domain}"}
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--db", default=str(DB_PATH))
    args = ap.parse_args()

    conn = sqlite3.connect(args.db, timeout=30)
    rows = conn.execute("""
        SELECT siret, site_url FROM of_enrich
        WHERE site_url IS NOT NULL AND site_url != ''
          AND (email IS NULL OR email = '')
        ORDER BY siret
    """).fetchall()
    conn.close()

    log.info(f"OF à traiter : {len(rows)}")
    if args.limit > 0:
        rows = rows[:args.limit]

    found = 0
    processed = 0
    t0 = time.time()
    batch_to_save: list[dict] = []

    def save_batch(batch):
        if not batch:
            return
        c = sqlite3.connect(args.db, timeout=30)
        c.executemany("""
            UPDATE of_enrich
            SET email = :email, email_source = :email_source,
                email_page = :email_page, email_found_at = datetime('now'),
                step = CASE WHEN step IN ('site_found', 'email_not_found', 'init') THEN 'email_found' ELSE step END
            WHERE siret = :siret
        """, batch)
        c.commit()
        c.close()

    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = {ex.submit(_process_one, siret, url): siret for siret, url in rows}
        for f in as_completed(futs):
            processed += 1
            try:
                res = f.result()
            except Exception:
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
                log.info(f"  {processed}/{len(rows)} — {found} ({yield_:.1f}%) — {rate:.1f}/s — ETA {eta_min:.0f}min")

    save_batch(batch_to_save)
    yield_ = 100 * found / max(1, processed)
    log.info(f"FINI : {processed} OF, {found} emails ({yield_:.1f}%) en {(time.time()-t0)/60:.1f}min")


if __name__ == "__main__":
    main()
