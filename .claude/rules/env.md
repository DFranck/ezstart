## 🔐 Environnements et Secrets — Hybrid root + per-app (post ENV-2)

**Toutes les règles de ce fichier sont 🔴 P0** (architecture .env non-négociable). Voir `standard.md` pour le système de priorisation global et `standard-saas-security.md` §5 pour les aspects security secrets management (rotation, vault).

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

1. Root `.env.<env>` chargé EN PREMIER (vars partagées : JWT_SECRET, MONGO_URL, DEPLOY_ENV)
2. `apps/<app>/<layer>/.env.<env>` chargé ensuite — **override** si même clé

**Workflow :**

1. **Développement** : Copier chaque `.env.example` → `.env.local` (root + per-app concernés) et remplir
2. **Production** : Copier variables dans Railway (per-app API) / Vercel (per-app web), shared vars synchronisées
3. **Validation** : `pnpm env:validate` (vérifie shared sync + missing required)

### 2. Règles Critiques

- ✅ **Shared vars** (JWT_SECRET, MONGO_URL, DEPLOY_ENV) → root `.env.<env>` UNIQUEMENT
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

### 6. Backups

Avant toute migration des fichiers env, backup dans `tmp/env-backup-*` (gitignored).

### 7. Cookie Domain — cross-port SSR en dev

- [ ] 🟠 P1 : En dev (`NODE_ENV !== 'production'`), si APIs et Webs tournent sur des ports différents de `localhost` (ex: API 6110 + Web 6111), set `Domain: 'localhost'` sur les cookies httpOnly. Sinon le browser ne send PAS le cookie cross-port → SSR auth ne marche pas en dev (`getServerAuth()` retourne toujours `null`).
- [ ] 🟠 P1 : En prod, `Domain: '.ezstart.xyz'` (cross-subdomain) — pattern différent, à NE PAS confondre.
- [ ] 🟠 P1 : Helper `getCookieDomain()` centralisé dans chaque API (`apps/<app>/api/src/config/cookie.ts`) — JAMAIS de logique cookie inline dans les routes.

```ts
// ✅ BON — apps/ezauth/api/src/config/cookie.ts
export function getCookieDomain(): string | undefined {
  if (process.env.NODE_ENV === 'production') {
    return process.env.COOKIE_DOMAIN ?? '.ezstart.xyz' // cross-subdomain prod
  }
  // 🔒 Dev cross-port (6110 API + 6111 Web) — Domain=localhost requis
  return 'localhost'
}

// ❌ INTERDIT — host-only cookie en dev = casse le cross-port
export function getCookieDomain(): string | undefined {
  if (process.env.NODE_ENV === 'production') return '.ezstart.xyz'
  return undefined // host-only → cookie attaché à 6110 only, pas envoyé sur 6111
}
```

**Pourquoi** : un cookie sans `Domain` attribute est "host-only" → attaché à `localhost:6110` strictement, pas envoyé sur `localhost:6111`. Avec `Domain=localhost`, il devient "domain cookie" → envoyé sur tous les ports de localhost. C'est dev-only ; en prod on veut le strict opposé (subdomain scoping via `.ezstart.xyz`).

**Audit grep** :

```bash
# Cookie domain handling existe par API
ls apps/*/api/src/config/cookie.ts 2>/dev/null

# Cookie sans domain en dev (suspicious)
grep -rn "getCookieDomain\|cookie.*domain" apps/*/api/src/ --include="*.ts"
```

### 8. Documentation complète

Voir [SECRETS.md](../../SECRETS.md) pour la doc canonique.
