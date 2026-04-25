#!/usr/bin/env python3
"""Enrichissement emails pour 1000 OF Qualiopi.

Pipeline en 4 étapes :
  1. init            : charge CSV → SQLite locale (reprenable)
  2. find-sites      : DataForSEO SERP → trouve le site web (coût ~$0.0006/req)
  3. scrape-emails   : HTTP scraping pages contact → email (gratuit)
  4. validate        : MX + SMTP handshake via src.email_validator de prospection (gratuit)
  5. export          : CSV final enrichi
  6. stats           : afficher l'état d'avancement

Usage :
    .venv/bin/python scripts/enrich_of_emails.py init --input /chemin/of_prospects_1000.csv
    .venv/bin/python scripts/enrich_of_emails.py find-sites --limit 10       # test
    .venv/bin/python scripts/enrich_of_emails.py find-sites --all            # full batch
    .venv/bin/python scripts/enrich_of_emails.py scrape-emails
    .venv/bin/python scripts/enrich_of_emails.py validate
    .venv/bin/python scripts/enrich_of_emails.py export --out data/of_enriched.csv
    .venv/bin/python scripts/enrich_of_emails.py stats
"""

from __future__ import annotations

import argparse
import base64
import csv
import logging
import os
import re
import sqlite3
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

# Réutilise EmailValidator du projet prospection
PROSPECTION_SRC = Path("/media/stef/Photos - Sauv/DEV-JAMBU/prospection")
if PROSPECTION_SRC.exists():
    sys.path.insert(0, str(PROSPECTION_SRC))

# --- Config -----------------------------------------------------------------

HERE = Path(__file__).resolve().parent.parent
DB_PATH = HERE / "data" / "of_enriched.sqlite"

# DataForSEO (depuis ~/.claude/CLAUDE.md)
DFS_LOGIN = "contact@hi-commerce.fr"
DFS_PASSWORD = "50b97fdf1d1887d7"
DFS_AUTH = base64.b64encode(f"{DFS_LOGIN}:{DFS_PASSWORD}".encode()).decode()
DFS_URL = "https://api.dataforseo.com/v3/serp/google/organic/live/regular"
DFS_LOCATION_CODE = 2250  # France
DFS_LANGUAGE_CODE = "fr"
DFS_WORKERS = 5            # parallèle max (live/regular = 1 task/POST obligatoire)

# Annuaires à exclure (jamais le vrai site de l'OF)
SITE_BLACKLIST = {
    "pagesjaunes.fr", "societe.com", "linkedin.com", "facebook.com",
    "instagram.com", "youtube.com", "twitter.com", "x.com",
    "mon-centre-de-formation.com", "formation.com", "kelformation.com",
    "moncompteformation.gouv.fr", "qualiopi.gouv.fr", "entreprises.gouv.fr",
    "data.gouv.fr", "travail-emploi.gouv.fr", "insee.fr",
    "annuaire-entreprises.data.gouv.fr", "infonet.fr", "verif.com",
    "viadeo.com", "indeed.com", "glassdoor.fr", "bodacc.fr",
    "journaldunet.com", "manageo.fr", "bilansgratuits.fr", "scoring.com",
    "pappers.fr", "dirigeant.com", "b-reputation.com",
    "wikipedia.org", "fr.wikipedia.org", "parcoursup.fr", "onisep.fr",
    "letudiant.fr", "studyrama.com", "diplomeo.com", "cidj.com",
    "formation-continue.fr", "centre-formation.fr", "trouvermaformation.com",
    "maformation.fr", "formationpro.fr", "cpformation.com", "topformation.fr",
    "cadremploi.fr", "apec.fr", "pole-emploi.fr", "francetravail.fr",
    "tiktok.com", "youtube.com", "yelp.fr", "tripadvisor.fr",
}

