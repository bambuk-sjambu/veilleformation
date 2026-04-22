# Phase 2 - Progress Report

> **Date :** 2026-03-17
> **Statut :** ~85% complete

---

## Fonctionnalites implementees

### 1. Systeme d'authentification (100%)
- iron-session pour la gestion des sessions
- Routes API: `/api/auth/login`, `/api/auth/logout`, `/api/auth/register`, `/api/auth/me`
- Protection du dashboard via layout.tsx
- **Fichiers:**
  - `frontend/src/lib/session.ts`
  - `frontend/src/lib/auth.ts`
  - `frontend/src/app/api/auth/*/route.ts`

### 2. Dashboard Next.js (100%)
- **Pages implementees:**
  - `/dashboard` - Tableau de bord avec stats
  - `/dashboard/veille` - Liste articles avec filtres (impact, indicateur, statut)
  - `/dashboard/appels-offres` - Liste AO avec scoring
  - `/dashboard/plan-action` - CRUD actions
  - `/dashboard/settings` - Configuration profil OF
  - `/dashboard/export` - Generation PDF audit
  - `/dashboard/abonnement` - Gestion abonnement
  - `/dashboard/newsletter` - Historique newsletters
  - `/dashboard/parametres` - Parametres utilisateur (profil, alertes, equipe)
  - `/dashboard/import` - Import contenu externe

### 3. Systeme de plans (100%)
- Colonnes plan, stripe_customer_id, stripe_subscription_id dans users
- 4 plans: free, solo, equipe, agence
- Restriction export PDF (1/mois pour free)
- Restriction alertes (Solo+ uniquement)
- Restriction equipes (Equipe/Agence uniquement)
- Restriction import (Solo+ uniquement)
- **Fichiers:**
  - `frontend/src/lib/plan.ts`
  - `frontend/src/lib/db.ts` (migrations)

### 4. Integration Stripe (70%)
- Routes API crees:
  - `/api/stripe/checkout` - Creation session checkout
  - `/api/stripe/webhook` - Handling evenements Stripe
  - `/api/stripe/portal` - Portail client Stripe
- Configuration price IDs dans `frontend/src/lib/stripe.ts`
- **Variables d'environnement necessaires:**
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRICE_SOLO_MONTHLY/YEARLY`
  - `STRIPE_PRICE_EQUIPE_MONTHLY/YEARLY`
  - `STRIPE_PRICE_AGENCE_MONTHLY/YEARLY`

### 5. Export PDF Audit Qualiopi (100%)
- Generation PDF via @react-pdf/renderer
- 4 pages: couverture, resume executif, actions, indicateurs
- Personnalisation avec profil entreprise
- **Fichiers:**
  - `frontend/src/lib/audit-pdf.tsx`
  - `frontend/src/app/api/export/audit/route.tsx`

### 6. Marquage articles (100%)
- Colonne read_status dans articles
- Statuts: a_lire, interessant, a_exploiter
- API route: `/api/articles/read-status`
- UI dropdown dans page veille
- Filtre par statut
- **Fichier:** `frontend/src/app/dashboard/veille/page.tsx`

### 7. Alertes personnalisees (100%) - NOUVEAU
- Table `alerts` avec keywords, regions, indicators, frequency
- API routes: `/api/alerts`, `/api/alerts/[id]`
- UI dans onglet Parametres > Alertes
- Plan restrictions (free: aucune, solo+: illimite)
- **Fichiers:**
  - `frontend/src/lib/db.ts` (table alerts)
  - `frontend/src/app/api/alerts/route.ts`
  - `frontend/src/app/api/alerts/[id]/route.ts`
  - `frontend/src/app/dashboard/parametres/page.tsx` (UI alertes)

### 8. Systeme d'equipes (100%) - NOUVEAU
- Tables: `teams`, `team_members`, `team_invitations`
- Roles: owner, admin, member
- Invitation par email avec token
- API routes: `/api/teams`, `/api/teams/[id]`, `/api/teams/[id]/invite`, `/api/teams/[id]/members/[memberId]`
- UI dans onglet Parametres > Mon equipe
- Plan restrictions (equipe: 5 membres, agence: 20 membres)
- **Fichiers:**
  - `frontend/src/lib/db.ts` (tables teams)
  - `frontend/src/app/api/teams/route.ts`
  - `frontend/src/app/api/teams/[id]/route.ts`
  - `frontend/src/app/api/teams/[id]/invite/route.ts`
  - `frontend/src/app/api/teams/[id]/members/[memberId]/route.ts`
  - `frontend/src/app/dashboard/parametres/page.tsx` (UI equipe)

### 9. Import contenu externe (100%) - NOUVEAU
- Table `external_contents` avec source_type (url/file)
- Integration IA pour resume et classification Qualiopi
- API routes: `/api/external`, `/api/external/[id]`
- UI page dédiée `/dashboard/import`
- Plan restrictions (free: aucun, solo: 5MB, equipe: 20MB, agence: 50MB)
- **Fichiers:**
  - `frontend/src/lib/db.ts` (table external_contents)
  - `frontend/src/app/api/external/route.ts`
  - `frontend/src/app/api/external/[id]/route.ts`
  - `frontend/src/app/dashboard/import/page.tsx`

---

## Fonctionnalites restantes

### Priorite haute
| Feature | Estimation | Description |
|---------|------------|-------------|
| Configuration Stripe | 2h | Creer produits/prix dans Stripe, configurer webhooks |
| Tests E2E | 4h | Tests Playwright pour flux critiques |

### Priorite moyenne
| Feature | Estimation | Description |
|---------|------------|-------------|
| Newsletter personnalisee | 6h | Filtrage par profil |
| Envoi emails alertes | 4h | Integrieren Brevo pour alertes declenchees |
| Envoi invitations equipe | 2h | Email via Brevo avec lien d'acceptation |

### Priorite basse
| Feature | Estimation | Description |
|---------|------------|-------------|
| Migration PostgreSQL | 4h | Supabase |
| API publique | 6h | Pour plan Agence |
| White-label | 4h | Logo client sur exports (plan Agence) |

---

## Architecture technique

### Base de donnees (SQLite)

```
users
├── id, email, password_hash
├── first_name, last_name
├── plan (free|solo|equipe|agence)
├── stripe_customer_id, stripe_subscription_id
├── subscription_status, subscription_period_end
└── created_at, email_verified

