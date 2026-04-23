# Suivi des Fonctionnalites -- Cipia

> Derniere mise a jour : 2026-03-18
> Base sur le Cahier des Charges v1.2
> Reference : /home/stef/SJA/Projets/Veille Reglementaire Formation/Cahier des Charges - Cipia.md

---

## Legende

- OK -- Implemente + teste
- PARTIEL -- Implemente, non teste (ou partiellement)
- NON -- Non implemente
- ENCOURS -- En cours / partiel
- BLOQUE -- Bloque (dependance externe)

---

## Synthese par Phase

### Phase 1 -- MVP Newsletter (~75% complet)
| Module | Nom | Completion estimee | Statut |
|--------|-----|-------------------|--------|
| 1 | Collecteur BOAMP | ~75% | PARTIEL |
| 2 | Collecteur Legifrance | ~80% | OK |
| 3 | Pipeline IA | ~70% | PARTIEL |
| 4 | Generateur Newsletter | ~90% | OK |
| 5 | Integration Brevo | ~85% | OK |
| 6 | Landing Page | ~75% | PARTIEL |
| 7 | Base de donnees SQLite | ~85% | OK |
| 8 | Orchestrateur | ~65% | PARTIEL |
| 9 | Monitoring | ~20% | ENCOURS |

### Phase 1.5 -- Sources etendues (~70% complet)
| Module | Nom | Completion estimee | Statut |
|--------|-----|-------------------|--------|
| 10 | Scrapers OPCO (6/11 fonctionnels) | ~55% | PARTIEL |
| 10b | RSS Feeds (2 OPCO) | ~90% | OK |
| 10c | Playwright Collectors | ~70% | OK |
| 11 | France Travail | ~30% | PARTIEL |
| 12 | Conseils Regionaux (13 sites) | ~40% | PARTIEL |
| 13 | Agregateurs marches publics | ~20% | PARTIEL |

### Phase 2 -- SaaS Freemium (~85% complet)
| Module | Nom | Completion estimee | Statut |
|--------|-----|-------------------|--------|
| 10 | Authentification | ~100% | OK -- iron-session, login/register/logout, middleware |
| 11 | Dashboard Next.js | ~100% | OK -- veille, AO, plan action, settings, export, import |
| 12 | Systeme de plans | ~100% | OK -- colonne plan, restrictions export/alertes/equipes/import |
| 13 | Stripe Integration | ~70% | PARTIEL -- checkout/webhook/portal routes, manque config env |
| 14 | Export PDF Audit | ~100% | OK -- react-pdf, 4 pages, profil, indicateurs |
| 15 | Alertes personnalisees | ~100% | OK -- table alerts, API CRUD, UI parametres |
| 16 | Systeme equipes | ~100% | OK -- tables teams/members/invitations, API, UI |
| 17 | Upload contenu externe | ~100% | OK -- table external_contents, API, UI, traitement IA |
| 18 | Marquage articles | ~50% | PARTIEL -- API read_status, manque UI |

---

## Phase 2 -- Details par Module

### Module 10 : Authentification (F2.1)

| ID | Fonctionnalite | Statut | Fichier |
|----|----------------|--------|---------|
| F2.1-01 | Inscription email + mot de passe | OK | frontend/src/app/api/auth/register/route.ts |
| F2.1-02 | Connexion email + mot de passe | OK | frontend/src/app/api/auth/login/route.ts |
| F2.1-03 | Deconnexion | OK | frontend/src/app/api/auth/logout/route.ts |
| F2.1-04 | Session iron-session | OK | frontend/src/lib/session.ts |
| F2.1-05 | Roles (user, solo, team_admin, team_member, agency_admin) | PARTIEL | colonne plan seulement |
| F2.1-06 | Verification email | NON | - |
| F2.1-07 | Protection routes dashboard | OK | frontend/src/app/dashboard/layout.tsx |

### Module 11 : Dashboard Next.js (F2.2)

| ID | Fonctionnalite | Statut | Fichier |
|----|----------------|--------|---------|
| F2.2-01 | Feed veille avec filtres | OK | frontend/src/app/dashboard/veille/page.tsx |
| F2.2-02 | Filtre par indicateur Qualiopi (23/24/25/26) | OK | frontend/src/app/dashboard/veille/page.tsx |
| F2.2-03 | Filtre par impact (Fort/Moyen/Faible) | OK | frontend/src/app/dashboard/veille/page.tsx |
| F2.2-04 | Filtre favoris | OK | frontend/src/app/dashboard/veille/page.tsx |
| F2.2-05 | Feed AO avec scoring | OK | frontend/src/app/dashboard/appels-offres/page.tsx |
| F2.2-06 | Plan d'action CRUD | OK | frontend/src/app/dashboard/plan-action/page.tsx |
| F2.2-07 | Page parametres profil | OK | frontend/src/app/dashboard/settings/page.tsx |
| F2.2-08 | Page export PDF | OK | frontend/src/app/dashboard/export/page.tsx |
| F2.2-09 | Page abonnement | OK | frontend/src/app/dashboard/abonnement/page.tsx |
| F2.2-10 | Navigation sidebar | OK | frontend/src/components/DashboardShell.tsx |

### Module 12 : Systeme de plans

| ID | Fonctionnalite | Statut | Fichier |
|----|----------------|--------|---------|
| F12-01 | Colonne plan dans users | OK | frontend/src/lib/db.ts |
| F12-02 | 4 plans (free, solo, equipe, agence) | OK | frontend/src/lib/plan.ts |
| F12-03 | Restriction exports (1/mois free) | OK | frontend/src/lib/plan.ts |
| F12-04 | Log des exports | OK | frontend/src/lib/plan.ts |
| F12-05 | UI upgrade/downgrade | PARTIEL | frontend/src/app/dashboard/abonnement/page.tsx |
| F12-06 | Restrictions features par plan | PARTIEL | - |

### Module 13 : Stripe Integration

| ID | Fonctionnalite | Statut | Fichier |
|----|----------------|--------|---------|
| F13-01 | Route checkout | OK | frontend/src/app/api/stripe/checkout/route.ts |
| F13-02 | Route webhook | OK | frontend/src/app/api/stripe/webhook/route.ts |
| F13-03 | Route portal | OK | frontend/src/app/api/stripe/portal/route.ts |
| F13-04 | Colonnes stripe_customer_id | OK | frontend/src/lib/db.ts |
| F13-05 | Colonnes stripe_subscription_id | OK | frontend/src/lib/db.ts |
| F13-06 | Price IDs configurables | OK | frontend/src/lib/stripe.ts |
| F13-07 | Configuration .env | NON | Variables a definir |
| F13-08 | Webhook signature verification | OK | frontend/src/app/api/stripe/webhook/route.ts |
| F13-09 | Handling subscription events | OK | checkout.session.completed, subscription.updated/deleted |

### Module 14 : Export PDF Audit Qualiopi

| ID | Fonctionnalite | Statut | Fichier |
|----|----------------|--------|---------|
| F14-01 | Page de garde avec info entreprise | OK | frontend/src/lib/audit-pdf.tsx |
| F14-02 | Resume executif avec KPIs | OK | frontend/src/lib/audit-pdf.tsx |
| F14-03 | Detail par indicateur (23-26) | OK | frontend/src/lib/audit-pdf.tsx |
| F14-04 | Liste actions menees | OK | frontend/src/lib/audit-pdf.tsx |
| F14-05 | Repartition impact graphique | OK | frontend/src/lib/audit-pdf.tsx |
| F14-06 | Sources de veille | OK | frontend/src/lib/audit-pdf.tsx |
| F14-07 | Methodologie configurable | OK | frontend/src/lib/audit-pdf.tsx |
| F14-08 | Section signatures | OK | frontend/src/lib/audit-pdf.tsx |
| F14-09 | Telechargement PDF | OK | frontend/src/app/api/export/audit/route.tsx |
| F14-10 | Selection plage dates | OK | frontend/src/app/dashboard/export/page.tsx |

### Module 18 : Marquage articles

| ID | Fonctionnalite | Statut | Fichier |
|----|----------------|--------|---------|
| F18-01 | Colonne read_status | OK | frontend/src/lib/db.ts |
| F18-02 | Statuts (a_lire, interessant, a_exploiter) | OK | frontend/src/lib/db.ts |
| F18-03 | API read-status | OK | frontend/src/app/api/articles/read-status/route.ts |
| F18-04 | UI dropdown marquage | NON | - |
| F18-05 | Filtre par statut | NON | - |
| F18-06 | Inclusion dans export PDF | NON | - |

