# 🤖 CI/CD Setup - Infrastructure as Code

**Tous les déploiements du monorepo @ezstart sont maintenant configurés via des fichiers versionés !**

## 📋 Vue d'Ensemble

| Platform | Config File | Services | Auto-Deploy |
|----------|-------------|----------|-------------|
| **Render** | [render.yaml](../render.yaml) | 4 APIs (EZBill, TD, GreenPulse, Monitoring) | ✅ On commit |
| **Railway** | [railway.toml](../railway.toml) | 2 APIs (EZAuth, EZPay) | ✅ On commit |
| **Vercel** | `apps/*/web/vercel.json` | 8 Web Apps (tous) | ✅ On commit |

## 🎯 Avantages

✅ **Infrastructure as Code** - Configuration versionée avec Git
✅ **Reproducible** - Recréer un service en 1 clic
✅ **Documenté** - Toute l'équipe voit la config
✅ **Pas de setup manuel** - Fini les dashboards à configurer
✅ **Review via PR** - Changements de config reviewés comme du code
✅ **Rollback facile** - `git revert` pour revenir en arrière

---

## 🚂 Railway Setup

### Architecture

**Fichier unique :** `railway.toml` à la racine du monorepo

**Services configurés :**
- **EZAuth API** - Port 5010, Healthcheck `/api/health`
- **EZPay API** - Port 5040, Healthcheck `/api/health`

### Configuration

```toml
[environments.ezauth]
name = "ezauth"

[environments.ezauth.build]
buildCommand = "pnpm install --frozen-lockfile --shamefully-hoist && ..."

[environments.ezauth.deploy]
startCommand = "cd apps/ezauth/api && node dist/index.js"

[[environments.ezauth.deploy.watchPaths]]
include = ["apps/ezauth/api/**", "packages/express-core/**", ...]
```

### Watch Paths - Deploy Sélectif

Railway ne déploie **que si les fichiers surveillés changent** :

**EZAuth :**
- `apps/ezauth/api/**`
- `packages/express-core/**`
- `packages/types/**`
- `packages/config/**`
- `packages/logger/**`

**EZPay :**
- `apps/ezpay/api/**`
- `packages/express-core/**`
- `packages/types/**`
- `packages/config/**`
- `packages/logger/**`

**Résultat :** Modifier EZStart web ne trigger PAS de deploy EZAuth API ✅

### Variables d'Environnement

**⚠️ Les secrets doivent être ajoutés manuellement dans Railway Dashboard :**

**EZAuth API :**
```env
NODE_ENV=production
PORT=5010
MONGO_URL=mongodb+srv://...
JWT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://ezauth.up.railway.app/api/auth/google/callback
SENTRY_DSN=...
```

**EZPay API :**
```env
NODE_ENV=production
PORT=5040
MONGO_URL=mongodb+srv://...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
WEB_URL=https://ezpay.ezstart.xyz
SENTRY_DSN=...
```

### Setup Initial

1. **Créer un nouveau service sur Railway**
2. **Connecter le repo GitHub** `DFranck/ezstart`
3. **Branch:** `master`
4. **Root Directory:** `/` (racine du monorepo)
5. Railway détecte automatiquement `railway.toml` ✅
6. **Ajouter les variables d'environnement** dans Settings → Variables
7. **Premier déploiement manuel** → Ensuite auto-deploy

### Ajouter un Nouveau Service

1. Ajouter une section `[environments.newapp]` dans `railway.toml`
2. Configurer build/deploy/watchPaths
3. Commit & push
4. Créer le service sur Railway Dashboard
5. Railway utilise automatiquement la config du fichier ✅

---

## 🎨 Render Setup

### Architecture

**Fichier unique :** `render.yaml` à la racine du monorepo

**Services configurés :**
- **EZBill API** - Port 5020, Healthcheck `/api/health`
- **Tower Defense API** - Port 5030, Healthcheck `/api/health`
- **GreenPulse API** - Port 5070, Healthcheck `/api/health`
- **Monitoring API** - Port 5080, Healthcheck `/api/health`

### Configuration

```yaml
services:
  - type: web
    name: ezbill-api
    runtime: node
    region: oregon
    plan: free
    branch: master
    buildCommand: npm install -g pnpm@10.12.2 && pnpm install ...
    startCommand: cd apps/ezbill/api && node dist/index.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGO_URL
        sync: false  # Secret - set in Render dashboard
```

### Build Filters - Deploy Sélectif

Render ne déploie **que si les fichiers surveillés changent** :

**EZBill API :**
- **Included:** `apps/ezbill/api/**`, `packages/express-core/**`, `packages/types/**`, `packages/config/**`, `packages/logger/**`
- **Ignored:** Tous les autres apps et packages UI