user_profiles
├── user_id (FK)
├── company_name, siret, nde
├── address, city, phone, email, website
├── logo_url
├── responsible_name, responsible_function
└── methodology_notes

actions
├── article_id (FK)
├── action_description, responsible
├── status (a_faire|en_cours|fait|annule)
├── priority (basse|moyenne|haute)
├── due_date, completed_at, notes
└── created_at, updated_at

alerts (NOUVEAU)
├── user_id (FK)
├── name, keywords (JSON), regions (JSON)
├── indicators (JSON), categories (JSON)
├── frequency (instant|daily|weekly)
├── active, last_triggered_at
└── created_at, updated_at

teams (NOUVEAU)
├── name, owner_id (FK)
├── plan (equipe|agence)
├── max_members
└── created_at, updated_at

team_members (NOUVEAU)
├── team_id (FK), user_id (FK)
├── role (owner|admin|member)
├── invited_by, invited_at, joined_at
└── UNIQUE(team_id, user_id)

team_invitations (NOUVEAU)
├── team_id (FK), email, role
├── token (unique), invited_by (FK)
├── expires_at, accepted
└── created_at

external_contents (NOUVEAU)
├── user_id (FK), team_id (FK)
├── source_type (url|file)
├── source_url, file_name, file_path
├── title, content, summary
├── qualiopi_indicators (JSON), impact_level
├── relevance_score, processed, processed_at
└── created_at, updated_at

alert_history (NOUVEAU)
├── alert_id (FK)
├── article_id (FK), external_content_id (FK)
├── triggered_at, notified
└── ...

articles (colonnes Phase 2)
├── read_status (a_lire|interessant|a_exploiter)
├── is_starred
└── ... (colonnes Phase 1)

export_logs
├── user_id, articles_count
└── created_at
```

### API Routes

```
/api/auth/
├── login/route.ts (POST)
├── logout/route.ts (POST)
├── register/route.ts (POST)
└── me/route.ts (GET)

/api/stripe/
├── checkout/route.ts (POST)
├── webhook/route.ts (POST)
└── portal/route.ts (POST)

/api/articles/
├── route.ts (GET)
├── star/route.ts (POST)
└── read-status/route.ts (POST)

/api/alerts/ (NOUVEAU)
├── route.ts (GET, POST)
└── [id]/route.ts (GET, PUT, DELETE)

/api/teams/ (NOUVEAU)
├── route.ts (GET, POST)
├── [id]/route.ts (GET, PUT, DELETE)
├── [id]/invite/route.ts (POST)
└── [id]/members/[memberId]/route.ts (PUT, DELETE)

/api/external/ (NOUVEAU)
├── route.ts (GET, POST)
└── [id]/route.ts (GET, DELETE)

/api/export/
└── audit/route.tsx (GET)

/api/profile/route.ts (GET, PUT)
/api/user/route.ts (GET, PUT, POST)
/api/actions/route.ts (GET, POST)
/api/actions/[id]/route.ts (PUT, DELETE)
```

---

## Commandes

```bash
# Development
cd frontend && npm run dev

# Build
npm run build

# Tests
pytest  # Backend Python
npm test  # Frontend (si configure)
```

---

## Variables d'environnement requises

```env
# Stripe (Phase 2)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_SOLO_MONTHLY=price_...
STRIPE_PRICE_SOLO_YEARLY=price_...
STRIPE_PRICE_EQUIPE_MONTHLY=price_...
STRIPE_PRICE_EQUIPE_YEARLY=price_...
STRIPE_PRICE_AGENCE_MONTHLY=price_...
STRIPE_PRICE_AGENCE_YEARLY=price_...

# Session
SESSION_SECRET=your-secret-key-min-32-chars

# Site
NEXT_PUBLIC_SITE_URL=https://veilleformation.fr

# Anthropic (pour traitement contenu externe)
ANTHROPIC_API_KEY=sk-ant-api03-...
```

---

## Prochaines etapes

1. **Configurer Stripe** - Creer les 3 produits avec 2 prix chacun (mensuel/annuel)
2. **Tester le flux d'abonnement** - Checkout -> Webhook -> DB update
3. **Implementer l'envoi d'emails** - Invitations equipes + alertes declenchees via Brevo
4. **Tests E2E** - Couvrir les flux critiques
5. **Migration PostgreSQL** - Quand necessaire (5000+ users)

---

## Notes techniques

- SQLite fonctionne bien pour < 5000 utilisateurs
- PostgreSQL (Supabase) recommande pour scaling
- iron-session gere les sessions cote serveur (pas de JWT)
- Stripe webhooks doivent etre configures dans le dashboard Stripe
- Le portail client Stripe gere upgrades/downgrades/cancellations
- Les alertes et equipes sont bloquees par plan via API
- Le contenu externe est traite par Claude Haiku pour classification Qualiopi