---

## Phase 1 -- MVP Newsletter

### Module 1 : Collecteur BOAMP (F1.1)

| ID | Regle de gestion / Fonctionnalite | Statut | Fichier | Test |
|----|-----------------------------------|--------|---------|------|
| F1.1-01 | URL API BOAMP (PAPS finances.gouv.fr) | NON | collectors/boamp.py:L17 utilise OpenDataSoft au lieu de `api.paps.finances.gouv.fr` | - |
| F1.1-02 | Fallback open data DILA | NON | Non implemente | - |
| F1.1-03 | Appel API BOAMP 2x/jour (6h et 18h) | NON | Pas de scheduling dans le code, depend du cron externe non configure | - |
| F1.1-04 | Filtre primaire CPV 80500000 | PARTIEL | collectors/boamp.py:L49 -- `CPV_CODE` declare mais non utilise dans `_build_query()` (filtre par mots-cles seulement) | - |
| F1.1-05 | 14 mots-cles d'inclusion | OK | collectors/boamp.py:L20-36 -- 15 mots-cles (1 de plus que le CDC) | test_collectors.py::TestBOAMPCollector::test_parses_sample_response |
| F1.1-06 | 5 mots-cles d'exclusion | OK | collectors/boamp.py:L39-46 -- 6 termes d'exclusion | test_collectors.py::TestBOAMPCollector::test_excludes_irrelevant |
| F1.1-07 | Extraction titre | OK | collectors/boamp.py:L111 | test_collectors.py::TestBOAMPCollector::test_parses_sample_response |
| F1.1-08 | Extraction organisme acheteur | OK | collectors/boamp.py:L115 | test_collectors.py::TestBOAMPCollector::test_parses_sample_response |
| F1.1-09 | Extraction description | OK | collectors/boamp.py:L113 | test_collectors.py::TestBOAMPCollector::test_parses_sample_response |
| F1.1-10 | Extraction montant estime | OK | collectors/boamp.py:L98-106 | test_collectors.py::TestBOAMPCollector::test_parses_sample_response |
| F1.1-11 | Extraction date limite | OK | collectors/boamp.py:L116 | test_collectors.py::TestBOAMPCollector::test_parses_sample_response |
| F1.1-12 | Extraction zone geographique | OK | collectors/boamp.py:L94-96 | test_collectors.py::TestBOAMPCollector::test_parses_sample_response |
| F1.1-13 | Extraction lots | NON | Non implemente | - |
| F1.1-14 | Extraction criteres d'attribution | NON | Non implemente | - |
| F1.1-15 | Extraction type de procedure | NON | Non implemente (MAPA/formalise) | - |
| F1.1-16 | Deduplication par source_id (boamp-{id}) | OK | collectors/boamp.py:L121 + storage/database.py:L120 `INSERT OR IGNORE` | test_collectors.py::TestBaseCollector::test_save_deduplicates |
| F1.1-17 | Stockage SQLite via INSERT OR IGNORE | OK | storage/database.py:L120 | test_database.py::TestInsertArticle::test_dedup_same_source_id |
| F1.1-18 | Pas de cle API requise | OK | collectors/boamp.py -- aucune authentification | - |
| F1.1-19 | Signature `collect_boamp(date_min, date_max)` | PARTIEL | collectors/boamp.py:L135 -- `collect()` sans param date_min/date_max, utilise `days_back` | - |
| F1.1-20 | Signature `filter_annonces(annonces)` | PARTIEL | collectors/boamp.py:L82 -- `_is_relevant(record)` (filtre unitaire, pas liste) | - |
| F1.1-21 | Signature `parse_annonce(raw)` | OK | collectors/boamp.py:L108 -- `_parse_record(record)` | test_collectors.py::TestBOAMPCollector::test_parses_sample_response |
| F1.1-22 | Signature `save_annonces(annonces, db_path)` | OK | collectors/base.py:L32 -- `save(articles)` | test_collectors.py::TestBaseCollector::test_save_inserts_articles |
| F1.1-23 | Min 5 AO/jour en moyenne | NON | Non verifie, pas encore en production | - |
| F1.1-24 | Aucun doublon apres 7 jours | OK | Garanti par `INSERT OR IGNORE` sur `source_id UNIQUE` | test_database.py::TestInsertArticle::test_dedup_same_source_id |
| F1.1-25 | Temps execution < 2 min | NON | Non mesure | - |
| F1.1-26 | Retry x3 avec backoff exponentiel (30s, 60s, 120s) | NON | Pas de retry implemente, un seul essai | - |
| F1.1-27 | Alerte email si echec 3 jours consecutifs | NON | Pas de monitoring d'echecs consecutifs | - |
| F1.1-28 | Gestion erreur API (timeout, HTTP error) | OK | collectors/boamp.py:L153-157 -- try/except requests.RequestException | test_collectors.py::TestBOAMPCollector::test_handles_api_error |
| F1.1-29 | Pagination des resultats | OK | collectors/boamp.py:L145-179 -- pagination avec offset, max 10 pages | - |
| F1.1-30 | Gestion reponse vide | OK | collectors/boamp.py:L162-164 | test_collectors.py::TestBOAMPCollector::test_handles_empty_response |

---

### Module 2 : Collecteur Legifrance (F1.2)

| ID | Regle de gestion / Fonctionnalite | Statut | Fichier | Test |
|----|-----------------------------------|--------|---------|------|
| F1.2-01 | Auth OAuth2 client_credentials via PISTE | OK | collectors/legifrance.py:L62-83 -- `_get_token()` | test_collectors.py::TestLegifranceCollector::test_parses_results |
| F1.2-02 | Recherche JORF (POST /search) | OK | collectors/legifrance.py:L85-150 -- `_search()` | test_collectors.py::TestLegifranceCollector::test_parses_results |
| F1.2-03 | Consultation texte complet (POST /consult/jorf) | NON | Non implemente -- seuls les resultats de recherche sont utilises | - |
| F1.2-04 | Recherche Code du travail (fond LEGI) | NON | collectors/legifrance.py:L136 -- uniquement fond "JORF" | - |
| F1.2-05 | Appel API 1x/jour (7h) | NON | Pas de scheduling, depend du cron externe non configure | - |
| F1.2-06 | Types de textes : DECRET, ARRETE, LOI, ORDONNANCE, CIRCULAIRE | PARTIEL | Pas de filtre explicite par nature de texte dans la requete | - |
| F1.2-07 | 19 mots-cles de recherche | OK | collectors/legifrance.py:L22-42 -- 19 mots-cles (`SEARCH_KEYWORDS`) | test_collectors.py::TestLegifranceCollector::test_parses_results |
| F1.2-08 | Filtres codes Code du travail (L.6311-1 a L.6363-2, etc.) | NON | Non implemente | - |
| F1.2-09 | Filtre date signature | OK | collectors/legifrance.py:L119-124 -- filtre DATE_SIGNATURE | - |
| F1.2-10 | Filtre statut en vigueur (TEXT_LEGAL_STATUS = VIGUEUR) | OK | collectors/legifrance.py:L126-129 | - |
| F1.2-11 | Extraction titre | OK | collectors/legifrance.py:L154-155 | test_collectors.py::TestLegifranceCollector::test_parses_results |
| F1.2-12 | Extraction date publication | OK | collectors/legifrance.py:L172-181 -- `signatureDate` | test_collectors.py::TestLegifranceCollector::test_parses_results |
| F1.2-13 | Extraction type (nature) | NON | Non extrait du resultat API | - |
| F1.2-14 | Extraction texte integral (articles concatenes) | NON | Pas de `fetch_full_text()`, seul l'abstract est recupere | - |
| F1.2-15 | Extraction lien source | OK | collectors/legifrance.py:L162 | test_collectors.py::TestLegifranceCollector::test_parses_results |
| F1.2-16 | Extraction code NOR | OK | collectors/legifrance.py:L168 | - |
| F1.2-17 | Deduplication par source_id (legifrance-{textId}) | OK | collectors/legifrance.py:L183-185 + L220-223 `seen_ids` | test_collectors.py::TestLegifranceCollector::test_deduplicates_across_keywords |
| F1.2-18 | Gestion token OAuth2 avec renouvellement auto | PARTIEL | collectors/legifrance.py:L62-83 -- token mis en cache mais pas de renouvellement sur expiration | - |
| F1.2-19 | Rate limiting 2s entre requetes | NON | Pas de delai entre les appels API dans `collect()` | - |
| F1.2-20 | Max 500 requetes/jour | NON | Pas de compteur de requetes | - |
| F1.2-21 | Signature `collect_legifrance(date_debut, date_fin)` | PARTIEL | collectors/legifrance.py:L194 -- `collect()` sans param, utilise `days_back` | - |
| F1.2-22 | Signature `fetch_full_text(text_id, auth)` | NON | Non implemente | - |
| F1.2-23 | Signature `parse_texte(search_result, full_text)` | PARTIEL | collectors/legifrance.py:L152 -- `_parse_result(result)` sans full_text | - |
| F1.2-24 | Textes publies dans les dernieres 24h | PARTIEL | Configurable via `days_back` (defaut 30 jours, pas 1 jour) | - |
| F1.2-25 | Temps execution < 3 min | NON | Non mesure | - |
| F1.2-26 | Retry + renouvellement token OAuth2 | NON | Pas de retry, pas de renouvellement auto du token | - |
| F1.2-27 | Graceful degradation si credentials manquants | OK | collectors/legifrance.py:L199-205 -- retourne [] avec warning | test_collectors.py::TestLegifranceCollector::test_missing_credentials_returns_empty |
| F1.2-28 | Gestion erreur auth | OK | collectors/legifrance.py:L81-83 | test_collectors.py::TestLegifranceCollector::test_token_failure_returns_empty |