# Scraping
HTTP_TIMEOUT = 8
USER_AGENT = "Mozilla/5.0 (compatible; CipiaBot/1.0; +https://cipia.fr/bot)"
CONTACT_PATHS = [
    "", "/contact", "/nous-contacter", "/contactez-nous", "/contact-us",
    "/mentions-legales", "/mentions", "/legal", "/impressum",
    "/a-propos", "/about", "/qui-sommes-nous", "/qui-nous-sommes",
    "/coordonnees", "/nous-trouver", "/infos-pratiques", "/infos",
    "/footer",
]
# Regex pour trouver un lien contact dans le HTML home
CONTACT_LINK_RE = re.compile(
    r'href=["\']([^"\']*(?:contact|mentions|impressum|coordonnees|nous-trouver)[^"\']*)["\']',
    re.I,
)

# Filtrage emails indésirables
EMAIL_BLACKLIST_RE = re.compile(
    r"^(noreply|no-reply|postmaster|webmaster|webmestre|admin|support-?wp|wordpress|"
    r"mailer|notifications?|no_reply|donotreply|ne-?pas-?repondre|privacy|dpo|"
    r"abuse|hostmaster|security)@", re.I
)
EMAIL_EXT_BLACKLIST = {"sentry.io", "wixsite.com", "wordpress.com",
                        "jimdo.com", "wix.com", "weebly.com",
                        "example.com", "domain.com", "mail.com",
                        "domain.fr", "exemple.fr", "votre-domaine.fr",
                        "entreprise.fr", "societe.fr",
                        "rankplace.fr", "pages-1a-zone.com",
                        # placeholder / mauvais scrape
                        "2x.png", "3x.png"}
# Local parts qui sont clairement des placeholders
EMAIL_LOCAL_PLACEHOLDERS = {
    "nomprenom", "nom.prenom", "prenom.nom", "votreemail", "votre.email",
    "tonemail", "ton.email", "monemail", "mon.email", "email",
    "exemple", "example", "test", "votre-nom",
}
# Faux positifs vus dans les sprites CSS / placeholders / exemples docs
EMAIL_NOISE_TLDS = {"png", "jpg", "jpeg", "gif", "svg", "webp", "ico",
                     "css", "js", "woff", "woff2", "ttf", "otf",
                     "mp4", "mp3", "webm", "pdf", "zip"}

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")

# --- Logging ----------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("enrich")

# --- DB ---------------------------------------------------------------------

SCHEMA = """
CREATE TABLE IF NOT EXISTS of_enrich (
    siret           TEXT PRIMARY KEY,
    nda             TEXT,
    denomination    TEXT,
    adresse         TEXT,
    code_postal     TEXT,
    ville           TEXT,
    code_region     TEXT,
    formation       INTEGER,
    bilan_competences INTEGER,
    vae             INTEGER,
    apprentissage   INTEGER,
    site_url        TEXT,
    site_rank       INTEGER,
    site_source     TEXT,
    site_checked_at TEXT,
    email           TEXT,
    email_source    TEXT,
    email_page      TEXT,
    email_found_at  TEXT,
    email_status    TEXT,
    email_validated_at TEXT,
    error           TEXT,
    step            TEXT DEFAULT 'init'
);
CREATE INDEX IF NOT EXISTS idx_step ON of_enrich(step);
CREATE INDEX IF NOT EXISTS idx_email ON of_enrich(email);
"""


def get_db() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn


# --- Step 1: init -----------------------------------------------------------

def cmd_init(args):
    """Charge CSV → SQLite. Idempotent (INSERT OR IGNORE)."""
    path = Path(args.input)
    if not path.exists():
        log.error("CSV introuvable : %s", path)
        sys.exit(1)

    conn = get_db()
    n_new = 0
    with path.open(encoding="utf-8") as f:
        for row in csv.DictReader(f):
            cur = conn.execute("""
                INSERT OR IGNORE INTO of_enrich
                (siret, nda, denomination, adresse, code_postal, ville, code_region,
                 formation, bilan_competences, vae, apprentissage)
                VALUES (?,?,?,?,?,?,?,?,?,?,?)
            """, (
                row["siret"], row["nda"], row["denomination"],
                row["adresse"], row["code_postal"], row["ville"], row["code_region"],
                int(row.get("formation") == "True"),
                int(row.get("bilan_competences") == "True"),
                int(row.get("vae") == "True"),
                int(row.get("apprentissage") == "True"),
            ))
            n_new += cur.rowcount
    conn.commit()
    total = conn.execute("SELECT COUNT(*) FROM of_enrich").fetchone()[0]
    conn.close()
    log.info("Init OK — %d nouvelles lignes insérées, total DB = %d", n_new, total)


