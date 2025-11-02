# 🚀 Déploiement - @ezstart Monorepo

## 📍 URLs de Déploiement

### APIs Railway (Hobby Plan - $5/mois)

| Service               | Platform | URL Production                         | Port | Status    |
| --------------------- | -------- | -------------------------------------- | ---- | --------- |
| **EZAuth API**        | Railway  | https://ezauth-api.up.railway.app/api  | 5010 | ✅ Active |
| **EZPay API**         | Railway  | https://ezpay-api.up.railway.app/api   | 5040 | 🔄 Config |
| **EZBill API**        | Railway  | https://ezbill-api.up.railway.app/api  | 5020 | 🔄 Config |
| **Tower Defense API** | Railway  | https://td-api.up.railway.app/api      | 5030 | 🔄 Config |
| **GreenPulse API**    | Railway  | https://greenpulse-api.up.railway.app/api | 5070 | 🔄 Config |
| **EZStart API (Monitoring)** | Railway  | https://ezstart-api.up.railway.app/api | 5000 | 🔄 Config |

**Pourquoi Railway Hobby Plan ?**

- ✅ **$5/mois pour TOUTES les APIs** - Unlimited services, 8GB RAM / 8 vCPU par service
- ✅ **0ms cold start** - Toujours actif, pas de sleep mode (contrairement à Render Free)
- ✅ **Déploiement automatique** - Push to deploy depuis GitHub
- ✅ **Environnements isolés** - Variables par service sans préfixes
- ✅ **Healthchecks automatiques** - Monitoring intégré
- ✅ **Nixpacks optimisé** - Build minimal Node.js uniquement

### Apps Web Vercel (Free Tier)

| Service           | Platform | URL Production                       | Status    |
| ----------------- | -------- | ------------------------------------ | --------- |
| **EZStart**       | Vercel   | https://ezstart-web.vercel.app       | ✅ Active |
| **EZAuth**        | Vercel   | https://ezauth.vercel.app            | ✅ Active |
| **EZBill**        | Vercel   | https://ezstart-ezbill.vercel.app    | ✅ Active |
| **EZPay**         | Vercel   | https://ezstart-ezpay.vercel.app     | ✅ Active |
| **Tower Defense** | Vercel   | https://tower-defense-web.vercel.app | ✅ Active |
| **FengShui**      | Vercel   | https://ezfengshui.vercel.app        | ✅ Active |
| **ASC-TCD**       | Vercel   | https://asc-tcd-web.vercel.app       | ✅ Active |

---

## 🚂 Configuration Railway

### Configuration Standard pour Toutes les APIs

**Architecture Monorepo Railway :**
- 1 Projet Railway = "ezstart"
- 6 Services = 6 APIs (ezauth, ezpay, ezbill, tower-defense, green-pulse, monitoring)
- Build automatique via [nixpacks.toml](./nixpacks.toml)

**Source Repository (même pour tous) :**

```
Repository: DFranck/ezstart
Branch: master
Root Directory: / (racine du monorepo)
```

**Build Configuration (automatique via nixpacks.toml) :**

Le fichier [nixpacks.toml](./nixpacks.toml) gère le build pour TOUTES les APIs :

```toml
[phases.setup]
nixPkgs = ['nodejs_20', 'pnpm']

[phases.install]
cmds = ['pnpm install --frozen-lockfile --shamefully-hoist']

[phases.build]
cmds = [
  'pnpm --filter @ezstart/types build',
  'pnpm --filter @ezstart/config build',
  'pnpm --filter @ezstart/logger build',
  'pnpm --filter @ezstart/express-core build'
]
```

**Start Command (spécifique par API) :**

```bash
# EZAuth API
cd apps/ezauth/api && pnpm turbo build --filter=api-ezauth && node dist/index.js

# EZPay API
cd apps/ezpay/api && pnpm turbo build --filter=api-ezpay && node dist/index.js

# EZBill API
cd apps/ezbill/api && pnpm turbo build --filter=api-ezbill && node dist/index.js

# Tower Defense API
cd apps/tower-defense/api && pnpm turbo build --filter=api-tower-defense && node dist/index.js

# GreenPulse API
cd apps/green-pulse/api && pnpm turbo build --filter=api-green-pulse && node dist/index.js

# Monitoring API
cd apps/monitoring/api && pnpm turbo build --filter=api-monitoring && node dist/index.js
```