#### Module 2bis : Collecteur LegifranceRSS (fallback sans OAuth2)

| ID | Regle de gestion / Fonctionnalite | Statut | Fichier | Test |
|----|-----------------------------------|--------|---------|------|
| F1.2b-01 | Flux Atom LegifranceRSS (pas de credentials) | OK | collectors/legifrance_rss.py:L28 -- `RSS_FEED_URL` | test_legifrance_rss.py::TestCollectFromRss |
| F1.2b-02 | Filtrage par 26 mots-cles formation | OK | collectors/legifrance_rss.py:L41-66 -- `FORMATION_KEYWORDS` | test_legifrance_rss.py::TestIsRelevant (10 tests) |
| F1.2b-03 | Filtrage par type de texte (decret, arrete, loi, etc.) | OK | collectors/legifrance_rss.py:L69-79 -- `TEXT_TYPES` | test_legifrance_rss.py::TestIsValidType (10 tests) |
| F1.2b-04 | Parsing entrees Atom XML | OK | collectors/legifrance_rss.py:L191-239 -- `_parse_atom_entry()` | test_legifrance_rss.py::TestParseAtomEntry (3 tests) |
| F1.2b-05 | Parsing dates ISO 8601 multiformats | OK | collectors/legifrance_rss.py:L241-264 -- `_parse_date()` | test_legifrance_rss.py::TestParseDate (6 tests) |
| F1.2b-06 | Extraction JORFTEXT ID depuis URL | OK | collectors/legifrance_rss.py:L105-115 -- `_extract_text_id()` | test_legifrance_rss.py::TestExtractTextId (4 tests) |
| F1.2b-07 | Deduplication par source_id entre natures | OK | collectors/legifrance_rss.py:L286-289 -- `seen_ids` | test_legifrance_rss.py::TestCollectFromRss::test_collect_deduplication |
| F1.2b-08 | Deduplication croisee RSS/JORF | OK | collectors/legifrance_rss.py:L734-740 -- cross-check `_extract_text_id` | test_legifrance_rss.py::TestCollect::test_collect_deduplicates_across_sources |
| F1.2b-09 | Scraping page JORF complementaire | OK | collectors/legifrance_rss.py:L309-368 -- `_collect_from_jorf()` | - |
| F1.2b-10 | Resilience si RSS echoue (JORF continue) | OK | collectors/legifrance_rss.py:L720-727 -- try/except | test_legifrance_rss.py::TestCollect::test_collect_resilient_to_rss_failure |
| F1.2b-11 | Collecte historique DILA (archives .tar.gz) | OK | collectors/legifrance_rss.py:L591-700 -- `collect_history()` | test_legifrance_rss.py::TestCollectHistory (3 tests) |
| F1.2b-12 | Parsing XML JORF dans archives | OK | collectors/legifrance_rss.py:L398-513 -- `_parse_jorf_xml_text()` | test_legifrance_rss.py::TestParseJorfXmlText (4 tests) |
| F1.2b-13 | Filtrage archives par date (semaines) | OK | collectors/legifrance_rss.py:L634-638 -- filtre cutoff_date | test_legifrance_rss.py::TestCollectHistory::test_collect_history_date_filtering |
| F1.2b-14 | Rate limiting serveur DILA (1s entre archives) | OK | collectors/legifrance_rss.py:L678-679 -- `time.sleep(1)` | - |
| F1.2b-15 | Nettoyage fichiers temporaires | OK | collectors/legifrance_rss.py:L586-587 -- `shutil.rmtree` dans finally | - |
| F1.2b-16 | Sauvegarde en base + stats de collecte | OK | collectors/legifrance_rss.py:L684-698 | test_legifrance_rss.py::TestRun::test_run_inserts_into_db |
| F1.2b-17 | 713 textes collectes sur 4 semaines (production) | OK | Resultat reel de la collecte historique | - |

---

### Module 3 : Pipeline IA (F1.3)

| ID | Regle de gestion / Fonctionnalite | Statut | Fichier | Test |
|----|-----------------------------------|--------|---------|------|
| F1.3-01 | Modele Claude Haiku 4.5 | OK | processors/pipeline.py:L45 -- `claude-haiku-4-5-20251001` | - |
| F1.3-02 | Resume 3-5 phrases en francais | OK | processors/prompts.py:L7 -- instruction dans le prompt | test_processors.py::TestProcessArticle::test_process_boamp_article_success |
| F1.3-03 | Ton professionnel, factuel | OK | processors/prompts.py:L7 -- specifie dans le prompt | - |
| F1.3-04 | Classification Qualiopi (indicateurs 23/24/25/26) | OK | processors/prompts.py:L9-10 -- dans le prompt systeme | test_processors.py::TestProcessArticle::test_qualiopi_indicators_stored_as_json |
| F1.3-05 | Multi-indicateurs possibles | OK | processors/prompts.py:L9 -- "Liste des indicateurs" | test_processors.py::TestProcessArticle::test_qualiopi_indicators_stored_as_json |
| F1.3-06 | Impact fort/moyen/faible | OK | processors/pipeline.py:L137-141 -- validation des valeurs | test_processors.py::TestValidateResponse::test_invalid_impact_level_raises |
| F1.3-07 | Phrase d'impact justificative | OK | processors/prompts.py:L8 -- `impact_justification` | test_processors.py::TestProcessArticle::test_process_boamp_article_success |
| F1.3-08 | Classification AO : typologie_ao | OK | processors/prompts.py:L26 -- formation, bilan_competences, vae, conseil | test_processors.py::TestValidateResponse::test_missing_typologie_ao_for_ao_raises |
| F1.3-09 | Scoring pertinence 1-10 | OK | processors/pipeline.py:L144-148 -- validation 1-10 | test_processors.py::TestValidateResponse::test_invalid_relevance_score_too_high |
| F1.3-10 | API Batch Anthropic (POST /v1/messages/batches) | NON | processors/pipeline.py -- utilise `client.messages.create` (appels individuels) | - |
| F1.3-11 | Polling batch toutes les 60s, timeout 30 min | NON | Pas d'API Batch | - |
| F1.3-12 | Fallback requetes individuelles si batch echoue | PARTIEL | Seul le mode individuel est implemente (pas de batch du tout) | - |
| F1.3-13 | Prix reduit 50% en mode batch | NON | Mode batch non implemente | - |
| F1.3-14 | Prompt systeme AO vs reglementaire | OK | processors/prompts.py:L31-42 -- `get_system_prompt()` | test_processors.py::TestPromptSelection (6 tests) |
| F1.3-15 | Prompt utilisateur avec champs AO | OK | processors/prompts.py:L45-86 -- `build_user_prompt()` avec extra_parts | test_processors.py::TestBuildUserPrompt (4 tests) |
| F1.3-16 | Parsing JSON avec gestion code blocks markdown | OK | processors/pipeline.py:L92-115 -- `parse_json_response()` | test_processors.py::TestParseJsonResponse (7 tests) |
| F1.3-17 | Validation champs requis (7 base + 1 AO) | OK | processors/pipeline.py:L117-150 -- `validate_response()` | test_processors.py::TestValidateResponse (7 tests) |
| F1.3-18 | Statuts : new -> processing -> done / failed | OK | processors/pipeline.py:L174 + L217 + L256 | test_processors.py::TestProcessArticle::test_process_article_api_error_sets_failed |
| F1.3-19 | Suivi tokens (input + output) | OK | processors/pipeline.py:L188-191 | test_processors.py::TestProcessArticle::test_process_article_tracks_tokens |
| F1.3-20 | Estimation cout EUR | OK | processors/pipeline.py:L293-304 | test_processors.py::TestCostEstimation (3 tests) |
| F1.3-21 | Rate limiting entre appels (0.5s) | OK | processors/pipeline.py:L56 + L289 | - |
| F1.3-22 | Retry articles failed | OK | processors/pipeline.py:L367-404 -- `retry_failed()` | test_processors.py::TestRetryFailed (2 tests) |
| F1.3-23 | Methode `run()` avec stats completes | OK | processors/pipeline.py:L306-365 | test_processors.py::TestRun (3 tests) |
| F1.3-24 | Champ `titre_reformule` en sortie | NON | Non implemente (le CDC demande un titre reformule) | - |
| F1.3-25 | Champ `mots_cles` en sortie | NON | Non implemente | - |
| F1.3-26 | Champ `date_entree_vigueur` en sortie | NON | Non implemente | - |
| F1.3-27 | Champ `theme_formation` en sortie | NON | Non implemente | - |
| F1.3-28 | Champ `pertinence` (bool) en sortie | NON | Non implemente (utilise `relevance_score` a la place) | - |
| F1.3-29 | Signature `create_batch(articles) -> str` | NON | Batch API non implemente | - |
| F1.3-30 | Signature `poll_batch(batch_id, timeout)` | NON | Batch API non implemente | - |
| F1.3-31 | 100% traites dans les 30 min | NON | Non mesure | - |
| F1.3-32 | Cout < 5 EUR/mois pour 1000 articles | PARTIEL | Estimation implementee (pipeline.py:L293), mais pas de garde-fou budget | - |

