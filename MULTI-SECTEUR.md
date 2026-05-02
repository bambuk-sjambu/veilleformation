# Refactor multi-secteur — Plan Phase A

Objectif : transformer Cipia en plateforme paramétrable pour pouvoir cloner facilement
le site sur d'autres secteurs (HACCP, avocats, etc.) sans dupliquer le code.

## Principe

- **Un seul code source** maintenu dans ce repo.
- **Une config par secteur** dans `/config/sectors/<sector>.ts` (ex: `cipia.ts`).
- Le secteur actif est sélectionné par la variable d'env `SECTOR` (default: `cipia`).
- **Aucune régression sur Cipia** : tous les tests existants doivent rester verts.

## Découpage

| # | Sous-étape | Touches | Effort | Risque |
|---|------------|---------|--------|--------|
| A.0 | Config skeleton + types + chargeur `getSector()` | nouveaux fichiers | 1h | nul |
| A.1 | Extraction branding (nom, domaine, tagline) | layout.tsx, page.tsx, footer | 2h | faible |
| A.2 | Extraction vocab (Qualiopi, OF, audit) | pages frontend, copy | 3h | moyen |
| A.3 | Extraction taxonomie (indicateurs 23-26) | prompts.py, stats, UI, PDF | 4h | élevé |
| A.4 | Migration DB (qualiopi_* → taxonomy_*, extra_meta JSON) | db.ts, models.py, migrations | 4h | élevé |
| A.5 | Refactor PDF audit (template-driven) | audit-pdf.tsx | 2h | moyen |
| A.6 | Refactor newsletter (template-driven) | publishers/newsletter.py | 2h | moyen |
| A.7 | Test de non-régression complet + smoke prod | — | 1h | nul |

Total estimé : ~20h de travail focused, soit ~3 jours.

## ✅ Phase A clôturée — 2026-05-02

- A.0 → A.6 + A.4.d : tous commités, déployés prod, validés runtime
- A.7 régression validée : schema A.4.d (26 cols, 0 legacy `qualiopi_*`), 1213/1293 articles taxonomy peuplée, cron auto 06:00 UTC OK 8 sources, manual collect+process 04:26 UTC 0 erreur, smoke prod (home 200, dashboard 307, pricing 200) OK
- Prochaine étape : Phase B — skill `regveille-bootstrap`

## Règles

1. **Une sous-étape = un commit + un push + un déploiement quand pertinent.**
2. **À chaque commit** : `pytest` + `tsc --noEmit` + `eslint` doivent passer.
3. **Aucune migration DB destructive** : utilise `ALTER TABLE` + colonnes nouvelles, jamais
   `DROP COLUMN` au premier coup. Les anciennes colonnes sont conservées en fallback
   jusqu'à validation prod.
4. **Le secteur Cipia reste actif par défaut** : si `SECTOR` env var absent, on charge
   `cipia.ts` automatiquement. Zéro changement de comportement pour la prod actuelle.
5. **Le chargement de config est synchrone** côté Next.js (import statique conditionnel ou
   import dynamique au boot) pour éviter les flickers.

## Schéma de la config secteur (cible)

```ts
// /config/sector.ts (interface)
export interface SectorConfig {
  id: string;                    // "cipia", "haccp", "avocats"
  brand: {
    name: string;                // "Cipia"
    domain: string;              // "cipia.fr"
    tagline: string;             // "Veille réglementaire Qualiopi par IA"
    logoUrl: string;             // "/icon.svg"
    color: { primary: string; accent: string };
  };
  vocab: {
    audience: string;            // "organismes de formation Qualiopi"
    audienceShort: string;       // "OF"
    auditName: string;           // "audit Qualiopi"
    regulatorRefName: string;    // "référentiel Qualiopi"
  };
  taxonomy: {
    indicators: TaxonomyIndicator[];
    categories: string[];
  };
  sources: SourceConfig[];
  pricing: { plans: PricingPlan[] };
  audit_pdf: { coverTitle: string; coverSubtitle: string; sections: PdfSection[] };
}

export interface TaxonomyIndicator {
  id: string;        // "23" pour Cipia, "ccp" pour HACCP
  short: string;     // "Légal"
  label: string;     // "Veille légale et réglementaire"
  description: string;
}
```

## Tests de non-régression à maintenir

### Backend (Python)
- `tests/test_processors.py` : 16 tests dont `test_qualiopi_indicators_stored_as_json`
- `tests/test_round_robin.py` : 7 tests
- `tests/test_newsletter.py` : tests templates
- `tests/test_legifrance_rss.py` : collectors
- `tests/test_batch.py` : pipeline
- `tests/test_monitoring.py` : monitoring

### Frontend
- `tsc --noEmit` : 0 erreur (hors `.next/dev/types`)
- `eslint src/` : 0 erreur (warnings tolérés)
- Build `next build` : succès

### Smoke prod
- `https://cipia.fr/` → 200 (home)
- `https://cipia.fr/dashboard` → 307 vers connexion (auth)
- `https://cipia.fr/api/feedback` → 405 (POST attendu)
- Visuel : aucune différence sur `/`, `/dashboard`, `/pricing`

## Risques identifiés

1. **Imports dynamiques en SSR** : Next.js App Router peut être capricieux avec les imports
   conditionnels. Solution : import statique de `/config/sectors/cipia.ts` par défaut, env var
   `SECTOR` lue côté config au boot, switch via build-time const.
2. **Migration DB en prod** : la table `articles` a 30+ colonnes dont 8+ liées à Qualiopi/AO.
   Renommer en place est risqué. Solution : ajouter les nouvelles colonnes à côté, dual-write
   pendant 1 cycle de collecte, puis migrer les anciennes données.
3. **PDF audit** : le template a une mise en page lourde. Solution : extraire d'abord les
   chaînes texte en config, puis dans un 2e temps abstraire la structure si besoin.

## Phase B (à faire APRÈS Phase A)

- Skill `regveille-bootstrap` qui génère un `/config/sectors/<nom>.ts` à partir d'un brief
- Génération logo/palette via Gemini
- Setup auto DNS OVH + Brevo + Stripe products + déploiement Hetzner

## Phase C (test grandeur nature)

- Lancement HACCP comme 2e secteur pour valider que Phase A scale
