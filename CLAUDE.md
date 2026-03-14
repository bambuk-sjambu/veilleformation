# VeilleFormation.fr

## Projet
Veille reglementaire automatisee par IA pour les organismes de formation certifies Qualiopi (45 000 OF en France).

## Stack
Python 3.12, Claude Haiku 4.5 (API batch), SQLite, Brevo (email), Netlify (frontend), PythonAnywhere (backend/cron)

## Architecture
- /collectors → Scripts de collecte (BOAMP API, Legifrance API, scrapers OPCO)
- /processors → Pipeline IA (resumes, classification Qualiopi, analyse d'impact)
- /publishers → Generateur newsletter HTML + integration Brevo
- /storage → Couche SQLite (articles, subscribers, newsletters)
- /scheduler → Orchestrateur cron (collecte quotidienne + envoi hebdo mardi 8h)
- /frontend → Landing page statique (HTML/CSS)
- /tests → Tests unitaires + integration

## Phases
- Phase 1 (MVP) : collecte BOAMP + Legifrance → resumes Claude Haiku → newsletter Brevo → landing page
- Phase 1.5 : scrapers 11 OPCO + France Travail + 13 Regions
- Phase 2 : dashboard Next.js, auth, Stripe, export PDF audit Qualiopi, personnalisation

## Sources de donnees
- BOAMP API (JSON, licence ouverte v2.0, filtre CPV 80500000)
- Legifrance API (gratuite, decrets/arretes formation pro)
- 11 OPCO (scraping HTML, appels a projets sectoriels)
- France Travail (13 pages regionales)
- Conseils Regionaux (13 pages AAP formation)

## Classification IA
- Indicateur 23 : Veille legale et reglementaire
- Indicateur 24 : Veille competences, metiers, emplois
- Indicateur 25 : Veille innovations pedagogiques et technologiques
- Indicateur 26 : Veille handicap et compensations

## Pricing
- Gratuit : newsletter hebdo, 1 theme
- Solo 15EUR/mois : tous themes + AO + alertes
- Equipe 39EUR/mois : 5 users, export Qualiopi, newsletter custom
- Agence 79EUR/mois : 20 users, multi-sites, API

## Documentation
- Etude d'opportunite : /home/stef/SJA/Veille Reglementaire Formation - Etude Opportunite.md
- Fiches Vibe Coding Studio : /home/stef/SJA/Projets/Veille Reglementaire Formation/
- Cahier des charges : /home/stef/SJA/Projets/Veille Reglementaire Formation/Cahier des Charges - VeilleFormation.md

## Commandes
- `python main.py collect` → lancer la collecte manuelle
- `python main.py newsletter` → generer et envoyer la newsletter
- `python main.py test` → lancer les tests
- `pytest` → tests unitaires

## Concurrence
- Veille Formation (39-97EUR/mois, ~40 clients, pas d'IA)
- Digiforma Veille (freemium, produit secondaire, 5 500 clients CRM)
- Aucun concurrent IA-native
