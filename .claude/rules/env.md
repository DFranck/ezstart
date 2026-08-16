## 🔐 Environnements et Secrets — Per-app ONLY (post ENV-3, 2026-05-01)

**Toutes les règles de ce fichier sont 🔴 P0** (architecture .env non-négociable). Voir `standard.md` pour le système de priorisation global et `standard-saas-security.md` §5 pour les aspects security secrets management (rotation, vault).

### 1. Architecture .env Standardisée — PER-APP ONLY

**Plus de fichier `.env*` à la racine.** Chaque app+layer est self-contained — la cascade de chargement vit entièrement sous `apps/<app>/<layer>/`. Cela permet à chaque app d'être déployable, auditable, et publiable indépendamment, sans dépendre d'un état partagé hors du dossier de l'app.

```
apps/<app>/<api|web>/
├── .env.example       # ✅ Template per-app (committé, sans secrets)
├── .env.local         # ✅ Per-app dev complet (gitignored — TOUS les vars y vivent)
├── .env.staging       # ✅ Staging overrides ONLY (gitignored — diffs vs local)
└── .env.production    # ✅ Production overrides ONLY (gitignored — diffs vs local+staging)
```

**Cascade de chargement (lowest → highest precedence) :**

```
local       → .env.local
staging     → .env.local  ←  .env.staging
production  → .env.local  ←  .env.staging  ←  .env.production
```

`.env.staging` et `.env.production` ne contiennent QUE les vars qui DIFFÈRENT de `.env.local` (cluster URLs, NODE*ENV=production, sk_live*\* keys, prod webhooks). Les vars stables (LOG_LEVEL, JWT_SECRET partagé, OAUTH_STATE_SECRET, etc.) sont dans `.env.local` et cascadent vers staging+prod automatiquement.

**Workflow :**

1. **Développement** : Copier `.env.example` → `.env.local` (par app+layer concernés) et remplir
2. **Production** : `pnpm env:push:all production` lit la cascade complète et pousse vers Railway/Vercel en une commande
3. **Validation** : `pnpm env:validate --env={local|staging|production}` (vérifie que la cascade complète est non-bloquante)

### 2. Règles Critiques

- ✅ **PAS de fichier `.env*` à la racine du monorepo.** Chaque app est self-contained.
- ✅ **JWT_SECRET, MONGO_URL, DEPLOY_ENV doivent être dupliqués** dans CHAQUE `.env.local` per-app (le coût de la duplication est largement compensé par l'autonomie de l'app)
- ✅ `.env.example` → Template SANS secrets (committé) à TOUS les niveaux
- ✅ `.env.local` / `.env.staging` / `.env.production` → gitignored, JAMAIS committés
- ✅ Les valeurs identiques entre apps (ex: JWT_SECRET production) DOIVENT être copiées à l'identique dans chaque app — la cohérence est garantie par les push scripts qui utilisent les mêmes valeurs
- ❌ `.env` (sans suffix) → INTERDIT (confusion + load order indéfini)
- ❌ JAMAIS de fichier `.env*` à la racine — l'agent ENV_COMPLETE_FIX 2026-05-01 a supprimé `.env.example`, `.env.local`, `.env.staging`, `.env.production` à la racine. Si un fichier réapparaît c'est un bug.

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
# Vérifier que la cascade per-app est complète et non-bloquante
pnpm env:validate --env=local       # défaut
pnpm env:validate --env=staging
pnpm env:validate --env=production

# Push une app+layer à la fois
pnpm env:push:railway <app> <env>     # ex: pnpm env:push:railway ezauth staging
pnpm env:push:vercel <app> <env>      # ex: pnpm env:push:vercel ezpay production

# Push TOUTES les apps en une seule commande (8 apps × 2 layers ≈ 14 pushes)
pnpm env:push:all <env>               # production | staging | local
pnpm env:push:all production --dry-run        # preview sans cloud call
pnpm env:push:all staging --apps ezauth,ezpay # subset
pnpm env:push:all production --only-api       # API only
pnpm env:push:all production --only-web       # Web only
pnpm env:push:all production --continue-on-error  # don't fail-fast
```

**Multi-project Railway routing :** chaque app a un mapping explicite `app → { project, serviceName }` dans [`scripts/env/railway-projects.ts`](../../scripts/env/railway-projects.ts). Avant chaque push, `push-railway.ts` exécute automatiquement `railway link -p <project> -s <service> -e <env>` pour cibler la bonne project Railway, indépendamment du link local courant. Ex: `green-pulse-api` vit dans `TeamProjects`, les autres apps dans `ezstart-apis`. Ajouter une nouvelle app = une ligne dans `RAILWAY_APP_PROJECTS`. Si l'app n'est pas dans le map, le push échoue immédiatement avec une erreur claire (zéro silent fallback).

### 5. Helpers env (`@ezstart/config/env-resolvers`)

- `getMongoUrl(app)` — résout `{app}` dans MONGO_URL template
- `getJwtSecret()` — lit JWT_SECRET (depuis l'env du process)

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

### 8. Audit grep — racine

```bash
# Vérifier qu'aucun fichier .env* ne réapparait à la racine
ls -la .env* 2>&1 | grep -v "no such" | head -5
# Attendu : pas de match (sauf si vous êtes dans une feature branch en cours de migration)
```

### 9. Documentation complète

Voir [SECRETS.md](../../SECRETS.md) pour la doc canonique (à jour avec doctrine per-app-only).