**Tower Defense API :**
- **Included:** `apps/tower-defense/api/**`, `packages/express-core/**`, `packages/types/**`, `packages/config/**`, `packages/logger/**`
- **Ignored:** Tous les autres apps et packages UI

**GreenPulse API :**
- **Included:** `apps/green-pulse/api/**`, `packages/express-core/**`, `packages/types/**`, `packages/config/**`, `packages/logger/**`
- **Ignored:** Tous les autres apps et packages UI

**Monitoring API :**
- **Included:** `apps/monitoring/api/**`, `packages/express-core/**`, `packages/types/**`, `packages/config/**`, `packages/logger/**`, `packages/monitoring/**`
- **Ignored:** Tous les autres apps et packages UI

**Résultat :** Modifier EZStart web ne trigger PAS de deploy EZBill API ✅

### Variables d'Environnement

**⚠️ Les secrets doivent être ajoutés manuellement dans Render Dashboard :**

**EZBill API :**
```env
NODE_ENV=production (auto-set)
PORT=5020 (auto-set)
MONGO_URL=mongodb+srv://... (secret)
JWT_SECRET=... (secret)
SENTRY_DSN=... (secret)
```

**Tower Defense API :**
```env
NODE_ENV=production
PORT=5030
MONGO_URL=mongodb+srv://...
SENTRY_DSN=...
```

**GreenPulse API :**
```env
NODE_ENV=production
PORT=5070
MONGO_URL=mongodb+srv://...
SENTRY_DSN=...
GEMINI_API_KEY=... (secret)
```

**Monitoring API :**
```env
NODE_ENV=production
PORT=5080
MONGO_URL=mongodb+srv://...
SENTRY_DSN=...
HEALTH_CHECK_INTERVAL=600000 (auto-set)
HEALTH_CHECK_TIMEOUT=5000 (auto-set)
HEALTH_CHECK_RETRIES=3 (auto-set)
```

### Setup Initial

1. **Render Dashboard → New Blueprint**
2. **Connecter le repo GitHub** `DFranck/ezstart`
3. **Sélectionner `render.yaml`**
4. Render crée automatiquement les 4 services ✅
5. **Ajouter les secrets** dans chaque service (Dashboard → Environment)
6. **Premier déploiement manuel** → Ensuite auto-deploy

### Ajouter un Nouveau Service

1. Ajouter une entrée dans `services:` de `render.yaml`
2. Configurer build/deploy/filters
3. Commit & push
4. Render Dashboard → "Sync Blueprint" ou "New Blueprint"
5. Render crée le service automatiquement ✅

---

## ▲ Vercel Setup

### Architecture

**Fichiers distribués :** Un `vercel.json` par web app

**Services configurés :**
- EZStart (`apps/ezstart/web/vercel.json`)
- EZAuth (`apps/ezauth/web/vercel.json`)
- EZBill (`apps/ezbill/web/vercel.json`)
- EZPay (`apps/ezpay/web/vercel.json`)
- FengShui (`apps/fengshui/web/vercel.json`)
- Tower Defense (`apps/tower-defense/web/vercel.json`)
- ASC-TCD (`apps/asc-tcd/web/vercel.json`)
- GreenPulse (`apps/green-pulse/web/vercel.json`)

### Configuration Standard

```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": ".next",
  "installCommand": "pnpm install --frozen-lockfile",
  "framework": "nextjs",
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Variables d'Environnement

**⚠️ Les variables doivent être ajoutées dans Vercel Dashboard :**

**Exemple EZBill Web :**
```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://ezbill.onrender.com/api
NEXT_PUBLIC_AUTH_URL=https://ezauth.up.railway.app/api/auth
```

**Exemple EZPay Web :**
```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://ezpay-api.up.railway.app/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Setup Initial

1. **Vercel Dashboard → New Project**
2. **Import Git Repository** `DFranck/ezstart`
3. **Root Directory:** `apps/[app]/web`
4. **Framework Preset:** Next.js
5. ✅ **Cocher "Include files outside root directory"** (OBLIGATOIRE pour monorepo)
6. Vercel détecte automatiquement `vercel.json` ✅
7. **Ajouter les variables d'environnement** dans Settings → Environment Variables
8. **Deploy**

### Ajouter une Nouvelle Web App

1. Créer `apps/[app]/web/vercel.json` avec la config standard
2. Commit & push
3. Vercel Dashboard → New Project → Sélectionner le dossier
4. Vercel utilise automatiquement la config du fichier ✅

---

## 🔄 Workflow de Développement

### 1. Modifier du Code

```bash
# Exemple: Modifier EZAuth API
vim apps/ezauth/api/src/index.ts
```

### 2. Commit & Push

