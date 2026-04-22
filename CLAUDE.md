# VeilleFormation.fr

## Projet
Veille reglementaire automatisee par IA pour les organismes de formation certifies Qualiopi (45 000 OF en France).

## Stack
**Backend:** Python 3.12, Claude Haiku 4.5 (API batch), SQLite, Brevo (email)
**Frontend:** Next.js 16, React 19, Tailwind CSS 4, iron-session, @react-pdf/renderer
**Hebergement:** Netlify (landing), Vercel (dashboard), PythonAnywhere (cron backend)

## Architecture
- /collectors → Scripts de collecte (BOAMP API, Legifrance API, scrapers OPCO)
- /processors → Pipeline IA (resumes, classification Qualiopi, analyse d'impact)
- /publishers → Generateur newsletter HTML + integration Brevo
- /storage → Couche SQLite (articles, subscribers, newsletters, users, actions)
- /scheduler → Orchestrateur cron (collecte quotidienne + envoi hebdo mardi 8h)
- /frontend → Dashboard Next.js + Landing page
- /tests → Tests unitaires + integration

## Phases
- **Phase 1 (MVP)** : ✅ collecte BOAMP + Legifrance → resumes Claude Haiku → newsletter Brevo → landing page
- **Phase 1.5** : 🔄 scrapers 11 OPCO + France Travail + 13 Regions
- **Phase 2 (SaaS)** : 🔄 dashboard Next.js, auth, Stripe, export PDF audit Qualiopi, personnalisation

## Phase 2 - Statut (2026-03-17)
- ✅ Authentification (iron-session)
- ✅ Dashboard Next.js (veille, AO, actions, settings, export, abonnement, import)
- ✅ Export PDF Audit Qualiopi (@react-pdf/renderer)
- ✅ Integration Stripe (checkout, webhook, portal)
- ✅ Systeme de plans (free, solo, equipe, agence)
- ✅ Restrictions par plan (export limite pour free, alertes solo+, equipe equipe+)
- ✅ Marquage articles (Lu/Interessant/A exploiter)
- ✅ Alertes personnalisees (mots-cles, regions, indicateurs)
- ✅ Systeme equipes (invitations, roles owner/admin/member)
- ✅ Upload contenu externe (URL et fichiers, classification IA)

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
- Gratuit : newsletter hebdo, 1 theme, export 1x/mois
- Solo 15EUR/mois : tous themes + AO + alertes + export illimite
- Equipe 39EUR/mois : 5 users, export Qualiopi avec logo, newsletter custom
- Agence 79EUR/mois : 20 users, multi-sites, API, white-label

## Documentation
- Cahier des charges : /home/stef/SJA/Projets/Veille Reglementaire Formation/Cahier des Charges - VeilleFormation.md
- Suivi fonctionnalites : ./SUIVI-FONCTIONNALITES.md
- Progress Phase 2 : ./PHASE2-PROGRESS.md
- **Index projets DEV** : `/home/stef/SJA/Projets/Projets DEV - Index.md`
- **Erreurs à ne pas reproduire** : `/home/stef/SJA/Ma base de connaissances/Erreurs à ne pas reproduire.md`
- **Erreurs Claude** : `/home/stef/SJA/Ma base de connaissances/Erreurs Claude à ne pas reproduire.md`

> Consulter les fichiers erreurs AVANT chaque session. Ajouter toute nouvelle erreur dès qu'elle est résolue.

## Commandes
- `python main.py collect` → lancer la collecte manuelle
- `python main.py newsletter` → generer et envoyer la newsletter
- `python main.py test` → lancer les tests
- `pytest` → tests unitaires Python
- `cd frontend && npm run dev` → lancer le dashboard en dev

## Concurrence
- Veille Formation (39-97EUR/mois, ~40 clients, pas d'IA)
- Digiforma Veille (freemium, produit secondaire, 5 500 clients CRM)
- Aucun concurrent IA-native
