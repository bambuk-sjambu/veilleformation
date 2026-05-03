# Brief Collectors V2 — 4 nouveaux personas Cipia

> Recherche de sources scrappables / API publiques pour les 4 nouveaux personas
> ajoutés à Cipia Phase A multi-secteur (HACCP, Médical libéral, Avocats, Experts-comptables).
>
> Pattern de référence : `collectors/centre_inffo.py` (WordPress REST API) et
> `collectors/legifrance_rss.py` (Atom RSS + scraping HTML + DILA tar.gz).
> Tous les nouveaux collectors héritent de `collectors.base.BaseCollector` et
> retournent une `list[dict]` avec les clés `source, source_id, title, url, content,
> published_date, category, status="new"`.

Date de la recherche : 2026-05-02.

---

## Persona HACCP / Agroalimentaire

Cible : restaurateurs, boulangers, traiteurs, industriels agroalimentaires.

### Sources retenues (priorisées)

#### Source 1 : RappelConso V2 (DGCCRF + DGAL) — **priority: 1**
- URL : `https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/rappelconso-v2-gtin-espaces/records`
- Type : API JSON Opendatasoft (Explore v2.1)
- Fréquence MAJ : quasi temps réel (déclarations pro hebdomadaires)
- Authentification : aucune (open data)
- Volume estimé : ~50-150 rappels/sem dont ~60 % alimentation
- Difficulté : facile (REST + JSON paginé)
- Filtre recommandé : paramètre `where=categorie_de_produit="Alimentation"` + `order_by=date_de_publication DESC` + `limit=100`
- Pattern Python : `requests.get` + dataclass-ready JSON, équivalent à `centre_inffo.py` avec adaptation Opendatasoft
- Risques : aucun (Hetzner OK, pas de captcha, licence ouverte)
- URL test : `https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/rappelconso-v2-gtin-espaces/records?limit=5`

#### Source 2 : ANSES — flux RSS thématique alimentation
- URL : `https://www.anses.fr/fr/rss.xml` (flux global) + flux thématique "Alimentation et nutrition"
- Type : RSS XML
- Fréquence MAJ : 3-10 publications/sem
- Authentification : aucune
- Volume estimé : ~5-15 articles/sem pertinents pour HACCP
- Difficulté : facile (Atom/RSS standard, parser identique à `legifrance_rss._parse_atom_feed`)
- Filtre keyword : "alimentaire", "denrée", "contamination", "Listeria", "Salmonella", "HACCP", "hygiène", "pathogène"
- Pattern Python : `xml.etree.ElementTree` (déjà utilisé dans `legifrance_rss.py`)
- Risques : faible (site gouv stable, IP datacenter OK)
- URL test : `https://www.anses.fr/fr/rss.xml`

#### Source 3 : BO-Agri (Bulletin officiel Ministère Agriculture / DGAL)
- URL : `https://info.agriculture.gouv.fr/gedei/site/bo-agri/historique` + page hebdomadaire `https://info.agriculture.gouv.fr/boagri/historique/annee-YYYY/semaine-NN`
- Type : scraping HTML (pas de RSS officiel)
- Fréquence MAJ : tous les jeudis (rythme officiel)
- Authentification : aucune
- Volume estimé : ~10-30 instructions techniques/sem dont 5-10 DGAL (sécurité sanitaire)
- Difficulté : moyenne (HTML stable mais pas de flux structuré)
- Filtre : URL ou titre contient `dgal/sdssa/`, `dgal/sdspa/`, "sécurité sanitaire", "alimentation"
- Pattern Python : `requests` + `BeautifulSoup` ou regex sur `<a href="/gedei/site/bo-agri/instruction-YYYY-NNN">`
- Risques : changement de structure HTML possible (peu fréquent), pas d'API documentée, contact admin disponible (`bo-agri-administrateur.SG@agriculture.gouv.fr`)
- URL test : `https://info.agriculture.gouv.fr/boagri/historique/annee-2026/semaine-18`

