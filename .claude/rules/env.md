## 🔐 Environnements et Secrets — Hybrid root + per-app (post ENV-2)

### 1. Architecture .env Standardisée

**Hybrid root + per-app — 3 ou 4 fichiers par layer :**

```
@ezstart/
├── .env.example       # ✅ Template root SHARED (committé)
├── .env.local         # ✅ SHARED dev secrets (gitignored)
├── .env.staging       # ✅ SHARED staging (gitignored)
└── .env.production    # ✅ SHARED prod ref (gitignored)

apps/<app>/<api|web>/
├── .env.example       # ✅ Template per-app (committé)
├── .env.local         # ✅ Per-app dev (gitignored)
├── .env.staging       # ✅ Per-app staging (gitignored)
└── .env.production    # ✅ Per-app prod ref (gitignored)
```

**Load order :**

1. Root `.env.<env>` chargé EN PREMIER (vars partagées : JWT_SECRET, MONGO_URL, SENTRY_AUTH_TOKEN, SENTRY_ORG_SLUG, DEPLOY_ENV)
2. `apps/<app>/<layer>/.env.<env>` chargé ensuite — **override** si même clé

**Workflow :**

1. **Développement** : Copier chaque `.env.example` → `.env.local` (root + per-app concernés) et remplir
2. **Production** : Copier variables dans Railway (per-app API) / Vercel (per-app web), shared vars synchronisées
3. **Validation** : `pnpm env:validate` (vérifie shared sync + missing required)

### 2. Règles Critiques

- ✅ **Shared vars** (JWT_SECRET, MONGO_URL, SENTRY_AUTH_TOKEN, SENTRY_ORG_SLUG, DEPLOY_ENV) → root `.env.<env>` UNIQUEMENT
- ✅ **Per-app vars** (Stripe keys, OAuth secrets, GEMINI_API_KEY, NEXT_PUBLIC_EZAUTH_KEY, etc.) → `apps/<app>/<layer>/.env.<env>`
- ✅ `.env.example` → Template SANS secrets (committé) à TOUS les niveaux
- ✅ `.env.local` / `.env.staging` / `.env.production` → gitignored, JAMAIS committés
- ❌ `.env` → NE PLUS UTILISER (confusion)
- ✅ `loadSharedEnv({ app, layer })` charge root + per-app automatiquement
- ❌ **JAMAIS** redonner un shared var dans per-app sauf si override volontaire pour cette app spécifiquement

### 3. Variables PORT Obsolètes

❌ **Plus besoin de `PORT=` dans `.env.local`**

Les ports sont auto-détectés depuis `@ezstart/config` :

```typescript
// APIs
const PORT = getApiPort('ezauth') // 6110

// Web apps (via dev-server.js)
// Détection automatique du nom d'app → port
```

### 4. Validator + Push scripts

```bash
# Vérifier qu'aucun shared var ne drift entre root et per-app
pnpm env:validate

# Push des vars (root + per-app merge) vers Railway/Vercel
pnpm env:push:railway <app> <env>     # ex: pnpm env:push:railway ezauth staging
pnpm env:push:vercel <app> <env>      # ex: pnpm env:push:vercel ezpay production
```

### 5. Helpers env (`@ezstart/config/env-resolvers`)

- `getMongoUrl(app)` — résout `{app}` dans MONGO_URL template
- `getJwtSecret()` — lit JWT_SECRET (root)
- `getSentryDsn(app)` — fallback `SENTRY_DSN_<APP>` puis `SENTRY_DSN`

### 6. Backups

Avant toute migration des fichiers env, backup dans `tmp/env-backup-*` (gitignored).

### 7. Documentation complète

Voir [SECRETS.md](../../SECRETS.md) pour la doc canonique.