**Healthcheck Path (même pour tous) :**

```
/api/health
```

**Networking (auto-généré par Railway) :**

- Public: `[service-name].up.railway.app`
- Private: `[service-name].railway.internal` (IPv6)
- Region: Southeast Asia (Singapore) recommandé
- Resources: 8GB RAM / 8 vCPU par service

---

### 1. EZAuth API

**Variables d'Environnement (8 variables) :**

```env
NODE_ENV=production
PORT=5010
MONGO_URL=mongodb+srv://user:password@cluster.mongodb.net/ezauth?retryWrites=true&w=majority
JWT_SECRET=production-jwt-secret-generate-with-openssl-rand-base64-64
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://ezauth-api.up.railway.app/api/auth/google/callback
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

**Note :** ALLOWED_ORIGINS auto-configuré par `@ezstart/config` (pas besoin de variable)

---

### 2. EZPay API

**Variables d'Environnement :**

```env
NODE_ENV=production
PORT=5040
MONGO_URL=mongodb+srv://user:password@cluster.mongodb.net/ezpay?retryWrites=true&w=majority
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
WEB_URL=https://ezstart-ezpay.vercel.app
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

---

### 3. EZBill API

**Variables d'Environnement :**

```env
NODE_ENV=production
PORT=5020
MONGO_URL=mongodb+srv://user:password@cluster.mongodb.net/ezbill?retryWrites=true&w=majority
JWT_SECRET=production-jwt-secret-ezbill
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

---

### 4. Tower Defense API

**Variables d'Environnement :**

```env
NODE_ENV=production
PORT=5030
MONGO_URL=mongodb+srv://user:password@cluster.mongodb.net/tower-defense?retryWrites=true&w=majority
JWT_SECRET=production-jwt-secret-td
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

---

### 5. GreenPulse API

**Variables d'Environnement :**

```env
NODE_ENV=production
PORT=5070
MONGO_URL=mongodb+srv://user:password@cluster.mongodb.net/green-pulse?retryWrites=true&w=majority
JWT_SECRET=production-jwt-secret-gp
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

---

### 6. Monitoring API

**Variables d'Environnement :**

```env
NODE_ENV=production
PORT=5000
MONGO_URL=mongodb+srv://user:password@cluster.mongodb.net/monitoring?retryWrites=true&w=majority
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

---

## 🎨 Configuration Vercel

### Apps Web - Configuration Standardisée

**Pour toutes les apps web (ezstart, ezauth, ezbill, ezpay, etc.) :**

```bash
# Root Directory
apps/[app]/web

# Include files outside root directory
✅ COCHÉ (obligatoire pour monorepo)

# Build Command
pnpm build

# Install Command
pnpm install --frozen-lockfile
```

### Structure .env Apps Web

**Chaque app web a maintenant 3 fichiers :**

```
apps/ezauth/web/
├── .env.example       ← Template (COMMITTÉ)
├── .env.local         ← Dev local (GITIGNORED)
└── .env.production    ← Production (GITIGNORED)

apps/ezpay/web/
├── .env.example       ← Template (COMMITTÉ)
├── .env.local         ← Dev local (GITIGNORED)
└── .env.production    ← Production (GITIGNORED)
```

### Variables d'Environnement Vercel

**EZAuth Web :**

```env
# Development (.env.local)
PORT=5015
NEXT_PUBLIC_EZAUTH_API_URL=http://localhost:5010/api/auth

# Production (.env.production - Configurer dans Vercel)
NEXT_PUBLIC_EZAUTH_API_URL=https://ezauth.up.railway.app/api/auth
```

**EZPay Web :**