#### Source 4 : RASFF (Rapid Alert System for Food and Feed, EU)
- URL : `https://data.europa.eu/data/datasets/restored_rasff` (dataset JSON/CSV) — l'interface RASFF Window n'a pas d'API JSON publique documentée
- Type : dump JSON/CSV (téléchargement via European Data Portal)
- Fréquence MAJ : portail européen ~mensuelle pour le dataset, RASFF Window quotidien
- Authentification : aucune
- Volume estimé : ~30-100 alertes EU/sem (filtre "France" ou "fraud" ou "contamination")
- Difficulté : moyenne (parser le dump CSV/JSON et dédupliquer par `notification_id`)
- Filtre : `country=FR` ou `notification_classification IN (alert, border rejection)` + catégories "fish/seafood", "meat", "dairy", "cereals"
- Pattern Python : `requests` + `csv.DictReader` ou `json.loads` puis filtrage Python
- Risques : pas d'API live → toujours 1-2 jours de retard sur RASFF Window. Acceptable pour Cipia (newsletter hebdo).
- URL test : `https://data.europa.eu/data/datasets/restored_rasff?locale=en`

#### Source 5 : Légifrance (filtre "code rural" / "hygiène alimentaire")
- Réutiliser `LegifranceRSSCollector` existant avec un nouveau set de keywords HACCP-spécifiques injecté via config secteur (`taxonomy_*` ou nouvelle table `sector_keywords`)
- Pas un nouveau collector, mais une **paramétrisation** du collector Légifrance existant.

### Brief de développement Python
- Fichier cible : `collectors/haccp.py`
- Classe principale : `class HACCPCollector(BaseCollector)` avec `SOURCE_NAME = "rappel_conso"` (collector multi-source = 1 classe par source ou orchestrateur ; cf. choix Cipia : préférer 1 fichier = 1 source pour rester aligné sur `boamp.py`/`centre_inffo.py`)
- Découpage suggéré :
  - `collectors/rappel_conso.py` (priorité 1)
  - `collectors/anses.py` (priorité 2)
  - `collectors/bo_agri.py` (priorité 3)
  - `collectors/rasff.py` (priorité 4 — peut être différé)
- Pattern réutilisable depuis : `centre_inffo.py` (API JSON paginée) pour RappelConso ; `legifrance_rss.py` (Atom XML) pour ANSES ; `opco.py` (scraping HTML pages indexées) pour BO-Agri.
- Estimation effort : RappelConso 2h · ANSES 1h · BO-Agri 4h · RASFF 3h → **~10h**
- Points d'attention :
  - Opendatasoft v2.1 utilise `where=` SQL-like, pas `q=` ; tester le filtre `categorie_de_produit` avec la valeur exacte ("Alimentation").
  - Pour BO-Agri, scraper la page `historique/annee-YYYY/semaine-NN` toutes les semaines uniquement (cron hebdo), pas chaque jour.
  - RASFF dataset European Data Portal : vérifier la fréquence de refresh réelle avant prod (peut être trimestriel).

---

## Persona Médical libéral

Cible : généralistes, kinés, ostéos, infirmiers libéraux, sages-femmes.

### Sources retenues (priorisées)

#### Source 1 : ANSM — flux RSS paramétrable — **priority: 1**
- URL : `https://ansm.sante.fr/rss/informations_securite` (alertes sécurité)
  - Compléter avec `https://ansm.sante.fr/rss/actualites` (actualités)
  - Compléter avec `https://ansm.sante.fr/rss/disponibilite_produits_sante` (ruptures de stock)
- Type : RSS XML, paramètres customisables (`?domainesMedicaux=cardiologie;neurologie` + `&produitsSante=medicaments`)
- Fréquence MAJ : quotidienne
- Authentification : aucune
- Volume estimé : 20-50 publications/sem (alertes + actu + ruptures)
- Difficulté : facile (RSS standard)
- Filtre keyword recommandé : appliquer sélection par `domainesMedicaux` à la source ; le filtrage Python additionnel n'est pas nécessaire si on consomme tous les domaines
- Pattern Python : identique à `legifrance_rss._fetch_rss_feed` + `_parse_atom_feed`
- Risques : aucun (site gouv, RSS officiel maintenu)
- URL test : `https://ansm.sante.fr/rss/informations_securite`