# --- Step 2: find-sites (DataForSEO) ----------------------------------------

_STOP_WORDS = {"de", "la", "le", "les", "du", "des", "et", "en", "au", "aux",
               "sur", "pour", "par", "dans", "center", "centre", "institut",
               "ecole", "école", "association", "formation", "formations",
               "cfa", "greta", "eplefpa", "afpa", "sarl", "sas", "eurl",
               "ste", "societe", "société", "the", "of", "and"}


def _pick_best_site(serp_items: list, denomination: str) -> tuple[Optional[str], Optional[int]]:
    """Choisit le meilleur domaine organique (hors blacklist annuaires).

    Stratégie :
    1. Itère les organics, ignore blacklist.
    2. Préfère un host qui matche un token significatif de la dénomination.
    3. Sinon, fallback = 1er résultat organique non-blacklisté (rank ≤ 3).
    """
    tokens = [t for t in re.findall(r"[a-zà-ÿ0-9]+", denomination.lower())
              if len(t) > 2 and t not in _STOP_WORDS]

    first_fallback = None
    for item in serp_items:
        if item.get("type") != "organic":
            continue
        url = item.get("url") or ""
        if not url:
            continue
        try:
            host = (urlparse(url).hostname or "").lower().lstrip("www.")
        except Exception:
            continue
        if not host:
            continue
        if any(host == b or host.endswith("." + b) for b in SITE_BLACKLIST):
            continue
        rank = item.get("rank_group")
        # Match token fort
        if tokens and any(t in host for t in tokens):
            return url, rank
        # Fallback : 1er organique non-blacklisté rank ≤ 3
        if first_fallback is None and rank and rank <= 3:
            first_fallback = (url, rank)
    return first_fallback if first_fallback else (None, None)


def cmd_find_sites(args):
    """DataForSEO SERP → site_url pour chaque SIRET sans site."""
    conn = get_db()
    rows = conn.execute(
        "SELECT siret, denomination, ville FROM of_enrich "
        "WHERE step = 'init' ORDER BY siret"
    ).fetchall()

    if args.limit and not args.all:
        rows = rows[:args.limit]

    if not rows:
        log.info("Rien à traiter — tous les SIRETs ont déjà une étape site.")
        return

    log.info("find-sites : %d OF à traiter (coût estimé DataForSEO : $%.2f)",
             len(rows), len(rows) * 0.0006)
    if not args.yes:
        confirm = input("Continuer ? [y/N] ").strip().lower()
        if confirm != "y":
            log.info("Abandon.")
            return

    def query_one(row: sqlite3.Row) -> tuple[str, str, Optional[str], Optional[int], Optional[str]]:
        """Retourne (siret, denomination, url, rank, err)."""
        task = {
            "keyword": f'{row["denomination"]} {row["ville"]} formation',
            "location_code": DFS_LOCATION_CODE,
            "language_code": DFS_LANGUAGE_CODE,
            "depth": 10,
        }
        try:
            r = httpx.post(DFS_URL, json=[task],
                           headers={"Authorization": f"Basic {DFS_AUTH}",
                                    "Content-Type": "application/json"},
                           timeout=45)
            r.raise_for_status()
            data = r.json()
            t = (data.get("tasks") or [{}])[0]
            if t.get("status_code") != 20000:
                return row["siret"], row["denomination"], None, None, t.get("status_message")
            result = t.get("result") or []
            items = (result[0].get("items") if result else []) or []
            url, rank = _pick_best_site(items, row["denomination"])
            return row["siret"], row["denomination"], url, rank, None
        except Exception as e:
            return row["siret"], row["denomination"], None, None, str(e)[:100]

    processed = 0
    with ThreadPoolExecutor(max_workers=DFS_WORKERS) as ex:
        futures = [ex.submit(query_one, r) for r in rows]
        for f in as_completed(futures):
            siret, denomination, url, rank, err = f.result()
            now = time.strftime("%Y-%m-%d %H:%M:%S")
            if url:
                conn.execute("""UPDATE of_enrich SET site_url=?, site_rank=?, site_source='dataforseo',
                    site_checked_at=?, step='site_found' WHERE siret=?""", (url, rank, now, siret))
            else:
                conn.execute("""UPDATE of_enrich SET site_checked_at=?, step='site_not_found',
                    error=? WHERE siret=?""", (now, err, siret))
            processed += 1
            if processed % 10 == 0:
                conn.commit()
                log.info("  %d/%d OF traités", processed, len(rows))
        conn.commit()

    # Stats
    found = conn.execute("SELECT COUNT(*) FROM of_enrich WHERE step='site_found'").fetchone()[0]
    log.info("find-sites terminé : %d/%d sites trouvés dans ce run (%.0f%%)",
             found, len(rows), 100 * found / max(len(rows), 1))
    conn.close()


