#!/usr/bin/env python3
"""Insert 5 demo articles into blog_articles for local preview."""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "data" / "veille.db"

ARTICLES = [
    {
        "slug": "veille-reglementaire-organisme-de-formation",
        "title": "Veille réglementaire pour organismes de formation : le guide complet 2026",
        "h1": "Veille réglementaire pour organismes de formation : le guide complet 2026",
        "excerpt": "Découvrez comment mettre en place une veille réglementaire efficace pour satisfaire les indicateurs 23 à 26 du référentiel Qualiopi et éviter les non-conformités lors de votre audit.",
        "category": "Veille",
        "cluster": "Veille réglementaire",
        "funnel": "TOFU",
        "keyword_main": "veille réglementaire organisme de formation",
        "meta_description": "Guide complet pour mettre en place votre veille réglementaire en tant qu'organisme de formation Qualiopi. Méthode, sources et outils pour les indicateurs 23 à 26.",
        "content_html": (
            "<h1>Veille réglementaire pour organismes de formation : le guide complet 2026</h1>"
            "<p>1 organisme de formation sur 3 échoue l'indicateur 23 lors du premier audit Qualiopi — non pas par manque de contenu réglementaire, mais par manque de <strong>méthode</strong>.</p>"
            "<h2>Qu'est-ce que la veille réglementaire pour un OF ?</h2>"
            "<p>La veille réglementaire désigne le processus structuré par lequel vous surveillez les évolutions législatives et réglementaires susceptibles d'impacter votre activité de formation.</p>"
            "<h2>Les 4 indicateurs Qualiopi concernés</h2>"
            "<ul><li><strong>Indicateur 23</strong> : Veille légale et réglementaire</li>"
            "<li><strong>Indicateur 24</strong> : Veille compétences et métiers</li>"
            "<li><strong>Indicateur 25</strong> : Veille innovations pédagogiques</li>"
            "<li><strong>Indicateur 26</strong> : Veille handicap et accessibilité</li></ul>"
            "<h2>Quelles sources surveiller</h2>"
            "<ul><li>Légifrance / JORF</li><li>France Compétences</li><li>Votre OPCO</li><li>France Travail</li></ul>"
            "<h2>Méthode en 5 étapes</h2>"
            "<ol><li>Cartographier vos obligations</li><li>Sélectionner 5 à 8 sources ciblées</li>"
            "<li>Fixer une fréquence hebdomadaire</li><li>Documenter chaque élément</li><li>Diffuser en interne</li></ol>"
            "<h2>FAQ</h2>"
            "<h3>Quelle fréquence satisfait l'indicateur 23 Qualiopi ?</h3>"
            "<p>Une revue hebdomadaire du JORF combinée à une synthèse mensuelle documentée est suffisante.</p>"
            "<p><strong>Recevez chaque semaine les textes réglementaires analysés par IA. <a href='/inscription'>Inscription gratuite</a></strong></p>"
        ),
        "word_count": 850,
        "read_time": "8 min",
        "published_at": "2026-03-23",
    },
    {
        "slug": "qualiopi-pour-les-nuls-guide-debutant",
        "title": "Qualiopi pour les nuls : tout comprendre en 10 minutes",
        "h1": "Qualiopi pour les nuls : tout comprendre en 10 minutes",
        "excerpt": "La certification Qualiopi est obligatoire pour accéder aux financements publics de la formation. On vous explique simplement ce que c'est, qui est concerné et comment l'obtenir.",
        "category": "Qualiopi",
        "cluster": "Qualiopi",
        "funnel": "TOFU",
        "keyword_main": "qualiopi pour les nuls",
        "meta_description": "Qualiopi expliqué simplement : qui est concerné, les 32 indicateurs, les organismes certificateurs et comment obtenir votre certification en 2026.",
        "content_html": (
            "<h1>Qualiopi pour les nuls : tout comprendre en 10 minutes</h1>"
            "<p>Depuis le 1er janvier 2022, pas de certification Qualiopi = pas d'accès aux financements publics de la formation. Voici tout ce que vous devez savoir.</p>"
            "<h2>C'est quoi Qualiopi ?</h2>"
            "<p>Qualiopi est la certification nationale obligatoire pour tous les organismes de formation qui souhaitent accéder aux fonds publics ou mutualisés (CPF, OPCO, France Travail, Régions). Elle remplace Datadock depuis 2022.</p>"
            "<h2>Qui est concerné ?</h2>"
            "<ul><li>Organismes de formation continue</li><li>CFA</li><li>Organismes de bilan de compétences</li><li>Organismes de VAE</li></ul>"
            "<h2>Comment obtenir la certification ?</h2>"
            "<ol><li>Choisir un organisme certificateur accrédité</li>"
            "<li>Préparer votre dossier de preuves</li>"
            "<li>Passer l'audit de certification</li>"
            "<li>Corriger les éventuelles non-conformités</li></ol>"
            "<h2>FAQ</h2>"
            "<h3>Qualiopi est-il obligatoire pour toutes les formations ?</h3>"
            "<p>Oui, si vos formations sont financées par des fonds publics (CPF, OPCO, France Travail, Régions).</p>"
            "<h3>Combien coûte la certification Qualiopi ?</h3>"
            "<p>Entre 1 500€ et 5 000€ pour la certification initiale selon l'organisme certificateur.</p>"
            "<p><strong>Automatisez votre veille Qualiopi. <a href='/inscription'>Essayer gratuitement</a></strong></p>"
        ),
        "word_count": 620,
        "read_time": "6 min",
        "published_at": "2026-03-23",
    },
    {
        "slug": "outils-veille-reglementaire-formation-comparatif",
        "title": "Outils de veille réglementaire pour organismes de formation : comparatif 2026",
        "h1": "Outils de veille réglementaire pour organismes de formation : comparatif 2026",
        "excerpt": "Google Alertes, newsletters ou solution IA ? Comparatif complet des outils de veille réglementaire pour satisfaire les indicateurs Qualiopi 23 à 26 sans y passer 3h par semaine.",
        "category": "Outils",
        "cluster": "Veille réglementaire",
        "funnel": "MOFU",
        "keyword_main": "outils de veille réglementaire formation",
        "meta_description": "Comparatif 2026 des outils de veille réglementaire pour organismes de formation Qualiopi : gratuit, newsletter, logiciel IA. Fonctionnalités et prix comparés.",
        "content_html": (
            "<h1>Outils de veille réglementaire pour organismes de formation : comparatif 2026</h1>"
            "<p>Le CPC de 13,48€ sur Google pour ce mot-clé n'est pas un hasard : les OF cherchent activement une solution pour automatiser leur veille Qualiopi. Voici le comparatif honnête.</p>"
            "<h2>Les 4 catégories d'outils</h2>"
            "<ul><li><strong>Manuel</strong> : RSS Légifrance, emails JORF</li>"
            "<li><strong>Newsletters spécialisées</strong> : agrégation humaine ou IA</li>"
            "<li><strong>Logiciels généralistes</strong> : Mention, Feedly, Google Alertes</li>"
            "<li><strong>Solutions IA dédiées formation</strong> : génération et classification automatique</li></ul>"
            "<h2>Comparatif des solutions</h2>"
            "<table><tr><th>Outil</th><th>Couverture</th><th>IA</th><th>Export Qualiopi</th><th>Prix</th></tr>"
            "<tr><td>VeilleFormation.fr</td><td>JORF + OPCO + AO</td><td>Oui</td><td>Oui</td><td>Gratuit → 79€/mois</td></tr>"
            "<tr><td>Formalerte</td><td>JORF uniquement</td><td>Non</td><td>Non</td><td>~30€/mois</td></tr>"
            "<tr><td>Google Alertes</td><td>Web général</td><td>Non</td><td>Non</td><td>Gratuit</td></tr></table>"
            "<h2>FAQ</h2>"
            "<h3>Un outil de veille suffit-il pour l'audit Qualiopi ?</h3>"
            "<p>L'outil couvre la collecte. Vous devez aussi documenter que vous avez exploité l'information (réunions, mises à jour de programmes).</p>"
            "<p><strong>Essayez VeilleFormation.fr sans CB. <a href='/inscription'>Je m'inscris</a></strong></p>"
        ),
        "word_count": 720,
        "read_time": "7 min",
        "published_at": "2026-03-23",
    },
    {
        "slug": "sources-veille-reglementaire-formation-professionnelle",
        "title": "15 sources incontournables pour votre veille réglementaire formation en 2026",
        "h1": "15 sources incontournables pour votre veille réglementaire formation en 2026",
        "excerpt": "Il existe plus de 50 sources de réglementation formation. Voici les 15 qui couvrent 95% de ce que l'auditeur Qualiopi attend, organisées par indicateur.",
        "category": "Veille",
        "cluster": "Veille réglementaire",
        "funnel": "TOFU",
        "keyword_main": "sources veille réglementaire formation professionnelle",
        "meta_description": "15 sources de veille réglementaire formation professionnelle à surveiller en 2026 : officielles, OPCO, régionales. Guide pratique pour organismes de formation Qualiopi.",
        "content_html": (
            "<h1>15 sources incontournables pour votre veille réglementaire formation en 2026</h1>"
            "<p>Il existe plus de 50 sources de réglementation formation. Les surveiller toutes est impossible. Voici les 15 qui couvrent 95% de ce que l'auditeur Qualiopi attend.</p>"
            "<h2>Sources officielles (indicateur 23)</h2>"
            "<ul><li><strong>Légifrance / JORF</strong> : tous les décrets et arrêtés formation</li>"
            "<li><strong>France Compétences</strong> : réglementation CPF, RNCP</li>"
            "<li><strong>Travail.gouv.fr</strong> : circulaires ministérielles</li></ul>"
            "<h2>Sources OPCO (indicateurs 23 et 24)</h2>"
            "<ul><li>Atlas OPCO — industrie, chimie</li><li>Opco EP — enseignement privé, sport</li>"
            "<li>Akto — services à forte main d'œuvre</li><li>Uniformation — ESS</li><li>AFDAS — culture, médias</li></ul>"
            "<h2>Sources emploi et compétences (indicateur 24)</h2>"
            "<ul><li>France Travail : études métiers, fiches ROME</li>"
            "<li>Observatoires de branches selon votre secteur</li></ul>"
            "<h2>Sources pédagogiques (indicateur 25)</h2>"
            "<ul><li>FFFOD : innovation e-learning</li><li>Thot Cursus : veille pédagogique</li></ul>"
            "<h2>FAQ</h2>"
            "<h3>Dois-je surveiller toutes ces sources chaque semaine ?</h3>"
            "<p>Non. Le JORF mérite une surveillance hebdomadaire. Les sources sectorielles peuvent être consultées mensuellement.</p>"
            "<p><strong>Toutes ces sources agrégées et résumées chaque semaine. <a href='/inscription'>Newsletter gratuite</a></strong></p>"
        ),
        "word_count": 680,
        "read_time": "6 min",
        "published_at": "2026-03-23",
    },
    {
        "slug": "formalerte-alternative-comparatif",
        "title": "Formalerte : avis complet et meilleures alternatives en 2026",
        "h1": "Formalerte : avis complet et meilleures alternatives en 2026",
        "excerpt": "Formalerte est l'outil de veille réglementaire formation le plus recherché. On fait le point honnête sur ses forces, ses limites et les alternatives pour les organismes Qualiopi.",
        "category": "Outils",
        "cluster": "Veille réglementaire",
        "funnel": "BOFU",
        "keyword_main": "formalerte alternative",
        "meta_description": "Avis complet sur Formalerte et comparatif des meilleures alternatives pour la veille réglementaire des organismes de formation Qualiopi en 2026.",
        "content_html": (
            "<h1>Formalerte : avis complet et meilleures alternatives en 2026</h1>"
            "<p>Formalerte génère 500 recherches par mois — c'est l'outil de veille formation le plus connu. Mais est-il suffisant pour vos indicateurs Qualiopi ? Réponse honnête.</p>"
            "<h2>Qu'est-ce que Formalerte ?</h2>"
            "<p>Formalerte est un service d'alertes sur les publications officielles liées à la formation professionnelle. Il couvre principalement le Journal Officiel.</p>"
            "<h2>Les forces de Formalerte</h2>"
            "<ul><li>Surveillance quotidienne du JORF</li><li>Alertes email paramétrables</li><li>Interface simple</li></ul>"
            "<h2>Les limites importantes</h2>"
            "<ul><li>Pas d'IA : pas de résumés, pas de classification par indicateur</li>"
            "<li>Couverture partielle : JORF uniquement, pas les OPCO ni appels d'offres</li>"
            "<li>Indicateurs 24, 25 et 26 non couverts</li></ul>"
            "<h2>Alternatives comparées</h2>"
            "<table><tr><th>Solution</th><th>IA</th><th>Indicateurs couverts</th><th>Prix</th></tr>"
            "<tr><td>VeilleFormation.fr</td><td>Oui</td><td>23 + 24 + 25 + 26</td><td>Gratuit → 79€/mois</td></tr>"
            "<tr><td>Formalerte</td><td>Non</td><td>23 uniquement</td><td>~30€/mois</td></tr></table>"
            "<h2>FAQ</h2>"
            "<h3>Formalerte est-il suffisant pour l'audit Qualiopi ?</h3>"
            "<p>Non. Il couvre l'indicateur 23 mais pas les indicateurs 24, 25 et 26. Vous aurez besoin de sources complémentaires.</p>"
            "<p><strong>Couvre les 4 indicateurs Qualiopi. <a href='/inscription'>Essayer VeilleFormation.fr gratuitement</a></strong></p>"
        ),
        "word_count": 610,
        "read_time": "6 min",
        "published_at": "2026-03-23",
    },
]

conn = sqlite3.connect(DB_PATH)
inserted = 0
for a in ARTICLES:
    cur = conn.execute(
        """INSERT OR IGNORE INTO blog_articles
           (slug, title, h1, excerpt, category, cluster, funnel, keyword_main,
            meta_description, content_html, word_count, read_time, published_at, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')""",
        (a["slug"], a["title"], a["h1"], a["excerpt"], a["category"], a["cluster"],
         a["funnel"], a["keyword_main"], a["meta_description"], a["content_html"],
         a["word_count"], a["read_time"], a["published_at"]),
    )
    inserted += cur.rowcount

conn.commit()
total = conn.execute("SELECT COUNT(*) FROM blog_articles").fetchone()[0]
print(f"Inseres : {inserted} | Total en base : {total}")
conn.close()
