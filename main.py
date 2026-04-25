#!/usr/bin/env python3
"""Cipia — CLI entry point.

Usage:
    python main.py init        Initialize the database
    python main.py collect     Run all collectors (BOAMP + Legifrance)
    python main.py process     Run AI pipeline on pending articles
    python main.py newsletter  Generate and send weekly newsletter
    python main.py retry       Reprocess failed articles
    python main.py status      Show database stats
"""

import argparse
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from collectors.boamp import BOAMPCollector
from collectors.centre_inffo import CentreInffoCollector
from collectors.dila_jorf import DILAJorfCollector
from collectors.legifrance import LegifranceCollector
from collectors.legifrance_rss import LegifranceRSSCollector
from collectors.opco import collect_all_opco
from collectors.france_travail import collect_france_travail
from collectors.regions import collect_regions
from collectors.rss_feeds import collect_all_rss

try:
    from collectors.playwright_collectors import collect_all_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False

    def collect_all_playwright(*_args, **_kwargs):
        return []
from processors.pipeline import AIProcessor
from storage.database import init_db, get_connection, get_stats
from storage.logger import setup_logger
from publishers.newsletter import (
    select_articles_for_newsletter,
    generate_newsletter_html,
    generate_newsletter_subject,
    mark_articles_as_sent,
    create_newsletter,
)
from publishers.brevo import BrevoClient


DEFAULT_DB_PATH = os.environ.get("DB_PATH", "data/veille.db")


def cmd_init(args):
    """Initialize the database."""
    logger = setup_logger()
    db_path = args.db or DEFAULT_DB_PATH

    logger.info(f"Initialisation de la base: {db_path}")
    init_db(db_path)

    # Verify by checking file size
    size = Path(db_path).stat().st_size
    logger.info(f"Base initialisee: {db_path} ({size} octets)")
    print(f"Base de donnees initialisee: {db_path}")


def cmd_collect(args):
    """Run all collectors."""
    logger = setup_logger()
    db_path = args.db or DEFAULT_DB_PATH

    # Ensure DB exists
    init_db(db_path)

    # days_back configurable via env (default 30 pour runs quotidiens, plus haut pour backfill)
    days_back = int(os.environ.get("COLLECT_DAYS_BACK", "30"))
    # JORF days_back plus court (dumps quotidiens lourds), default 7
    jorf_days_back = int(os.environ.get("JORF_DAYS_BACK", "7"))
    logger.info(f"Collecte : days_back={days_back}, jorf_days_back={jorf_days_back}")

    # Sources stables (Phase 1 v2 - apres pivot Avril 2026)
    # Anciens collecteurs (legifrance_rss, opco, regions, france_travail, playwright)
    # desactives car sources cassees ou anti-bot. Voir CLAUDE.md / SUIVI-FONCTIONNALITES.md.
    collectors = [
        BOAMPCollector(db_path, logger, days_back=days_back),
        CentreInffoCollector(db_path, logger, days_back=days_back),
        DILAJorfCollector(db_path, logger, days_back=jorf_days_back),
    ]

    print("=== Cipia -- Collecte ===\n")

    all_stats = []
    for collector in collectors:
        stats = collector.run()
        all_stats.append(stats)

        status_icon = "OK" if not stats["errors"] else "ERREUR"
        print(
            f"  [{status_icon}] {stats['source']:>14}: "
            f"{stats['inserted']} nouveaux / {stats['collected']} collectes "
            f"({stats['duration_seconds']}s)"
        )
        if stats["errors"]:
            for err in stats["errors"]:
                print(f"       Erreur: {err}")

    total_new = sum(s.get("inserted", 0) for s in all_stats)
    total_collected = sum(s.get("collected", 0) for s in all_stats)
    print(f"\n  Total: {total_new} nouveaux articles / {total_collected} collectes")