```env
# Development (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:5040/api
NEXT_PUBLIC_WEB_URL=http://localhost:5045
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Production (.env.production - Configurer dans Vercel)
NEXT_PUBLIC_API_URL=https://ezpay-api.up.railway.app/api
NEXT_PUBLIC_WEB_URL=https://ezstart-ezpay.vercel.app
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

**Configuration dans Vercel Dashboard :**

```
Project Settings → Environment Variables

Pour EZAuth Web:
1. NEXT_PUBLIC_EZAUTH_API_URL = https://ezauth-api.up.railway.app/api/auth

Pour EZBill Web:
1. NEXT_PUBLIC_EZAUTH_API_URL = https://ezauth-api.up.railway.app/api/auth
2. NEXT_PUBLIC_API_URL = https://ezbill-api.up.railway.app/api

Pour EZPay Web:
1. NEXT_PUBLIC_API_URL = https://ezpay-api.up.railway.app/api
2. NEXT_PUBLIC_WEB_URL = https://ezstart-ezpay.vercel.app
3. NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_live_...

Pour Tower Defense Web:
1. NEXT_PUBLIC_EZAUTH_API_URL = https://ezauth-api.up.railway.app/api/auth
2. NEXT_PUBLIC_API_URL = https://td-api.up.railway.app/api

Pour GreenPulse Web:
1. NEXT_PUBLIC_EZAUTH_API_URL = https://ezauth-api.up.railway.app/api/auth
2. NEXT_PUBLIC_API_URL = https://greenpulse-api.up.railway.app/api

Environment: Production
Branch: master
```

---

## ⚡ Optimisation Build Vercel (OOM Fix)

### Problème : Out of Memory (OOM)

Vercel (Free Plan: 2 cores, 8GB RAM) exécute `turbo build` qui compile **tous les 28 packages** du monorepo, causant un **Out of Memory**.

```
• At least one "Out of Memory" ("OOM") event was detected during the build.
• This occurs when processes or applications running during the build completely fill up the available memory (RAM)
```

### Solution : Turbo outputMode + Build Script Optimisé

**1. turbo.json optimisé :**

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "**/dist/**"],
      "outputMode": "errors-only" // ← Réduit les logs et la mémoire
    }
  }
}
```

**2. Build scripts apps web déjà optimisés :**

```json
// apps/ezpay/web/package.json
"build": "pnpm --filter @ezstart/ui --filter @ezstart/pay-sdk --filter @ezstart/next-theme build && next build"

// apps/ezauth/web/package.json
"build": "pnpm --filter @ezstart/ui --filter @ezstart/auth-sdk --filter @ezstart/next-theme build && next build"
```

**3. Vercel utilise automatiquement le script `build` local** grâce à Root Directory

### Pourquoi ça fonctionne ?

- ✅ **Root Directory**: `apps/ezpay/web` → Vercel exécute le `package.json` local
- ✅ **Script optimisé**: Ne build que les 3 packages nécessaires (`ui`, `pay-sdk`, `next-theme`)
- ✅ **outputMode**: Réduit les logs Turbo = moins de mémoire
- ✅ **Pas de build APIs**: Les APIs ne sont pas compilées (inutile pour le web)

### Résultat

**Avant (OOM) :**

```
• Running build in 28 packages (TOUS compilés)
• APIs (ezauth, ezpay, tower-defense, ezbill, green-pulse)
• Packages (ui, auth-sdk, pay-sdk, types, express-core, etc.)
• Out of Memory après 25 minutes
```

**Après (✅ Success) :**

```
• Running build in 3 packages (seulement les nécessaires)
• @ezstart/ui
• @ezstart/pay-sdk
• @ezstart/next-theme
• Build complété en ~90s
```

---

## 🔧 Optimisation Build Railway avec Nixpacks

### Architecture Build en 2 Phases

**Phase 1 : Build Dependencies (nixpacks.toml)**

Le fichier [nixpacks.toml](./nixpacks.toml) build les dépendances communes à TOUTES les APIs :

```toml
[phases.build]
cmds = [
  'pnpm --filter @ezstart/types build',
  'pnpm --filter @ezstart/config build',
  'pnpm --filter @ezstart/logger build',
  'pnpm --filter @ezstart/express-core build'
]
```