# --- Step 3: scrape-emails --------------------------------------------------

def _extract_emails(html: str, denomination_host: Optional[str] = None) -> list[str]:
    """Extrait les emails utiles d'un HTML. Priorise les mailto:, puis regex."""
    emails = []
    # mailto: en priorité
    soup = BeautifulSoup(html, "html.parser")
    for a in soup.find_all("a", href=True):
        if a["href"].lower().startswith("mailto:"):
            e = a["href"].split(":", 1)[1].split("?")[0].strip()
            if "@" in e:
                emails.append(e)
    # Regex fallback
    emails.extend(EMAIL_RE.findall(html))

    # Dédup + filtres
    seen, cleaned = set(), []
    for e in emails:
        e = e.strip().lower().rstrip(".,;:)")
        if e in seen:
            continue
        seen.add(e)
        if EMAIL_BLACKLIST_RE.match(e):
            continue
        if "@" not in e:
            continue
        local, _, domain = e.rpartition("@")
        if not domain:
            continue
        # Faux positif : "foo@bar.png" (sprite CSS, @2x.jpg, etc.)
        tld = domain.rsplit(".", 1)[-1]
        if tld.lower() in EMAIL_NOISE_TLDS:
            continue
        # Local part numérique pur = très probable faux (versioning, hash)
        if local.isdigit():
            continue
        if local.lower() in EMAIL_LOCAL_PLACEHOLDERS:
            continue
        if any(domain == b or domain.endswith("." + b) for b in EMAIL_EXT_BLACKLIST):
            continue
        cleaned.append(e)
    return cleaned