---

### Module 4 : Generateur Newsletter (F1.4)

| ID | Regle de gestion / Fonctionnalite | Statut | Fichier | Test |
|----|-----------------------------------|--------|---------|------|
| F1.4-01 | Section 1 : Reglementaire (max 5, tri impact) | OK | publishers/newsletter.py:L100-102 | test_newsletter.py::TestSelectArticles::test_select_articles_sorting |
| F1.4-02 | Section 2 : AO (max 10, tri deadline ASC + scoring DESC) | OK | publishers/newsletter.py:L104-111 | test_newsletter.py::TestSelectArticles::test_select_articles_respects_limits |
| F1.4-03 | Section 3 : Veille metier (max 3, indicateurs 24/25) | OK | publishers/newsletter.py:L113-115 | test_newsletter.py::TestSelectArticles::test_select_articles_with_data |
| F1.4-04 | Section 4 : Veille handicap (max 2, indicateur 26) | OK | publishers/newsletter.py:L117-119 | - |
| F1.4-05 | Section 5 : Chiffre de la semaine | OK | publishers/newsletter.py:L372-383 -- template HTML avec `stats.total` | test_newsletter.py::TestGenerateHTML::test_generate_newsletter_html_basic |
| F1.4-06 | Header : lien "Voir en ligne" (archive_url) | OK | publishers/newsletter.py:L213-214 -- `archive_url` dans template | - |
| F1.4-07 | Footer : desabonnement | OK | publishers/newsletter.py:L406 -- `unsubscribe_url` | - |
| F1.4-08 | Footer : lien web + contact + mention IA | OK | publishers/newsletter.py:L398-412 | - |
| F1.4-09 | Template Jinja2 HTML responsive | OK | publishers/newsletter.py:L189-424 -- template inline CSS complet | test_newsletter.py::TestGenerateHTML (4 tests) |
| F1.4-10 | Largeur max 600px | OK | publishers/newsletter.py:L204 -- `width="600"` | - |
| F1.4-11 | Inline CSS | OK | publishers/newsletter.py:L189-424 -- tout en inline styles | - |
| F1.4-12 | Couleurs : bleu #1E40AF, ambre #F59E0B, vert #10B981 | OK | publishers/newsletter.py:L25-29 | test_newsletter.py::TestGenerateHTML::test_generate_newsletter_html_impact_badges |
| F1.4-13 | Badges impact colores (Fort=rouge, Moyen=ambre, Faible=vert) | OK | publishers/newsletter.py:L25-35 -- `IMPACT_COLORS` | test_newsletter.py::TestGenerateHTML::test_generate_newsletter_html_impact_badges |
| F1.4-14 | Images hebergees sur Netlify (pas base64) | PARTIEL | Aucune image dans le template actuel | - |
| F1.4-15 | Filtre status='done' AND sent_in_newsletter_id IS NULL | OK | publishers/newsletter.py:L58-67 | test_newsletter.py::TestSelectArticles::test_select_articles_excludes_already_sent |
| F1.4-16 | Filtre par semaine (published_date BETWEEN) | OK | publishers/newsletter.py:L64 | test_newsletter.py::TestSelectArticles::test_select_articles_with_data |
| F1.4-17 | Marquer articles sent_in_newsletter_id + status='sent' | OK | publishers/newsletter.py:L490-522 -- `mark_articles_as_sent()` | test_newsletter.py::TestMarkArticlesAsSent (2 tests) |
| F1.4-18 | Signature `select_articles_for_newsletter()` | OK | publishers/newsletter.py:L42 | test_newsletter.py::TestSelectArticles (5 tests) |
| F1.4-19 | Signature `generate_newsletter_html()` | OK | publishers/newsletter.py:L427 | test_newsletter.py::TestGenerateHTML (4 tests) |
| F1.4-20 | Signature `generate_newsletter_subject()` | OK | publishers/newsletter.py:L159 | test_newsletter.py::TestGenerateSubject (3 tests) |
| F1.4-21 | Signature `mark_articles_as_sent()` | OK | publishers/newsletter.py:L490 | test_newsletter.py::TestMarkArticlesAsSent (2 tests) |
| F1.4-22 | Generation < 30 secondes | NON | Non mesure | - |
| F1.4-23 | HTML correct Gmail/Outlook/Apple Mail | NON | Non teste manuellement | - |
| F1.4-24 | Taille email < 100 Ko | NON | Non mesure (html_size_kb disponible dans `create_newsletter`) | - |
| F1.4-25 | 800-1200 mots, 5 min lecture | NON | Non mesure | - |
| F1.4-26 | Erreur si 0 articles | OK | publishers/newsletter.py:L453-454 -- `raise ValueError` | test_newsletter.py::TestGenerateHTML::test_generate_newsletter_html_raises_on_zero_articles |
| F1.4-27 | Pipeline complet create_newsletter() | OK | publishers/newsletter.py:L529-603 | test_newsletter.py::TestCreateNewsletter (2 tests) |
| F1.4-28 | Objet email avec emoji si impact fort | OK | publishers/newsletter.py:L176-178 | test_newsletter.py::TestGenerateSubject::test_generate_newsletter_subject_high_impact |

---

### Module 5 : Integration Brevo (F1.5)