**Phase 2 : Build API Spécifique (Start Command)**

Chaque API build uniquement son package final :

```bash
cd apps/ezauth/api && pnpm turbo build --filter=api-ezauth && node dist/index.js
```

### Pourquoi nixpacks.toml ?

**Problème :** Railway Nixpacks installait 250+ packages inutiles (libgtk, libx11, mesa drivers, etc.)

**Solution :** Forcer Node.js uniquement via nixpacks.toml :

```toml
[phases.setup]
nixPkgs = ['nodejs_20', 'pnpm']  # ← Seulement Node.js, pas de libs graphiques
```

**Résultat :**
- ✅ Build minimal (Node.js + pnpm uniquement)
- ✅ Temps de build réduit (~5-10 min)
- ✅ Taille image réduite
- ✅ Pas de packages inutiles

### Ordre de Build

**Dependencies (communes) :**
1. `@ezstart/types` - Types TypeScript
2. `@ezstart/config` - Configuration centralisée
3. `@ezstart/logger` - Logging Pino
4. `@ezstart/express-core` - Infrastructure API

**API Spécifique :**
5. `api-[name]` - Build final de l'API

**⚠️ Packages NON buildés (utilisés uniquement côté web) :**

- `@ezstart/ui` - Composants React
- `@ezstart/auth-sdk` - Client authentification
- `@ezstart/pay-sdk` - Client paiement
- `@ezstart/next-theme` - Theme Next.js

---

## 📊 Monitoring Usage Railway

### Plan Hobby : $5/mois pour TOUTES les APIs

**Ressources incluses :**
- ✅ **Unlimited services** - 6 APIs sans frais supplémentaires
- ✅ **8GB RAM / 8 vCPU** par service (largement suffisant)
- ✅ **100GB bandwidth** inclus
- ✅ **Pas de cold start** - Toujours actif
- ✅ **Healthchecks automatiques**

**Vérifier la Consommation :**

```
Dashboard Railway → Project Settings → Usage
- CPU Time (Execution time)
- Memory Usage
- Network (entrant/sortant)
```

**Estimation Consommation :**

```
6 APIs (EZAuth, EZPay, EZBill, TD, GreenPulse, Monitoring)
Usage moyen : ~$3-4/mois (reste $1-2 de marge)
```

**Optimisations :**

- ✅ Healthcheck path configuré (`/api/health`)
- ✅ Pas de cold start (toujours actif)
- ✅ Build optimisé (nixpacks.toml)
- ✅ Regions optimisées (Southeast Asia)

---

## 🚨 Troubleshooting

### Build Failures Railway

**Erreur: Module not found @ezstart/xxx**

```bash
# Solution: Builder les dépendances workspace avant
pnpm --filter @ezstart/express-core build && pnpm --filter @ezstart/auth-sdk build
```

**Erreur: TypeScript compilation failed**

```bash
# Vérifier que tsconfig.json a composite: true
# Vérifier que tous les packages ont été buildés
```

### Runtime Failures

**API ne démarre pas**

```bash
# Vérifier les variables d'environnement (MONGO_URL, JWT_SECRET, etc.)
# Vérifier le healthcheck path (/api/health)
# Vérifier les logs Railway
```

**CORS Errors**

```bash
# Ajouter les URLs Vercel dans ALLOWED_ORIGINS
# Format: https://app.vercel.app,https://app2.vercel.app
```

---

## 🔐 Secrets Management

### Structure .env Standardisée (3 fichiers par projet)

**Chaque API a maintenant 3 fichiers :**

```
apps/ezauth/api/
├── .env.example       ← Template (COMMITTÉ) - Placeholders et documentation
├── .env.local         ← Dev local (GITIGNORED) - Valeurs réelles de développement
└── .env.production    ← Production (GITIGNORED) - Valeurs Railway à copier

apps/ezpay/api/
├── .env.example       ← Template (COMMITTÉ)
├── .env.local         ← Dev local (GITIGNORED)
└── .env.production    ← Production (GITIGNORED)
```

### Workflow Environnements