def _scrape_site(site_url: str) -> tuple[Optional[str], Optional[str], Optional[str]]:
    """Retourne (email, source, page_url) pour le 1er email trouvé sur le site.

    Stratégie :
    1. Va sur la homepage (scheme://host/) + la page SERP originale.
    2. Lit le HTML, extrait les liens "contact", "mentions-légales", etc.
    3. Tente les CONTACT_PATHS standards.
    Priorité aux emails @domain_du_site.
    """
    try:
        parsed = urlparse(site_url)
        host = (parsed.hostname or "").lower().lstrip("www.")
        if not host or not parsed.scheme:
            return None, None, None
        root = f"{parsed.scheme}://{parsed.hostname}"
    except Exception:
        return None, None, None

    with httpx.Client(timeout=HTTP_TIMEOUT, follow_redirects=True,
                      headers={"User-Agent": USER_AGENT}) as client:
        tried: set[str] = set()

        def try_url(url: str) -> Optional[tuple[str, str, str]]:
            if url in tried:
                return None
            tried.add(url)
            try:
                r = client.get(url)
            except Exception:
                return None
            if r.status_code != 200 or not r.text:
                return None
            emails = _extract_emails(r.text, host)
            if not emails:
                return None
            same_domain = [e for e in emails if host and host in e.split("@", 1)[1]]
            picked = same_domain[0] if same_domain else emails[0]
            # "mailto" si le picked était dans un href mailto: du HTML
            source = "mailto" if f"mailto:{picked}" in r.text.lower() else "regex"
            return picked, source, url

        # 1. Homepage en premier — c'est là que le footer avec les emails est souvent visible.
        hit = try_url(root + "/")
        if hit:
            return hit
        # 2. La page SERP originale (peut ≠ homepage).
        if site_url != root + "/" and site_url != root:
            hit = try_url(site_url)
            if hit:
                return hit
        # 3. Liens contact/mentions extraits de la homepage déjà fetchée.
        try:
            home_html = client.get(root + "/").text
        except Exception:
            home_html = ""
        for match in CONTACT_LINK_RE.findall(home_html or "")[:5]:
            # Résout relatif / absolu
            if match.startswith("//"):
                url = parsed.scheme + ":" + match
            elif match.startswith("/"):
                url = root + match
            elif match.startswith("http"):
                url = match
            else:
                url = root + "/" + match
            hit = try_url(url)
            if hit:
                return hit
        # 4. Chemins standards.
        for path in CONTACT_PATHS:
            if not path:
                continue
            hit = try_url(root + path)
            if hit:
                return hit
    return None, None, None


def cmd_scrape_emails(args):
    conn = get_db()
    rows = conn.execute(
        "SELECT siret, site_url FROM of_enrich "
        "WHERE step = 'site_found' ORDER BY siret"
    ).fetchall()
    if args.limit and not args.all:
        rows = rows[:args.limit]
    if not rows:
        log.info("Rien à scraper.")
        return

    log.info("scrape-emails : %d sites à traiter", len(rows))

    def worker(row):
        try:
            return row["siret"], *_scrape_site(row["site_url"])
        except Exception as e:
            return row["siret"], None, None, None

    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futures = [ex.submit(worker, r) for r in rows]
        for i, f in enumerate(as_completed(futures), 1):
            siret, email, source, page = f.result()
            now = time.strftime("%Y-%m-%d %H:%M:%S")
            if email:
                conn.execute("""UPDATE of_enrich SET email=?, email_source=?, email_page=?,
                    email_found_at=?, step='email_found' WHERE siret=?""",
                    (email, source, page, now, siret))
            else:
                conn.execute("""UPDATE of_enrich SET email_found_at=?, step='email_not_found'
                    WHERE siret=?""", (now, siret))
            if i % 50 == 0:
                conn.commit()
                log.info("  %d/%d scrapés", i, len(rows))
    conn.commit()
    found = conn.execute("SELECT COUNT(*) FROM of_enrich WHERE step='email_found'").fetchone()[0]
    log.info("scrape-emails terminé — emails trouvés : %d", found)
    conn.close()


# --- Step 4: validate (réutilise email_validator de prospection) -----------

def cmd_validate(args):
    try:
        from src.email_validator import EmailValidator
    except ImportError as e:
        log.error("Impossible d'importer EmailValidator : %s", e)
        log.error("Vérifier que /media/stef/Photos - Sauv/DEV-JAMBU/prospection est accessible.")
        sys.exit(1)

    conn = get_db()
    rows = conn.execute(
        "SELECT siret, email FROM of_enrich "
        "WHERE step = 'email_found' AND email_status IS NULL ORDER BY siret"
    ).fetchall()
    if args.limit and not args.all:
        rows = rows[:args.limit]
    if not rows:
        log.info("Rien à valider.")
        return

    log.info("validate : %d emails à valider (SMTP gratuit)", len(rows))
    v = EmailValidator()
    for i, row in enumerate(rows, 1):
        try:
            res = v.validate(row["email"])
            status = res.status
            reason = res.reason
        except Exception as e:
            status, reason = "unknown", str(e)[:100]
        now = time.strftime("%Y-%m-%d %H:%M:%S")
        conn.execute("""UPDATE of_enrich SET email_status=?, email_validated_at=?,
            step='validated', error=? WHERE siret=?""",
            (status, now, reason if status in ("invalid", "unknown") else None, row["siret"]))
        if i % 20 == 0:
            conn.commit()
            log.info("  %d/%d validés (dernier : %s → %s)", i, len(rows), row["email"], status)
    conn.commit()

    log.info("validate terminé. Stats :")
    for r in conn.execute("""SELECT email_status, COUNT(*) n FROM of_enrich
                             WHERE email_status IS NOT NULL GROUP BY email_status
                             ORDER BY n DESC"""):
        log.info("  %-10s : %d", r["email_status"], r["n"])
    conn.close()