| ID | Regle de gestion / Fonctionnalite | Statut | Fichier | Test |
|----|-----------------------------------|--------|---------|------|
| F1.5-01 | POST /v3/contacts (creer/MAJ contact) | OK | publishers/brevo.py:L131-159 -- `add_subscriber()` | test_brevo.py::TestAddSubscriber (3 tests) |
| F1.5-02 | GET /v3/contacts/{email} (recuperer contact) | NON | Non implemente | - |
| F1.5-03 | POST /v3/emailCampaigns (creer campagne) | OK | publishers/brevo.py:L197-261 -- `create_and_send_campaign()` | test_brevo.py::TestCreateAndSendCampaign (2 tests) |
| F1.5-04 | POST /v3/emailCampaigns/{id}/sendNow | OK | publishers/brevo.py:L245-255 | test_brevo.py::TestCreateAndSendCampaign::test_create_and_send_campaign |
| F1.5-05 | POST /v3/smtp/email (transactionnel) | OK | publishers/brevo.py:L313-334 -- `send_transactional_email()` | test_brevo.py::TestSendTransactionalEmail (2 tests) |
| F1.5-06 | GET /v3/emailCampaigns/{id} (stats) | OK | publishers/brevo.py:L267-307 -- `get_campaign_stats()` | test_brevo.py::TestGetCampaignStats (1 test) |
| F1.5-07 | Liste configurable via BREVO_LIST_ID | OK | publishers/brevo.py:L56 | test_brevo.py::TestInit::test_init_with_api_key |
| F1.5-08 | Envoi mardi 8h00 | PARTIEL | main.py:L201-206 -- verification jour mardi, mais pas de scheduling cron | - |
| F1.5-09 | Sync desabonnements (emailBlacklisted) | OK | publishers/brevo.py:L340-409 -- `sync_unsubscribes()` | - |
| F1.5-10 | Stats 48h apres envoi (jeudi 8h) | PARTIEL | publishers/brevo.py:L411-460 -- `fetch_and_store_stats()` implemente, mais pas de commande CLI `stats` | - |
| F1.5-11 | Rate limiter 400 req/min | OK | publishers/brevo.py:L24-42 -- `_RateLimiter` (380 max) | - |
| F1.5-12 | Gestion API key manquante | OK | publishers/brevo.py:L68-71 + L77-82 | test_brevo.py::TestInit::test_init_without_api_key + TestAddSubscriber::test_add_subscriber_no_api_key |
| F1.5-13 | Signature `add_subscriber()` | OK | publishers/brevo.py:L131 | test_brevo.py::TestAddSubscriber |
| F1.5-14 | Signature `create_and_send_campaign()` | OK | publishers/brevo.py:L197 | test_brevo.py::TestCreateAndSendCampaign |
| F1.5-15 | Signature `get_campaign_stats()` | OK | publishers/brevo.py:L267 | test_brevo.py::TestGetCampaignStats |
| F1.5-16 | Signature `get_subscriber_count()` | OK | publishers/brevo.py:L175 | test_brevo.py::TestGetSubscriberCount (2 tests) |
| F1.5-17 | Signature `remove_subscriber()` | OK | publishers/brevo.py:L161 | test_brevo.py::TestRemoveSubscriber (1 test) |
| F1.5-18 | Signature `sync_unsubscribes()` | OK | publishers/brevo.py:L340 | - |
| F1.5-19 | Signature `fetch_and_store_stats()` | OK | publishers/brevo.py:L411 | - |
| F1.5-20 | Envoi programmable (scheduledAt) | OK | publishers/brevo.py:L224-226 | - |
| F1.5-21 | Inscription < 5 secondes | NON | Non mesure | - |
| F1.5-22 | Envoi 1/100/1000 destinataires | NON | Non teste en conditions reelles | - |

---

### Module 6 : Landing Page (F1.6)

| ID | Regle de gestion / Fonctionnalite | Statut | Fichier | Test |
|----|-----------------------------------|--------|---------|------|
| F1.6-01 | Hero : titre + tagline + formulaire email + apercu | OK | frontend/src/app/page.tsx:L142-246 -- `Hero()` | - |
| F1.6-02 | Probleme : 3 pain points | OK | frontend/src/app/page.tsx:L249-298 -- `PainPoints()` | - |
| F1.6-03 | Solution : 3 features | OK | frontend/src/app/page.tsx:L301-351 -- `Solution()` | - |
| F1.6-04 | Comment ca marche : 3 etapes | OK | frontend/src/app/page.tsx:L354-407 -- `HowItWorks()` | - |
| F1.6-05 | Apercu screenshot newsletter | PARTIEL | frontend/src/app/page.tsx:L177-243 -- apercu mockup (pas un vrai screenshot) | - |
| F1.6-06 | FAQ : 8 questions | OK | frontend/src/app/page.tsx:L20-61 -- 8 items FAQ | - |
| F1.6-07 | CTA final "Commencez gratuitement" | OK | frontend/src/app/page.tsx:L565-588 -- `FinalCTA()` | - |
| F1.6-08 | Footer : mentions legales, contact | PARTIEL | frontend/src/app/page.tsx:L591-625 -- liens vers `#` (pages non creees) | - |
| F1.6-09 | Pricing : 4 plans (0/15/39/79 EUR) | OK | frontend/src/app/page.tsx:L410-532 -- `Pricing()` | - |
| F1.6-10 | Couleurs : bleu #1E40AF, ambre, vert | OK | Via Tailwind CSS custom config | - |
| F1.6-11 | Police Inter | NON | Non verifie dans le code | - |
| F1.6-12 | Responsive mobile-first | OK | frontend/src/app/page.tsx -- classes Tailwind responsive (sm:, md:, lg:) | - |
| F1.6-13 | HTML/CSS statique (pas de framework JS) | NON | Utilise Next.js + React (framework JS complet) -- divergence volontaire du CDC | - |
| F1.6-14 | Formulaire POST vers Brevo ou /api/subscribe | NON | frontend/src/app/page.tsx:L159-164 -- input email present mais pas de `<form>` avec action, pas d'envoi | - |
| F1.6-15 | Honeypot anti-spam | NON | Non implemente | - |
| F1.6-16 | Analytics Plausible | NON | Pas de script Plausible dans le code | - |
| F1.6-17 | Hebergement Netlify (deploy via Git) | NON | Pas de config Netlify (netlify.toml supprime). Frontend semble prevu pour Vercel | - |
| F1.6-18 | SEO : meta tags complets, OG, Twitter Card | NON | Non verifie dans layout.tsx | - |
| F1.6-19 | Schema JSON-LD (WebSite + SoftwareApp + FAQPage) | OK | frontend/src/app/page.tsx:L63-114 -- `JsonLd()` avec 3 schemas | - |
| F1.6-20 | robots.txt bloquant GPTBot et CCBot | NON | Non implemente | - |
| F1.6-21 | sitemap.xml | NON | Non implemente | - |
| F1.6-22 | Page /merci (post-inscription) | NON | Non implementee | - |
| F1.6-23 | Page /mentions-legales | NON | Non implementee (lien vers `#` dans footer) | - |
| F1.6-24 | Page /confidentialite | NON | Non implementee (lien vers `#` dans footer) | - |
| F1.6-25 | Config Netlify (redirects, headers securite, cache) | NON | Pas de netlify.toml | - |
| F1.6-26 | PageSpeed > 90 | NON | Non mesure | - |
| F1.6-27 | Page connexion | OK | frontend/src/app/connexion/page.tsx existe | - |
| F1.6-28 | Page inscription | OK | frontend/src/app/inscription/page.tsx existe | - |
| F1.6-29 | API auth (register, login, logout, me) | OK | frontend/src/app/api/auth/{register,login,logout,me}/route.ts existent | - |
| F1.6-30 | API /api/articles (GET, filtres category/status/impact/indicator/sort) | OK | frontend/src/app/api/articles/route.ts -- pagination, tri, filtrage | - |
| F1.6-31 | API /api/articles/star (POST, toggle favori) | OK | frontend/src/app/api/articles/star/route.ts -- UPDATE is_starred | - |
| F1.6-32 | API /api/stats (GET, stats dashboard) | OK | frontend/src/app/api/stats/route.ts -- total, by_impact, by_indicator, newsletters, subscribers | - |
| F1.6-33 | Dashboard connecte au backend SQLite (better-sqlite3) | OK | frontend/src/lib/db.ts + API routes lisent directement la base | - |
| F1.6-34 | Page Veille : filtrage par indicateur Qualiopi (click tag) | OK | frontend/src/app/dashboard/veille/page.tsx | - |
| F1.6-35 | Page Veille : systeme de favoris (etoile) | OK | frontend/src/app/dashboard/veille/page.tsx + /api/articles/star | - |
| F1.6-36 | Page AO : urgence deadline (badge couleur) | OK | frontend/src/app/dashboard/appels-offres/page.tsx | - |