#### Source 2 : HAS (Haute Autorité de Santé) — flux RSS multiples
- URL : page de référence `https://www.has-sante.fr/jcms/c_1771214/fr/nos-flux-d-information-rss` (HAS bloque WebFetch direct via 403 → scraping = même UA Mozilla qu'utilisé dans `centre_inffo.py`)
  - Flux disponibles annoncés : Recommandations, Avis médicaments, Avis dispositifs médicaux, Décisions accès précoce, Bulletin officiel HAS
  - URLs réelles à récupérer manuellement la première fois en visitant la page (icônes XML), puis figées dans une constante `HAS_RSS_FEEDS = [...]`
- Type : RSS XML
- Fréquence MAJ : 5-15 publications/sem
- Authentification : aucune
- Volume estimé : ~10-25 articles/sem
- Difficulté : facile une fois URLs récupérées
- Filtre keyword : aucun nécessaire (le contenu HAS est nativement métier santé)
- Pattern Python : identique ANSM
- Risques : HAS renvoie 403 sur WebFetch automatisé → User-Agent Mozilla obligatoire, ajouter `Accept-Language: fr` ; rate limit potentiel (>1 req/sec)
- URL test à valider en prod : visiter `https://www.has-sante.fr/jcms/c_1771214/fr/nos-flux-d-information-rss` une fois en navigateur, copier les URLs des icônes XML

#### Source 3 : CNOM (Conseil National de l'Ordre des Médecins)
- URL : `https://www.conseil-national.medecin.fr/rss.xml`
- Type : RSS XML
- Fréquence MAJ : 1-3 publications/sem (communiqués)
- Authentification : aucune
- Volume estimé : ~5/sem
- Difficulté : facile
- Filtre keyword : aucun (toutes les publications CNOM sont pertinentes pour médecin libéral)
- Pattern Python : RSS standard
- Risques : faible volume mais haute valeur (orientations métier)

#### Source 4 : API Médicaments BDPM (betagouv) — pour ruptures et nouveautés AMM
- URL : `https://api-medicaments.fr/medicaments`
- Type : API JSON REST
- Fréquence MAJ : 2x/jour (6h et 18h)
- Authentification : aucune
- Volume : 15 800+ médicaments en base
- Difficulté : facile, mais usage spécifique (à n'utiliser que pour enrichir, pas pour générer du flux d'articles)
- Pattern : à utiliser en mode "enrichissement" plutôt que collector principal — peut être déféré V2.1

#### Source 5 : Légifrance (filtre "code de la santé publique")
- Réutiliser `LegifranceRSSCollector` avec keywords santé : "santé publique", "déontologie médicale", "professionnels de santé", "exercice libéral", "convention médicale", "tarif conventionné"

### Brief de développement Python
- Fichiers cibles :
  - `collectors/ansm.py` (priorité 1)
  - `collectors/has.py` (priorité 2)
  - `collectors/cnom.py` (priorité 3)
- Pattern réutilisable depuis : `legifrance_rss.py` (parsing Atom + dedup) pour les 3
- Estimation effort : ANSM 2h · HAS 3h (URLs à figer + 5 flux à parser) · CNOM 1h → **~6h**
- Points d'attention :
  - HAS bloque robots non-Mozilla → User-Agent obligatoire `Mozilla/5.0 ... Cipia/1.0`
  - ANSM RSS supporte plusieurs filtres concaténés via `;` et `&` — exploiter pour limiter le volume si besoin
  - CNOM RSS = à confirmer 200 OK avant codage (dépendre du `conseil-national.medecin.fr/rss.xml` exact)

---

## Persona Avocats indépendants

Cible : avocats solo, petits cabinets de 1-5 personnes.

### Sources retenues (priorisées)

#### Source 1 : Judilibre (API Cour de cassation via PISTE) — **priority: 1**
- URL : `https://api.piste.gouv.fr/cassation/judilibre/v1.0/search`
- Type : API REST JSON
- Fréquence MAJ : quotidienne (décisions publiées dans les 24h)
- Authentification : OAuth2 PISTE — Cipia a **déjà** un compte PISTE (cf. `reference_piste_account.md` dans MEMORY) → réutiliser le même client OAuth2 que pour Legifrance
- Volume estimé : ~50-200 décisions/sem
- Difficulté : moyenne (OAuth2 PISTE déjà en place pour Légifrance, factoriser le `PisteAuth` helper)
- Filtre recommandé : `chamber=civ1,civ2,soc,com,crim` selon segments cabinet, `date_start=YYYY-MM-DD`, `publication=b,r` (publication au Bulletin)
- Pattern Python : `requests.get` + JSON paginé (similaire à `boamp.py`)
- Risques : rate limit PISTE (à vérifier sur les quotas de votre compte). Sandbox vs Production endpoints différents.
- URL test : `https://sandbox-api.piste.gouv.fr/cassation/judilibre/v1.0/search?chamber=soc&size=5`
- Doc : https://github.com/Cour-de-cassation/judilibre-search

#### Source 2 : Conseil d'État (RSS officiels)
- URLs RSS exactes (récupérées de `conseil-etat.fr/outils/flux-rss/flux-rss`) :
  - `https://www.conseil-etat.fr/rss/actualites-rss`
  - `https://www.conseil-etat.fr/rss/avis-rss`
  - `https://www.conseil-etat.fr/rss/analyses-de-jurisprudence-rss`
  - `https://www.conseil-etat.fr/rss/etudes-rss`
- Type : RSS XML
- Fréquence MAJ : 5-15 publications/sem cumulées
- Authentification : aucune
- Volume estimé : ~10/sem
- Difficulté : facile (RSS standard, parser identique à `legifrance_rss`)
- Filtre keyword : aucun nécessaire
- Risques : aucun
- Note : pas de RSS dédié ArianeWeb → pour les décisions individuelles, passer par l'API Open Data administrative (judilibre couvre aussi les CAA/TA depuis 2021).

#### Source 3 : CNB (Conseil National des Barreaux)
- URL : `https://www.cnb.avocat.fr/fr/actualites` (page liste paginée)
- Type : scraping HTML (pas de RSS détecté)
- Fréquence MAJ : 5-10 actualités/sem
- Authentification : aucune
- Volume : 1 523 articles archivés au 30/04/2026
- Difficulté : moyenne (HTML standard, sélecteurs CSS pour titre/date/lien article)
- Filtre keyword : aucun (toute actu CNB pertinente avocats)
- Pattern Python : `requests` + `BeautifulSoup` (à ajouter aux dépendances si pas encore présent — vérifier `requirements.txt`) sur la page `/fr/actualites?page=N`
- Risques : changement de DOM possible (rare), captcha non détecté à date

#### Source 4 : Légifrance (déjà couvert) avec keywords avocat-spécifiques
- Réutiliser `LegifranceRSSCollector` avec : "code de procédure civile", "code de procédure pénale", "honoraires avocat", "aide juridictionnelle", "déontologie avocat", "RIN" (Règlement Intérieur National), "garde à vue", "secret professionnel"
- `JORF complet` est déjà dans `legifrance_rss.py` via DILA tar.gz (méthode `collect_history`).

#### Source 5 : Editions Législatives / Dalloz Actualité — alternative payante
- À écarter de V2 : pas de flux RSS public gratuit clairement identifié, contenu derrière paywall.

### Brief de développement Python
- Fichiers cibles :
  - `collectors/judilibre.py` (priorité 1)
  - `collectors/conseil_etat.py` (priorité 2)
  - `collectors/cnb.py` (priorité 3)
- Pattern réutilisable :
  - `judilibre.py` → factoriser le `PisteAuthClient` (OAuth2 PISTE) avec `legifrance.py` (refactor recommandé : créer `collectors/piste_auth.py`)
  - `conseil_etat.py` → calque exact de `legifrance_rss._fetch_rss_feed` (4 URLs à itérer)
  - `cnb.py` → calque de `opco.py` (scraping HTML paginé)
- Estimation effort : Judilibre 5h (OAuth2 + pagination + tests sandbox) · Conseil d'État 1.5h · CNB 3h → **~10h**
- Points d'attention :
  - Judilibre PISTE : utiliser sandbox d'abord (`sandbox-api.piste.gouv.fr`), passer en prod après validation. Quota OAuth à monitorer.
  - CNB : scraper depuis Hetzner = OK (pas de blocage IP datacenter signalé), mais ajouter `time.sleep(2)` entre pages.
  - Conseil d'État : 4 flux séparés à fusionner avec dedup par `<id>` Atom.

---

## Persona Experts-comptables indépendants

Cible : EC freelance, petits cabinets EC.

### Sources retenues (priorisées)

#### Source 1 : BOFiP — flux RSS officiel DGFiP — **priority: 1**
- URL de base : `https://bofip.impots.gouv.fr/flux-rss` (interface de construction)
  - L'URL d'un flux RSS BOFiP "Toutes les actualités" doit être construite via l'interface (paramètres = type de publication + catégories fiscales). À récupérer une fois manuellement et figer dans le code.
  - Page complémentaire scrapable : `https://bofip.impots.gouv.fr/actualites/toutes-les-actualites/all`
- Type : RSS XML (préféré) + scraping HTML fallback sur `/actualites/toutes-les-actualites/all`
- Fréquence MAJ : 5-20 publications/sem (rescrits, BOI, actualités doctrinales)
- Authentification : aucune
- Volume estimé : ~10-30 articles/sem (parmi lesquels filtrer par segment EC)
- Difficulté : moyenne (RSS à construire via interface puis figé, sinon fallback scraping HTML)
- Filtre : par défaut tout est pertinent ; affiner avec `IS`, `IR`, `TVA`, `CFE`, `CVAE`, `BIC`, `BNC`, `LMNP`
- Pattern Python : RSS standard (réutiliser `legifrance_rss._parse_atom_feed`) + scraping HTML de la liste actualités
- Risques : faible (site gouv stable)
- Action préliminaire : visiter l'interface de construction RSS pour figer l'URL réelle (ex. `https://bofip.impots.gouv.fr/rss/actualites?type=actualite&categorie=...`).

#### Source 2 : URSSAF actualités employeur
- URL : `https://www.urssaf.fr/portail/home/actualites/toute-lactualite-employeur.html`
- Type : scraping HTML (pas de RSS officiel détecté — vérifier en visitant la page)
- Fréquence MAJ : 5-15 publications/sem
- Authentification : aucune
- Volume : 113 actualités sur 10 pages (avril 2026)
- Difficulté : moyenne (URSSAF a eu des incidents sécurité récemment, prudence sur le rate limit)
- Filtre keyword : aucun (toute actu URSSAF pertinente pour EC)
- Pattern Python : `requests` + `BeautifulSoup` sur les 2-3 premières pages, dedup par URL
- Risques : URSSAF a eu un incident API 2024 → être conservateur (1 req/3 sec, retry exponentiel comme `centre_inffo.py`)
- URL test : `https://www.urssaf.fr/portail/home/actualites/toute-lactualite-employeur.html`

#### Source 3 : ANC (Autorité des Normes Comptables)
- URL : `https://www.anc.gouv.fr/normes-comptables-francaises/reglements-de-lanc` + page d'accueil `https://www.anc.gouv.fr/`
- Type : scraping HTML (RSS pas évident sur le site, à confirmer)
- Fréquence MAJ : 1-5 règlements/an + actus mensuelles
- Authentification : aucune
- Volume estimé : ~2-4 articles/mois (faible mais haute valeur)
- Difficulté : facile (page liste règlements stable)
- Filtre : tout règlement ANC + actualité avec mot-clé "règlement", "norme", "PCG", "consolidé", "crypto", "durabilité"
- Pattern Python : scraping liste règlements + page actualités, dedup par numéro de règlement (ex. `2026-01`)
- Risques : faible volume → cron hebdo suffit, voire mensuel

#### Source 4 : Légifrance (déjà couvert) avec keywords fiscaux et comptables
- Réutiliser `LegifranceRSSCollector` avec keywords : "code général des impôts", "CGI", "loi de finances", "PLF", "facturation électronique", "TVA", "régime social indépendants", "RSI", "PER", "déclaration sociale nominative", "DSN"

#### Source 5 : actuEL Expert-Comptable (Editions Législatives) / actuel-expert-comptable.fr
- URL : `https://www.actuel-expert-comptable.fr/rss`
- Type : RSS XML — payant pour la majorité du contenu
- Statut : à exclure de V2 (paywall sur le contenu utile, RSS limité aux titres)

### Brief de développement Python
- Fichiers cibles :
  - `collectors/bofip.py` (priorité 1)
  - `collectors/urssaf.py` (priorité 2)
  - `collectors/anc.py` (priorité 3)
- Pattern réutilisable :
  - `bofip.py` → `legifrance_rss.py` pour le RSS, `opco.py` pour le fallback HTML
  - `urssaf.py` → `opco.py` (scraping HTML paginé) avec retry conservateur de `centre_inffo.py`
  - `anc.py` → `opco.py` simplifié
- Estimation effort : BOFiP 4h (RSS à figer + fallback) · URSSAF 3h · ANC 2h → **~9h**
- Points d'attention :
  - BOFiP RSS : URL réelle à récupérer en visitant l'interface de construction sur `bofip.impots.gouv.fr/flux-rss` puis copier-coller le lien généré (un humain doit le faire une fois). Sinon scraper la page `/actualites/toutes-les-actualites/all`.
  - URSSAF : conservateur sur le rate limit (incident sécurité 2024 sur leur API).
  - ANC : volume si faible que le cron peut être hebdomadaire (le mardi avant la newsletter).

---

## Synthèse transversale

### Architecture suggérée
1. **Refactor préalable** : extraire `collectors/piste_auth.py` (OAuth2 PISTE commun à `legifrance.py` et au futur `judilibre.py`).
2. **Nouvelle classe BaseRSSCollector** : factoriser `_parse_atom_feed`, `_parse_date`, retry exponentiel — actuellement dupliqués entre `legifrance_rss.py`, `centre_inffo.py`, `rss_feeds.py`. Tous les nouveaux collectors RSS (ANSES, ANSM, HAS, CNOM, Conseil d'État, BOFiP) doivent en hériter.
3. **Configuration sectorielle** : enregistrer chaque collector dans `sector.collectors` (config Phase A multi-secteur) — éviter le hardcoding dans `scheduler/`.

### Sources prioritaires (1 par persona)
| Persona | Source #1 | Type | Effort | Bloquant |
|---|---|---|---|---|
| HACCP | RappelConso V2 (data.economie.gouv.fr) | API JSON | 2h | aucun |
| Médical libéral | ANSM RSS informations_securite | RSS XML | 2h | aucun |
| Avocats | Judilibre (PISTE OAuth2) | API REST | 5h | compte PISTE existant à réutiliser |
| Experts-comptables | BOFiP RSS doctrinal | RSS XML | 4h | URL exacte à récupérer une fois manuellement |

### Effort total estimé (les 4 personas, 11 nouveaux collectors)
- HACCP : 10h (4 collectors)
- Médical : 6h (3 collectors)
- Avocats : 10h (3 collectors)
- EC : 9h (3 collectors)
- Refactor `BaseRSSCollector` + `piste_auth` : 4h
- **Total : ~39h** (5 jours dev) + tests unitaires ~10h

### Risques transversaux
1. **IP datacenter Hetzner** : risque connu (cf. `project_ocapiat_ip_block.md`). Sources confirmées sans risque détecté à ce jour : RappelConso, ANSES, ANSM, BOFiP, data.gouv.fr, PISTE. Sources à tester explicitement depuis Hetzner avant prod : HAS (a renvoyé 403 sur WebFetch automatisé), URSSAF (incident sécurité 2024), CNB (jamais scrapé). En cas de blocage : fallback proxy résidentiel ou scraping local cron + push GitHub.
2. **OAuth2 PISTE** : quota partagé entre Legifrance et Judilibre — monitorer `429 Too Many Requests` et factoriser le helper.
3. **Sources sans RSS officiel** (URSSAF, CNB, BO-Agri, ANC) : tributaires de la stabilité du DOM HTML. Mettre en place le `send_monitoring_alert` (déjà existant dans `centre_inffo.py`) après 3 échecs consécutifs.
4. **Doublons cross-source** : RappelConso et RASFF se recoupent (~30 % alertes communes). Dedup par hash titre+date côté pipeline `processors/`.
5. **Vérifier en prod réelle** (règle Stéphane) : pour chaque collector, lancer un `python -c "from collectors.X import XCollector; print(len(XCollector('test.db').collect()))"` et inspecter 3 articles à la main avant de claim "OK".

### Ordre de livraison conseillé
1. RappelConso (HACCP) — 1 collector qui débloque le persona le plus simple
2. ANSM (Médical) — RSS, démo rapide
3. Conseil d'État (Avocats) — RSS, démo rapide
4. BOFiP (EC) — RSS, démo rapide
5. Refactor `BaseRSSCollector`
6. ANSES + CNOM + HAS (compléter Médical et HAS qui demande plus de soin)
7. CNB + URSSAF + ANC (scraping HTML)
8. Judilibre (factoriser PISTE auth d'abord)
9. BO-Agri + RASFF (peuvent être différés V2.1)