# --- Step 5: export ---------------------------------------------------------

def cmd_export(args):
    conn = get_db()
    cols = ["siret", "nda", "denomination", "adresse", "code_postal", "ville",
            "code_region", "site_url", "email", "email_status", "step"]
    rows = conn.execute(f"SELECT {','.join(cols)} FROM of_enrich ORDER BY siret").fetchall()
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(cols)
        for r in rows:
            w.writerow([r[c] for c in cols])
    log.info("Export OK → %s (%d lignes)", out, len(rows))
    conn.close()


# --- Step 6: stats ----------------------------------------------------------

def cmd_stats(args):
    conn = get_db()
    total = conn.execute("SELECT COUNT(*) FROM of_enrich").fetchone()[0]
    log.info("Total OF en DB : %d", total)
    log.info("")
    log.info("=== Par étape ===")
    for r in conn.execute("SELECT step, COUNT(*) n FROM of_enrich GROUP BY step ORDER BY n DESC"):
        log.info("  %-20s : %d", r["step"], r["n"])
    log.info("")
    log.info("=== Statut emails ===")
    for r in conn.execute("""SELECT email_status, COUNT(*) n FROM of_enrich
                              WHERE email_status IS NOT NULL
                              GROUP BY email_status ORDER BY n DESC"""):
        log.info("  %-15s : %d", r["email_status"], r["n"])
    conn.close()


# --- CLI --------------------------------------------------------------------

def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)

    p_init = sub.add_parser("init", help="Charge le CSV → SQLite")
    p_init.add_argument("--input", required=True, help="Chemin du CSV source")
    p_init.set_defaults(func=cmd_init)

    p_find = sub.add_parser("find-sites", help="DataForSEO SERP pour trouver le site web")
    p_find.add_argument("--limit", type=int, default=10, help="Nb d'OF à traiter (défaut 10)")
    p_find.add_argument("--all", action="store_true", help="Traiter tous les OF (outrepasse --limit)")
    p_find.add_argument("--yes", action="store_true", help="Skip confirmation interactive")
    p_find.set_defaults(func=cmd_find_sites)

    p_scrape = sub.add_parser("scrape-emails", help="Scraper les pages contact pour extraire les emails")
    p_scrape.add_argument("--limit", type=int, default=50, help="Nb de sites à traiter (défaut 50)")
    p_scrape.add_argument("--all", action="store_true", help="Traiter tous les sites")
    p_scrape.add_argument("--workers", type=int, default=10, help="Threads HTTP parallèles")
    p_scrape.set_defaults(func=cmd_scrape_emails)

    p_val = sub.add_parser("validate", help="Validation SMTP des emails trouvés")
    p_val.add_argument("--limit", type=int, default=50)
    p_val.add_argument("--all", action="store_true")
    p_val.set_defaults(func=cmd_validate)

    p_exp = sub.add_parser("export", help="Export CSV enrichi")
    p_exp.add_argument("--out", default=str(HERE / "data" / "of_enriched.csv"))
    p_exp.set_defaults(func=cmd_export)

    p_stats = sub.add_parser("stats", help="Afficher l'état d'avancement")
    p_stats.set_defaults(func=cmd_stats)

    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