---

### Module 7 : Base de donnees SQLite (F1.7)

| ID | Regle de gestion / Fonctionnalite | Statut | Fichier | Test |
|----|-----------------------------------|--------|---------|------|
| F1.7-01 | Table `articles` | OK | storage/database.py:L11-38 | test_database.py::TestInitDb::test_creates_all_tables |
| F1.7-02 | Table `newsletters` | OK | storage/database.py:L40-52 | test_database.py::TestInitDb::test_creates_all_tables |
| F1.7-03 | Table `subscribers` | OK | storage/database.py:L54-66 | test_database.py::TestInitDb::test_creates_all_tables |
| F1.7-04 | Table `logs` | OK | storage/database.py:L68-75 | test_database.py::TestInitDb::test_creates_all_tables |
| F1.7-05 | Table `collection_logs` | NON | Non implementee (le CDC demande un journal de collecte detaille) | - |
| F1.7-06 | Table `processing_logs` | NON | Non implementee (le CDC demande un journal pipeline IA detaille) | - |
| F1.7-07 | Table `alert_logs` | NON | Non implementee | - |
| F1.7-08 | PRAGMA journal_mode=WAL | OK | storage/database.py:L90 | - |
| F1.7-09 | PRAGMA foreign_keys=ON | OK | storage/database.py:L91 | - |
| F1.7-10 | Index idx_articles_source | OK | storage/database.py:L77 | test_database.py::TestInitDb::test_creates_indexes |
| F1.7-11 | Index idx_articles_status | OK | storage/database.py:L78 | test_database.py::TestInitDb::test_creates_indexes |
| F1.7-12 | Index idx_articles_category | OK | storage/database.py:L79 | test_database.py::TestInitDb::test_creates_indexes |
| F1.7-13 | Index idx_articles_published | OK | storage/database.py:L80 | test_database.py::TestInitDb::test_creates_indexes |
| F1.7-14 | Index idx_articles_source_id | OK | storage/database.py:L81 | test_database.py::TestInitDb::test_creates_indexes |
| F1.7-15 | Index articles(deadline) | NON | Non implemente | - |
| F1.7-16 | Index articles(impact_level) | NON | Non implemente | - |
| F1.7-17 | Index articles(nor_id) | NON | Non implemente (champ NOR absent du schema) | - |
| F1.7-18 | Index subscribers (email, brevo_contact_id) | NON | Non implemente (email a UNIQUE constraint) | - |
| F1.7-19 | Index newsletters | NON | Non implemente (edition_number a UNIQUE constraint) | - |
| F1.7-20 | CHECK source IN (boamp, legifrance, opco, france_travail, region) | OK | storage/database.py:L13 | - |
| F1.7-21 | CHECK category IN (reglementaire, ao, metier, handicap, financement) | OK | storage/database.py:L20 | - |
| F1.7-22 | CHECK status IN (new, processing, done, failed, sent) | OK | storage/database.py:L21 | - |
| F1.7-23 | CHECK impact_level IN (fort, moyen, faible) | OK | storage/database.py:L23 | - |
| F1.7-24 | CHECK typologie_ao IN (formation, bilan_competences, vae, conseil) | OK | storage/database.py:L28 | - |
| F1.7-25 | CHECK relevance_score BETWEEN 1 AND 10 | OK | storage/database.py:L27 | - |
| F1.7-26 | CHECK plan IN (gratuit, solo, equipe, agence) | OK | storage/database.py:L61 | - |
| F1.7-27 | Champs articles manquants du CDC | NON | Manque : text_nature, nor_id, buyer (vs acheteur), procedure_type, pertinence (bool), titre_reformule, mots_cles, date_entree_vigueur, theme_formation, scoring_pertinence (vs relevance_score), ai_raw_response | - |
| F1.7-28 | Champs newsletters manquants du CDC | NON | Manque : week_start, week_end, articles_reglementaire, articles_ao, articles_metier, articles_total, status, unsubscribe_rate, bounce_count, stats_fetched_at, created_at | - |
| F1.7-29 | Champs subscribers manquants du CDC | PARTIEL | Manque : company_name (a organisme), source, preferences | - |
| F1.7-30 | Fonction `init_db()` | OK | storage/database.py:L95-102 | test_database.py::TestInitDb (3 tests) |
| F1.7-31 | Fonction `insert_article()` | OK | storage/database.py:L105-123 | test_database.py::TestInsertArticle (5 tests) |
| F1.7-32 | Fonction `get_articles()` avec filtres | OK | storage/database.py:L126-155 | test_database.py::TestGetArticles (7 tests) |
| F1.7-33 | Fonction `update_article_status()` | OK | storage/database.py:L158-165 | test_database.py::TestUpdateArticleStatus (2 tests) |
| F1.7-34 | Fonction `get_stats()` | OK | storage/database.py:L168-187 | test_database.py::TestGetStats (2 tests) |
| F1.7-35 | Dataclass Article | OK | storage/models.py:L8-49 | - |
| F1.7-36 | Dataclass Newsletter | OK | storage/models.py:L52-66 | - |
| F1.7-37 | Dataclass Subscriber | OK | storage/models.py:L69-83 | - |
| F1.7-38 | Init DB idempotent | OK | storage/database.py:L99 -- `CREATE TABLE IF NOT EXISTS` | test_database.py::TestInitDb::test_idempotent |

---

### Module 8 : Orchestrateur / Scheduler (F1.8)

| ID | Regle de gestion / Fonctionnalite | Statut | Fichier | Test |
|----|-----------------------------------|--------|---------|------|
| F1.8-01 | Commande `python main.py init` | OK | main.py:L41-52 -- `cmd_init()` | - |
| F1.8-02 | Commande `python main.py collect` | OK | main.py:L55-87 -- `cmd_collect()` lance BOAMP + Legifrance | - |
| F1.8-03 | Commande `python main.py process` | OK | main.py:L90-159 -- `cmd_process()` | - |
| F1.8-04 | Commande `python main.py newsletter` | OK | main.py:L201-334 -- `cmd_newsletter()` avec --force et --dry-run, selection articles, generation HTML, envoi Brevo, sauvegarde apercu | - |
| F1.8-04b | Commande `python main.py collect-history` | OK | main.py:L336-363 -- `cmd_collect_history()` avec --weeks N, collecte archives DILA | - |
| F1.8-05 | Commande `python main.py retry` | OK | main.py:L162-185 -- `cmd_retry()` | - |
| F1.8-06 | Commande `python main.py status` | OK | main.py:L323-378 -- `cmd_status()` | - |
| F1.8-07 | Commande `python main.py stats` (recuperer stats newsletter) | NON | Non implementee (pas de sous-commande `stats`) | - |
| F1.8-08 | Pipeline quotidien `run_daily_pipeline()` | NON | Non implemente -- `collect` et `process` sont 2 commandes separees | - |
| F1.8-09 | Pipeline hebdo `run_weekly_newsletter()` | PARTIEL | main.py:L188-320 -- `cmd_newsletter()` fait la selection + generation + envoi mais pas la recup stats | - |
| F1.8-10 | Pipeline `fetch_last_newsletter_stats()` | NON | Non implemente comme commande CLI | - |
| F1.8-11 | Verification mardi pour envoi newsletter | OK | main.py:L201-206 -- check `day_of_week == 1` avec option `--force` | - |
| F1.8-12 | Option --force pour forcer l'envoi | OK | main.py:L419-421 | - |
| F1.8-13 | Option --dry-run | OK | main.py:L422-424 | - |
| F1.8-14 | Option --limit pour process/retry | OK | main.py:L408-410 + L414-416 | - |
| F1.8-15 | Option --db pour chemin base | OK | main.py:L395-399 | - |
| F1.8-16 | Collecte independante (BOAMP echoue, Legifrance continue) | OK | main.py:L71-83 -- boucle independante sur chaque collecteur | - |
| F1.8-17 | Recovery automatique articles failed < 3 jours | NON | `retry` existe mais n'a pas de filtre sur l'age des echecs | - |
| F1.8-18 | Classes d'erreur (PipelineError, CollectionError, etc.) | NON | Non implementees | - |
| F1.8-19 | Cron PythonAnywhere 05:00 UTC | NON | Non configure | - |
| F1.8-20 | Cron PythonAnywhere 17:00 UTC | NON | Non configure | - |
| F1.8-21 | Cron PythonAnywhere mardi 07:00 UTC | NON | Non configure | - |
| F1.8-22 | Cron PythonAnywhere jeudi 07:00 UTC | NON | Non configure | - |
| F1.8-23 | Logs consultables et archives 30 jours | OK | storage/logger.py:L78-84 -- `TimedRotatingFileHandler(backupCount=30)` | - |
| F1.8-24 | Alertes email si anomalie | NON | Non implemente | - |
| F1.8-25 | 7+ jours sans intervention | NON | Non teste | - |
| F1.8-26 | Sauvegarde apercu HTML | OK | main.py:L316-320 -- `data/newsletter_{n}.html` | - |
| F1.8-27 | Chargement .env (dotenv) | OK | main.py:L21 -- `load_dotenv()` | - |