def cmd_process(args):
    """Run AI pipeline on pending articles."""
    logger = setup_logger()
    db_path = args.db or DEFAULT_DB_PATH

    if not Path(db_path).exists():
        print(f"Base non trouvee: {db_path}")
        print("Lancez 'python main.py init' pour creer la base.")
        sys.exit(1)

    limit = args.limit if hasattr(args, "limit") and args.limit else 50
    processor = AIProcessor(db_path=db_path, logger=logger)

    print(f"=== Cipia -- Traitement IA ===\n")
    print(f"Modele: {processor.model}")

    articles = processor.get_pending_articles(limit=limit)
    total = len(articles)
    print(f"Articles a traiter: {total}\n")

    if total == 0:
        print("Aucun article a traiter.")
        return

    import time
    start_time = time.time()

    # Reset tracking
    processor.total_input_tokens = 0
    processor.total_output_tokens = 0

    results = []
    for i, article in enumerate(articles):
        result = processor.process_article(article)
        results.append(result)

        title = article["title"][:55]
        if result["success"]:
            print(
                f"  [{i+1}/{total}] \"{title}...\" "
                f"-> OK (impact: {result['impact_level']}, "
                f"score: {result['relevance_score']}/10)"
            )
        else:
            print(
                f"  [{i+1}/{total}] \"{title}...\" "
                f"-> ERREUR: {result['error'][:60]}"
            )

        # Rate limiting
        if i < total - 1:
            time.sleep(processor.rate_limit_delay)

    duration = time.time() - start_time
    processed = sum(1 for r in results if r["success"])
    failed = sum(1 for r in results if not r["success"])

    minutes = int(duration // 60)
    seconds = int(duration % 60)
    duration_str = f"{minutes}m {seconds:02d}s" if minutes > 0 else f"{seconds}s"

    cost = processor.estimated_cost()

    print(f"\nResultat: {processed} traites / {failed} erreurs")
    print(
        f"Tokens: ~{processor.total_input_tokens:,} input "
        f"+ ~{processor.total_output_tokens:,} output"
    )
    print(f"Cout estime: ~{cost:.2f}EUR")
    print(f"Duree: {duration_str}")


def cmd_retry(args):
    """Reprocess failed articles."""
    logger = setup_logger()
    db_path = args.db or DEFAULT_DB_PATH

    if not Path(db_path).exists():
        print(f"Base non trouvee: {db_path}")
        print("Lancez 'python main.py init' pour creer la base.")
        sys.exit(1)

    limit = args.limit if hasattr(args, "limit") and args.limit else 50
    processor = AIProcessor(db_path=db_path, logger=logger)

    print("=== Cipia -- Relance articles en erreur ===\n")

    stats = processor.retry_failed(limit=limit)

    if stats["total"] == 0:
        print("Aucun article en erreur a retraiter.")
        return

    print(f"Articles relances: {stats['total']}")
    print(f"Resultat: {stats['processed']} traites / {stats['failed']} erreurs")
    print(f"Duree: {stats['duration_seconds']}s")


def cmd_newsletter(args):
    """Generate and send the weekly newsletter."""
    from datetime import datetime, timedelta

    logger = setup_logger()
    db_path = args.db or DEFAULT_DB_PATH

    if not Path(db_path).exists():
        print(f"Base non trouvee: {db_path}")
        sys.exit(1)

    # Determine week range (last Monday to Sunday)
    today = datetime.now()
    day_of_week = today.weekday()  # 0=Monday
    is_tuesday = day_of_week == 1

    if not is_tuesday and not args.force:
        print("La newsletter est envoyee le mardi.")
        print("Utilisez --force pour forcer l'envoi.")
        return

    week_end = today - timedelta(days=day_of_week)  # This Monday 00:00
    week_start = week_end - timedelta(days=7)  # Previous Monday
    week_start_str = week_start.strftime("%Y-%m-%d")
    week_end_str = week_end.strftime("%Y-%m-%d")

    print("=== Cipia -- Newsletter ===\n")
    print(f"Periode: {week_start_str} -> {week_end_str}")

    # Determine edition number
    conn = get_connection(db_path)
    try:
        row = conn.execute(
            "SELECT COALESCE(MAX(edition_number), 0) FROM newsletters"
        ).fetchone()
        edition_number = row[0] + 1
    finally:
        conn.close()

    # Select articles
    articles = select_articles_for_newsletter(db_path, week_start_str, week_end_str)
    stats = articles["stats"]
    total = stats["total"]

    print(f"Articles selectionnes: {total}")
    print(f"  - Reglementaire: {stats.get('reglementaire', 0)}")
    print(f"  - Appels d'offres: {stats.get('ao', 0)}")
    print(f"  - Metier: {stats.get('metier', 0)}")
    print(f"  - Handicap: {stats.get('handicap', 0)}")

    if total == 0:
        print("\nAucun article a inclure. Newsletter non generee.")
        return

    # Generate
    has_high_impact = any(
        a.get("impact_level") == "fort"
        for a in articles.get("reglementaire", [])
    )
    subject = generate_newsletter_subject(
        edition_number, stats, week_start_str, week_end_str, has_high_impact
    )
    html = generate_newsletter_html(
        articles, week_start_str, week_end_str, edition_number
    )

    print(f"\nEdition #{edition_number}: {subject}")
    print(f"Taille HTML: {len(html):,} octets")

    # Save to DB
    conn = get_connection(db_path)
    try:
        conn.execute(
            """INSERT INTO newsletters (edition_number, subject, html_content,
               recipients_count)
               VALUES (?, ?, ?, 0)""",
            (edition_number, subject, html),
        )
        conn.commit()
        newsletter_id = conn.execute(
            "SELECT id FROM newsletters WHERE edition_number = ?",
            (edition_number,),
        ).fetchone()[0]
    finally:
        conn.close()

    # Send via Brevo (if configured)
    brevo = BrevoClient()
    if brevo.api_key:
        if args.dry_run:
            print("\n[DRY RUN] Newsletter non envoyee (--dry-run)")
        else:
            print("\nEnvoi via Brevo...")
            campaign_id = brevo.create_and_send_campaign(html, subject)
            if campaign_id:
                # Update newsletter record
                conn = get_connection(db_path)
                try:
                    conn.execute(
                        "UPDATE newsletters SET brevo_campaign_id=?, sent_at=datetime('now') WHERE id=?",
                        (campaign_id, newsletter_id),
                    )
                    conn.commit()
                finally:
                    conn.close()

                # Mark articles as sent
                all_article_ids = []
                for section in ["reglementaire", "ao", "metier", "handicap"]:
                    for a in articles.get(section, []):
                        all_article_ids.append(a["id"])
                mark_articles_as_sent(all_article_ids, newsletter_id, db_path)

                subscriber_count = brevo.get_subscriber_count()
                print(f"Newsletter #{edition_number} envoyee! (campagne Brevo #{campaign_id})")
                print(f"Destinataires: {subscriber_count}")
            else:
                print("ERREUR: Echec de l'envoi Brevo")
    else:
        print("\nBREVO_API_KEY non configuree. Newsletter sauvegardee en base uniquement.")
        # Still mark articles as sent locally
        all_article_ids = []
        for section in ["reglementaire", "ao", "metier", "handicap"]:
            for a in articles.get(section, []):
                all_article_ids.append(a["id"])
        mark_articles_as_sent(all_article_ids, newsletter_id, db_path)

    # Save HTML preview
    preview_path = f"data/newsletter_{edition_number}.html"
    Path(preview_path).parent.mkdir(parents=True, exist_ok=True)
    with open(preview_path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"Apercu HTML sauvegarde: {preview_path}")


def cmd_collect_history(args):
    """Collect historical JORF texts from DILA open data archives."""
    logger = setup_logger()
    db_path = args.db or DEFAULT_DB_PATH

    # Ensure DB exists
    init_db(db_path)

    weeks = args.weeks if hasattr(args, "weeks") and args.weeks else 4

    print(f"=== Cipia -- Collecte historique JORF ===\n")
    print(f"Periode: {weeks} dernieres semaines\n")

    collector = LegifranceRSSCollector(db_path, logger)
    stats = collector.collect_history(weeks_back=weeks)

    print(f"Archives trouvees: {stats['archives_found']}")
    print(f"Archives traitees: {stats['archives_processed']}")
    print(f"Textes pertinents: {stats['relevant_found']}")
    print(f"Nouveaux inseres: {stats['inserted']}")
    print(f"Doublons ignores: {stats['duplicates']}")
    print(f"Duree: {stats['duration_seconds']}s")

    if stats["errors"]:
        print(f"\nErreurs ({len(stats['errors'])}):")
        for err in stats["errors"][:10]:
            print(f"  - {err}")


def cmd_status(args):
    """Show database stats."""
    db_path = args.db or DEFAULT_DB_PATH

    if not Path(db_path).exists():
        print(f"Base non trouvee: {db_path}")
        print("Lancez 'python main.py init' pour creer la base.")
        sys.exit(1)

    conn = get_connection(db_path)
    try:
        stats = get_stats(conn)
    finally:
        conn.close()

    db_size = Path(db_path).stat().st_size
    if db_size >= 1024 * 1024:
        size_str = f"{db_size / (1024 * 1024):.1f} MB"
    elif db_size >= 1024:
        size_str = f"{db_size / 1024:.0f} KB"
    else:
        size_str = f"{db_size} octets"

    print("=== Cipia -- Statut ===")
    print(f"Base: {db_path} ({size_str})")
    print(f"Articles: {stats['total']} total")

    if stats["by_source"]:
        for source, count in sorted(stats["by_source"].items()):
            category = stats["by_category"].get(
                {"boamp": "ao", "legifrance": "reglementaire"}.get(source, ""),
                ""
            )
            cat_str = f" ({category})" if category else ""
            print(f"  - {source.upper()}: {count}{cat_str}")

    if stats["by_status"]:
        parts = []
        for status_name in ["new", "processing", "done", "sent", "failed"]:
            count = stats["by_status"].get(status_name, 0)
            if count > 0:
                label_map = {
                    "new": "Nouveaux",
                    "processing": "En cours",
                    "done": "Traites",
                    "sent": "Envoyes",
                    "failed": "Erreurs",
                }
                parts.append(f"{label_map.get(status_name, status_name)}: {count}")
        if parts:
            print(f"  - {' | '.join(parts)}")

    if stats["last_collected"]:
        print(f"Derniere collecte: {stats['last_collected']}")
    else:
        print("Aucune collecte effectuee")


def main():
    parser = argparse.ArgumentParser(
        description="Cipia -- Veille reglementaire pour organismes de formation",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Commandes:
  init             Initialiser la base de donnees
  collect          Lancer la collecte (BOAMP + Legifrance)
  collect-history  Collecter l'historique JORF (archives DILA)
  process          Traiter les articles par IA (resumes, classification)
  retry            Relancer les articles en erreur
  status           Afficher les statistiques de la base
        """,
    )

    parser.add_argument(
        "--db",
        help=f"Chemin vers la base SQLite (defaut: {DEFAULT_DB_PATH})",
        default=None,
    )

    subparsers = parser.add_subparsers(dest="command", help="Commande a executer")

    subparsers.add_parser("init", help="Initialiser la base de donnees")
    subparsers.add_parser("collect", help="Lancer la collecte")

    history_parser = subparsers.add_parser(
        "collect-history", help="Collecter l'historique JORF (archives DILA)"
    )
    history_parser.add_argument(
        "--weeks", type=int, default=4,
        help="Nombre de semaines d'historique (defaut: 4)",
    )

    process_parser = subparsers.add_parser("process", help="Traiter les articles par IA")
    process_parser.add_argument(
        "--limit", type=int, default=50,
        help="Nombre max d'articles a traiter (defaut: 50)",
    )

    retry_parser = subparsers.add_parser("retry", help="Relancer les articles en erreur")
    retry_parser.add_argument(
        "--limit", type=int, default=50,
        help="Nombre max d'articles a relancer (defaut: 50)",
    )

    newsletter_parser = subparsers.add_parser("newsletter", help="Generer et envoyer la newsletter")
    newsletter_parser.add_argument(
        "--force", action="store_true",
        help="Forcer l'envoi meme si ce n'est pas mardi",
    )
    newsletter_parser.add_argument(
        "--dry-run", action="store_true",
        help="Generer sans envoyer",
    )

    subparsers.add_parser("status", help="Afficher les statistiques")

    args = parser.parse_args()

    if args.command is None:
        parser.print_help()
        sys.exit(1)

    commands = {
        "init": cmd_init,
        "collect": cmd_collect,
        "collect-history": cmd_collect_history,
        "process": cmd_process,
        "newsletter": cmd_newsletter,
        "retry": cmd_retry,
        "status": cmd_status,
    }

    commands[args.command](args)


if __name__ == "__main__":
    main()