```bash
git add apps/ezauth/api/src/index.ts
git commit -m "feat(ezauth): add Google OAuth support"
git push origin master
```

### 3. Auto-Deploy Sélectif

**Railway détecte le changement :**
- ✅ `apps/ezauth/api/src/index.ts` est dans les watchPaths
- ✅ Trigger build + deploy EZAuth API
- ❌ EZPay API ne déploie PAS (pas concerné)

**Render détecte le changement :**
- ❌ Aucun service Render ne déploie (EZAuth pas sur Render)

**Vercel détecte le changement :**
- ❌ Aucune web app ne déploie (modification API, pas web)

### 4. Vérifier le Déploiement

```bash
# Tester l'API déployée
curl https://ezauth.up.railway.app/api/health
# → { "status": "ok" }

# Vérifier les logs Railway
railway logs --service ezauth
```

---

## 📊 Build Filters - Tableau Complet

**Packages Critiques (Trigger Deploy de TOUTES les APIs) :**
- `packages/express-core/**`
- `packages/config/**`
- `packages/logger/**`
- `packages/types/**`

**Packages Ignorés (Ne trigger JAMAIS de deploy API) :**
- `packages/ui/**`
- `packages/auth-sdk/**`
- `packages/pay-sdk/**`
- `packages/next-theme/**`
- `packages/next-config/**`

**APIs Deploy Matrix :**

| Change | EZAuth | EZPay | EZBill | TD | GreenPulse | Monitoring |
|--------|--------|-------|--------|----|-----------:|------------|
| `apps/ezauth/api/**` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `apps/ezpay/api/**` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `apps/ezbill/api/**` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `apps/tower-defense/api/**` | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `apps/green-pulse/api/**` | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `apps/monitoring/api/**` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `packages/express-core/**` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `packages/config/**` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `packages/ui/**` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 🎯 Best Practices

### 1. Toujours Tester en Local Avant de Push

```bash
# Vérifier TypeScript
pnpm typecheck

# Vérifier Lint
pnpm lint

# Builder localement
pnpm --filter api-ezauth build

# Tester le start
cd apps/ezauth/api && node dist/index.js
```

### 2. Commit Messages Descriptifs

```bash
# ✅ BON - Indique clairement le scope
git commit -m "feat(ezauth): add Google OAuth callback route"

# ❌ MAUVAIS - Vague
git commit -m "update code"
```

### 3. Variables d'Environnement

```bash
# ✅ Secrets dans Dashboard (MONGO_URL, JWT_SECRET, API_KEYS)
# ✅ Non-secrets dans config files (NODE_ENV, PORT)

# ❌ JAMAIS commiter de secrets dans render.yaml ou railway.toml
```

### 4. Build Filters Précis

```toml
# ✅ BON - Seulement ce qui impacte le service
include = ["apps/ezauth/api/**", "packages/express-core/**"]

# ❌ MAUVAIS - Trop large (deploy inutiles)
include = ["apps/**", "packages/**"]
```

### 5. Healthchecks Configurés

```toml
# ✅ Toujours ajouter un healthcheck
[deploy.healthcheck]
path = "/api/health"
timeout = 100
interval = 60
```

---

## 🐛 Troubleshooting

### Railway ne détecte pas railway.toml

**Problème :** Service créé avant l'ajout du fichier

**Solution :**
1. Supprimer le service existant
2. Recréer avec le fichier `railway.toml` déjà présent
3. Railway détecte automatiquement la config ✅

### Render Blueprint ne sync pas

**Problème :** Changements dans `render.yaml` pas appliqués

**Solution :**
1. Dashboard → Service → Settings
2. "Sync Blueprint" button
3. Ou supprimer + recréer via "New Blueprint"

### Build échoue avec "pnpm not found"

**Problème :** pnpm pas installé globalement

**Solution :**
```bash
# Render
buildCommand: npm install -g pnpm@10.12.2 && pnpm install ...

# Railway (pas besoin, Nixpacks détecte pnpm-lock.yaml)
```

### Deploy trigger trop souvent

**Problème :** Build filters trop larges

**Solution :**
```toml
# ✅ Préciser exactement les paths nécessaires
include = ["apps/ezauth/api/**", "packages/express-core/**"]

# ❌ Éviter les wildcards trop génériques
include = ["**/*"]
```

---

## 📚 Ressources

- [Railway Config Docs](https://docs.railway.app/deploy/config-as-code)
- [Render Blueprint Docs](https://render.com/docs/blueprint-spec)
- [Vercel Config Docs](https://vercel.com/docs/projects/project-configuration)
- [Monorepo Deployment Guide](https://vercel.com/docs/monorepos)

---

**Créé le 26/10/2025 - CI/CD Infrastructure as Code pour @ezstart**