---

### Module 9 : Monitoring et Alertes (F1.9)

| ID | Regle de gestion / Fonctionnalite | Statut | Fichier | Test |
|----|-----------------------------------|--------|---------|------|
| F1.9-01 | Alerte 0 articles 3 jours consecutifs | NON | Non implemente | - |
| F1.9-02 | Alerte API inaccessible (3 retries echoues) | NON | Non implemente | - |
| F1.9-03 | Alerte envoi newsletter echoue | NON | Non implemente | - |
| F1.9-04 | Alerte quota API PISTE > 80% | NON | Non implemente | - |
| F1.9-05 | Alerte cout LLM mensuel > 4 EUR | NON | Non implemente | - |
| F1.9-06 | Alerte base SQLite > 500 Mo | NON | Non implemente | - |
| F1.9-07 | Alerte taux ouverture < 15% 2 editions | NON | Non implemente | - |
| F1.9-08 | Signature `check_health(db_path) -> dict` | NON | Non implemente | - |
| F1.9-09 | Signature `send_monitoring_alert()` | NON | Non implemente | - |
| F1.9-10 | Signature `print_status(db_path)` | PARTIEL | main.py:L323-378 -- `cmd_status()` affiche des stats basiques | - |
| F1.9-11 | Signature `cleanup_old_data(db_path, retention_days)` | NON | Non implemente | - |
| F1.9-12 | Deduplication alertes (1 par type/24h) | NON | Non implemente | - |
| F1.9-13 | Logging JSON structure (JSONFormatter) | OK | storage/logger.py:L12-25 -- `JSONFormatter` | - |
| F1.9-14 | Logging console lisible (ConsoleFormatter) | OK | storage/logger.py:L28-44 -- `ConsoleFormatter` avec couleurs | - |
| F1.9-15 | Rotation quotidienne logs | OK | storage/logger.py:L78 -- `when="D"` | - |
| F1.9-16 | Retention 30 jours | OK | storage/logger.py:L82 -- `backupCount=30` | - |
| F1.9-17 | Fichier logs/veille.log | OK | storage/logger.py:L77 | - |
| F1.9-18 | Email alerte via Brevo transactionnel | NON | `send_transactional_email()` existe mais aucun monitoring ne l'utilise | - |

---

## Phase 1.5 -- Sources etendues

> Derniere mise a jour : 2026-03-18

### F1.5.1 -- Scrapers OPCO (11 sources cibles)