**1. Développement Local :**

```bash
# Copier .env.example vers .env.local
cp apps/ezauth/api/.env.example apps/ezauth/api/.env.local

# Remplir avec valeurs réelles (MongoDB, secrets, etc.)
# express-core charge .env.local en priorité
```

**2. Production Railway :**

```bash
# Référence: .env.production contient toutes les variables nécessaires
# NE PAS commiter .env.production (déjà dans .gitignore)

# Copier chaque variable dans Railway Dashboard:
Railway → Settings → Variables → Add Variable
- NODE_ENV=production
- PORT=5040
- MONGO_URL=...
- etc.
```

**3. Template (.env.example) :**

```bash
# Toujours à jour avec toutes les variables nécessaires
# Contient placeholders et documentation complète
# OBLIGATOIRE de mettre à jour après ajout de nouvelles variables
```

### Secrets à NE JAMAIS Commiter

**Railway Variables (Production) :**

- ❌ `MONGO_URL` avec credentials
- ❌ `JWT_SECRET` production (différent de dev)
- ❌ `STRIPE_SECRET_KEY` live keys (sk*live*\*)
- ❌ `STRIPE_WEBHOOK_SECRET`

**Fichiers git-ignorés :**

- ✅ `.env.local` - Dev avec secrets réels
- ✅ `.env.production` - Template production avec secrets réels
- ❌ `.env.example` - Template SANS secrets (committé)

### Railway Variables Configuration

**Dans Railway Dashboard :**

```
Service → Settings → Variables → Add Variable

Copier depuis .env.production:
1. NODE_ENV=production
2. PORT=5040
3. MONGO_URL=mongodb+srv://...
4. STRIPE_SECRET_KEY=sk_live_...
5. etc.

Options:
- Shared across all deployments: ✅
- Available during build: ✅ (si nécessaire)
```

---

## 📝 Checklist Déploiement

### Avant de Déployer

- [ ] Tester localement avec `pnpm dev`
- [ ] Vérifier build avec `pnpm turbo build --filter=api-xxx`
- [ ] Vérifier typecheck avec `pnpm typecheck`
- [ ] Mettre à jour `.env.example` si nouvelles variables
- [ ] Commit + push sur `master`

### Configuration Railway

- [ ] Repository GitHub connecté (DFranck/ezstart)
- [ ] Root Directory: `/` (racine monorepo)
- [ ] Start command: `cd apps/[api]/api && pnpm turbo build --filter=api-[name] && node dist/index.js`
- [ ] Variables d'environnement configurées (SANS préfixes)
- [ ] Healthcheck path configuré (`/api/health`)
- [ ] nixpacks.toml présent à la racine (build automatique)

### Configuration Vercel

- [ ] Root directory pointe vers `apps/[app]/web`
- [ ] "Include files outside root directory" coché
- [ ] Variables `NEXT_PUBLIC_API_URL` pointent vers Railway
- [ ] Build command: `pnpm build`

### Après Déploiement

- [ ] Vérifier healthcheck API (`curl https://api.url/api/health`)
- [ ] Tester endpoints critiques
- [ ] Vérifier CORS avec apps web
- [ ] Surveiller usage Railway (Settings → Usage)

---

## 🎯 Best Practices

1. **Railway Hobby Plan ($5/mois)** : Toutes les APIs sur un seul projet, unlimited services
2. **Vercel Free Plan** : Parfait pour apps web Next.js avec Edge déploiement
3. **Monorepo Build** : nixpacks.toml build les deps communes, Start Command build l'API spécifique
4. **Secrets** : Utiliser `.env.local` en dev, Railway Variables en prod (SANS préfixes)
5. **Monitoring** : Surveiller usage Railway Dashboard → Usage
6. **Healthchecks** : `/api/health` obligatoire pour confirmer déploiements réussis
7. **Push to Deploy** : Railway déploie automatiquement sur push `master`

---

## 📚 Ressources

- [Railway Docs](https://docs.railway.app)
- [Vercel Docs](https://vercel.com/docs)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [Stripe Dashboard](https://dashboard.stripe.com)