| ID | Source | Statut | Fichier | Commentaire |
|----|--------|--------|---------|-------------|
| F1.5.1-01 | ATLAS (opco-atlas.fr) | BLOQUE | - | Site inaccessible (timeout/SSL) |
| F1.5.1-02 | AKTO (akto.fr) | OK | collectors/opco.py | ~8 AO collectees par passe |
| F1.5.1-03 | OPCO EP (opcoep.fr) | PARTIEL | collectors/opco.py | Page marches-publics accessible, 0 items detectes |
| F1.5.1-04 | Constructys | BLOQUE | - | Site inaccessible (timeout) |
| F1.5.1-05 | OPCOMMERCE (lopcommerce.com) | OK | collectors/opco.py | 1 item collecte |
| F1.5.1-06 | OCAPIAT | BLOQUE | - | Site inaccessible (404) |
| F1.5.1-07 | OPCO 2i (opco2i.fr) | OK | collectors/rss_feeds.py + playwright | 5 items via RSS, 0 via Playwright (pas d'AO en cours) |
| F1.5.1-08 | OPCO Mobilites | BLOQUE | - | Site inaccessible (timeout) |
| F1.5.1-09 | OPCO Sante (opco-sante.fr) | OK | collectors/opco.py | 0-5 AO par passe |
| F1.5.1-10 | AFDAS | BLOQUE | - | Redirige vers externe, page 404 |
| F1.5.1-11 | Uniformation | OK | collectors/opco.py + rss_feeds.py | 2-4 AO par passe + RSS |

**Statut global : PARTIEL (6/11 OPCO fonctionnels)**

- 6 OPCO collectent des AO : AKTO, OPCO Sante, Uniformation, OPCOMMERCE, OPCO 2i (RSS), OPCO EP
- 5 OPCO bloques (sites inaccessibles) : ATLAS, Constructys, OCAPIAT, OPCO Mobilites, AFDAS

### F1.5.1b -- RSS Feeds (nouveaux)

| ID | Source | Statut | Fichier | Commentaire |
|----|--------|--------|---------|-------------|
| F1.5.1b-01 | Uniformation RSS | OK | collectors/rss_feeds.py | Flux https://www.uniformation.fr/rss.xml - 2 AAP items |
| F1.5.1b-02 | OPCO 2i RSS | OK | collectors/rss_feeds.py | Flux https://www.opco2i.fr/feed/ - 5 items pertinents |

**Statut global : OK (2/2 flux fonctionnels)**

### F1.5.1c -- Playwright Collectors (nouveaux)

| ID | Source | Statut | Fichier | Commentaire |
|----|--------|--------|---------|-------------|
| F1.5.1c-01 | OPCO 2i Playwright | OK | collectors/playwright_collectors.py | Fonctionne, 0 items (pas d'AO en cours sur le site) |
| F1.5.1c-02 | Regions Playwright | OK | collectors/playwright_collectors.py | 5 regions, 60 articles Ile-de-France |
| F1.5.1c-03 | France Travail Playwright | OK | collectors/playwright_collectors.py | Fonctionne, 0 items (recherche) |

**Statut global : OK (3/3 collecteurs Playwright fonctionnels)**

### F1.5.2 -- Scrapers France Travail + Regions

| ID | Source | Statut | Fichier | Commentaire |
|----|--------|--------|---------|-------------|
| F1.5.2-01 | France Travail (recherche) | PARTIEL | collectors/france_travail.py | Pages regionales AAP n'existent plus, fallback via recherche globale |
| F1.5.2-02 | Conseils Regionaux (13 sites) | PARTIEL | collectors/regions.py + playwright | Sites tres variables, Playwright pour JS-rendered |
| F1.5.2-03 | Agregateurs (francemarches, e-marchespublics) | PARTIEL | collectors/regions.py | Integres, mais sites proteges (404/JS) |

**Statut global : PARTIEL**

- France Travail : pages regionales `/region/{region}/actualites/appels-a-projets.html` n'existent plus
- Conseils Regionaux : 13 regions configurees, Playwright collecte 60+ articles depuis Ile-de-France
- Agregateurs : ajoutes mais sites proteges ou JS-heavy

### Ameliorations 2026-03-18

1. **Refactoring opco.py** : Ajout de 6 collecteurs OPCO avec selecteurs ameliores
2. **Refactoring regions.py** : URLs mises a jour, agregateurs ajoutes
3. **Refactoring france_travail.py** : Fallback recherche globale au lieu de pages regionales 404
4. **Integration main.py** : Tous les collecteurs Phase 1.5 appeles dans `cmd_collect()`
5. **NOUVEAU : RSS Feeds** : Ajout de `collectors/rss_feeds.py` pour Uniformation et OPCO 2i (2 flux fonctionnels)
6. **NOUVEAU : Playwright** : Ajout de `collectors/playwright_collectors.py` pour sites JS-rendered (3 collecteurs)

### Resultats collecte complete (2026-03-18)

| Source | Articles collectes |
|--------|-------------------|
| BOAMP | 88 |
| Legifrance | 205 |
| OPCO (6 sources) | 11 |
| RSS Feeds | 7 |
| Playwright (JS) | 60 |
| **Total** | **371** |

### Recommendations pour amelioration

1. ~~**Utiliser Playwright** pour les sites JS-rendered (OPCO 2i, Regions, France Travail)~~ -- FAIT
2. ~~**Flux RSS** : Verifier si les sites OPCO ont des flux RSS~~ -- FAIT (Uniformation + OPCO 2i)
3. **APIs officielles** : Explorer les APIs marches publics (BOAMP deja utilise)
4. **Monitoring** : Ajouter alertes si un scraper retourne 0 pendant 3 jours consecutifs
5. **Regions supplementaires** : Ajouter plus de regions au Playwright collector

---

## Phase 2 -- SaaS Freemium

| Module | Statut | Commentaire |
|--------|--------|-------------|
| F2.1 Auth (inscription, connexion, session) | OK | frontend/src/app/api/auth/ contient 4 routes (register, login, logout, me). Pages connexion + inscription existent. |
| F2.2 Dashboard web | OK | frontend/src/app/dashboard/ contient 9 pages (accueil, veille, appels-offres, newsletter, plan-action, parametres, import, export, abonnement). |
| F2.3 Export PDF audit Qualiopi | OK | frontend/src/lib/audit-pdf.tsx + /api/export/audit. Generation PDF avec profil entreprise. |
| F2.4 Systeme de paiement Stripe | PARTIEL | /api/stripe/checkout, webhook, portal implementes. Manque configuration produits dans Stripe. |
| F2.5 Personnalisation par profil | OK | Restrictions par plan dans API (alerts, teams, external, export). |
| F2.6 Newsletter personnalisee | NON | Non implemente |
| F2.7 Enrichissements concurrentiels | PARTIEL | Upload contenu externe OK. Systeme de marquage articles OK. Programme partenaires NON. |
| F2.8 Alertes personnalisees | OK | Table alerts, API /api/alerts, UI dans Parametres. Mots-cles, regions, indicateurs. |
| F2.9 Systeme equipes | OK | Tables teams/team_members/team_invitations, API /api/teams, UI dans Parametres. Roles owner/admin/member. |
| F2.10 Import contenu externe | OK | Table external_contents, API /api/external, UI /dashboard/import. Traitement IA pour classification. |

---

## Criteres de recette Phase 1 (section 6.1 du CDC)

| # | Critere | Statut | Commentaire |
|---|---------|--------|-------------|
| 1 | La collecte BOAMP retourne > 5 AO formation/jour en moyenne | NON | Non verifie, systeme pas encore en production |
| 2 | La collecte Legifrance retourne les textes du jour | PARTIEL | LegifranceRSS collecte les textes recents (flux Atom). 713 textes collectes sur 4 semaines via archives DILA. Credentials PISTE non necessaires. |
| 3 | Les resumes IA sont coherents et en francais correct | NON | Non valide manuellement sur 20 resumes |
| 4 | La classification Qualiopi est correcte a > 80% | NON | Non valide manuellement |
| 5 | La newsletter HTML s'affiche correctement (Gmail, Outlook, Apple Mail) | NON | Non teste manuellement |
| 6 | L'inscription depuis la landing page fonctionne | NON | Formulaire email present mais pas connecte a Brevo |
| 7 | Le desabonnement fonctionne | PARTIEL | `remove_subscriber()` et `sync_unsubscribes()` existent, pas teste E2E |
| 8 | Le cron s'execute sans erreur pendant 7 jours | NON | Pas de cron configure |
| 9 | Les alertes monitoring arrivent en cas de probleme | NON | Module monitoring quasi-inexistant |
| 10 | Le cout LLM mensuel est < 5 EUR pour 1 000 articles | PARTIEL | Estimation de cout implementee, pas de garde-fou budget |

---

## Variables d'environnement

| Variable | Module | Statut code | Utilisee dans |
|----------|--------|-------------|---------------|
| `DB_PATH` | 7 | OK | main.py:L38 |
| `ANTHROPIC_API_KEY` | 3 | OK (configure) | processors/pipeline.py:L50 |
| `ANTHROPIC_MODEL` | 3 | NON | Modele hardcode `claude-haiku-4-5-20251001` dans pipeline.py:L45 |
| `LLM_MONTHLY_BUDGET_USD` | 9 | NON | Non implemente |
| `LEGIFRANCE_CLIENT_ID` | 2 | OPTIONNEL | collectors/legifrance.py:L53 -- Non requis grace au fallback LegifranceRSS |
| `LEGIFRANCE_CLIENT_SECRET` | 2 | OPTIONNEL | collectors/legifrance.py:L54 -- Non requis grace au fallback LegifranceRSS |
| `BREVO_API_KEY` | 5 | OK | publishers/brevo.py:L55 |
| `BREVO_LIST_ID` | 5 | OK | publishers/brevo.py:L56 |
| `BREVO_SENDER_NAME` | 5 | OK | publishers/brevo.py:L57 |
| `BREVO_SENDER_EMAIL` | 5 | OK | publishers/brevo.py:L58 |
| `BREVO_REPLY_TO` | 5 | OK | publishers/brevo.py:L59 |
| `ADMIN_EMAIL` | 9 | NON | Non implemente |
| `ALERT_ENABLED` | 9 | NON | Non implemente |
| `LOG_LEVEL` | 9 | NON | Hardcode `logging.INFO` dans logger.py:L51 |
| `LOG_DIR` | 9 | NON | Hardcode `"logs"` dans logger.py:L49 |
| `NEWSLETTER_DAY` | 4/8 | NON | Hardcode `1` (mardi) dans main.py:L202 |
| `COLLECT_DAYS_BACK` | 1/2 | NON | Hardcode `30` dans constructeurs des collecteurs |

---

## Ecarts notables par rapport au CDC

1. **URL API BOAMP** : Le code utilise l'API OpenDataSoft (`boamp-datadila.opendatasoft.com`) au lieu de l'API PAPS (`api.paps.finances.gouv.fr`) specifiee dans le CDC.

2. **API Batch Anthropic** : Le CDC specifie l'utilisation de l'API Batch pour reduire les couts de 50%. L'implementation actuelle fait des appels individuels synchrones.

3. **Landing page en Next.js** : Le CDC specifie "HTML/CSS statique (pas de framework JS)". L'implementation utilise Next.js + React + Tailwind. C'est un choix delibere pour faciliter la Phase 2 (dashboard SaaS) mais diverge du CDC Phase 1.

4. **Schema de base** : Le schema implemente a 4 tables (articles, newsletters, subscribers, logs) au lieu des 6 du CDC (manque collection_logs, processing_logs, alert_logs). Plusieurs champs de la table `articles` du CDC sont absents.

5. **Monitoring quasi-inexistant** : Seul le logging est en place. Aucune alerte, aucun health check, aucune maintenance auto.

6. **Pas de cron configure** : Toutes les commandes existent en CLI mais aucun cron n'est configure sur PythonAnywhere.

7. **Champs IA manquants** : Le pipeline IA ne produit pas tous les champs specifies (titre_reformule, mots_cles, date_entree_vigueur, theme_formation, pertinence bool).

---

## Resume des tests

| Fichier de test | Nb classes | Tests | Modules couverts |
|-----------------|-----------|-------|-----------------|
| tests/test_collectors.py | 3 | ~12 | Modules 1+2 (BOAMP, Legifrance API PISTE, BaseCollector) |
| tests/test_legifrance_rss.py | 11 | ~48 | Module 2bis (LegifranceRSS : keywords, types, Atom parsing, dates, JORFTEXT extraction, RSS collect, dedup, JORF XML parsing, collect_history, run) |
| tests/test_database.py | 5 | ~17 | Module 7 (init, insert, get, update, stats) |
| tests/test_processors.py | 7 | ~25 | Module 3 (prompts, parsing, validation, process, retry, cost, run) |
| tests/test_newsletter.py | 5 | ~15 | Module 4 (selection, HTML, HTML string dates, subject, mark_sent, pipeline) |
| tests/test_brevo.py | 6 | ~12 | Module 5 (init, add/remove subscriber, count, campaign, stats, transactional) |
| **Total** | **37** | **~129** | Modules 1-5 + 7 couverts. Modules 6, 8, 9 non testes (frontend TypeScript). |
