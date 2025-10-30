# 🚀 Déploiement - @ezstart Monorepo

## 📍 URLs de Déploiement

### APIs Oracle Cloud (Free Tier - GRATUIT À VIE)

| Service               | Platform | URL Production                         | Port | Status    |
| --------------------- | -------- | -------------------------------------- | ---- | --------- |
| **EZAuth API**        | Oracle   | https://ezauth.ezstart.xyz/api         | 5010 | ✅ Active |
| **EZPay API**         | Oracle   | https://ezpay.ezstart.xyz/api          | 5040 | ✅ Active |
| **EZBill API**        | Oracle   | https://ezbill.ezstart.xyz/api         | 5020 | ✅ Active |
| **Tower Defense API** | Oracle   | https://td-api.ezstart.xyz/api         | 5030 | ✅ Active |
| **GreenPulse API**    | Oracle   | https://greenpulse.ezstart.xyz/api     | 5070 | ✅ Active |
| **Monitoring API**    | Oracle   | https://monitoring.ezstart.xyz/api     | 5000 | ✅ Active |

**Pourquoi Oracle Cloud Free Tier ?**

- ✅ **GRATUIT À VIE** - Pas de limite de temps, aucune carte facturée
- ✅ **Ressources généreuses** - 4 CPU ARM, 24GB RAM, 200GB storage
- ✅ **0ms cold start** - Toujours actif, pas de sleep mode
- ✅ **Haute performance** - ARM Ampere, excellentes performances Node.js
- ✅ **10TB/mois bande passante** - Largement suffisant
- ✅ **SSL/TLS inclus** - Let's Encrypt automatisé
- ✅ **Une seule VM** - Toutes les APIs sur un serveur, facile à gérer

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

## ☁️ Configuration Oracle Cloud

### Guide Complet

Pour le guide complet de déploiement sur Oracle Cloud, consultez **[docs/ORACLE-CLOUD-DEPLOY.md](./docs/ORACLE-CLOUD-DEPLOY.md)**

### Quick Start

**1. Prérequis:**
- Compte Oracle Cloud (gratuit, carte requise mais jamais facturée)
- VM créée (4 OCPU ARM, 24GB RAM)
- DNS configurés (6 sous-domaines pointant vers l'IP de la VM)
- Domaines : `ezauth.ezstart.xyz`, `ezpay.ezstart.xyz`, `ezbill.ezstart.xyz`, `td-api.ezstart.xyz`, `greenpulse.ezstart.xyz`, `monitoring.ezstart.xyz`

**2. Sur la VM Oracle (via SSH):**

```bash
# 1. Installer Docker et Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu
sudo apt install docker-compose-plugin -y

# 2. Cloner le repository
git clone https://github.com/DFranck/ezstart.git
cd ezstart

# 3. Configurer les variables d'environnement
cp .env.oracle.example .env
nano .env  # Remplir avec vos valeurs réelles

# 4. Déployer toutes les APIs
./scripts/oracle-deploy.sh

# 5. Configurer SSL (après propagation DNS)
./scripts/oracle-init-ssl.sh
```

**3. Scripts de gestion:**

```bash
# Vérifier la santé des APIs
./scripts/oracle-health.sh

# Voir les logs
./scripts/oracle-logs.sh all          # Tous les containers
./scripts/oracle-logs.sh ezauth       # Une API spécifique

# Mettre à jour avec le nouveau code
./scripts/oracle-update.sh
```

### Architecture Docker

Toutes les APIs tournent dans des containers Docker orchestrés par Docker Compose :

```
Oracle Cloud VM (ARM)
├── Nginx Reverse Proxy (ports 80/443)
│   ├── SSL/TLS (Let's Encrypt)
│   ├── Rate limiting
│   └── Proxy vers APIs
│
└── Docker Compose
    ├── ezauth-api (container)
    ├── ezpay-api (container)
    ├── ezbill-api (container)
    ├── tower-defense-api (container)
    ├── green-pulse-api (container)
    ├── monitoring-api (container)
    ├── nginx-proxy (container)
    └── certbot (container)
```

### Fichiers de Configuration

| Fichier | Description |
|---------|-------------|
| [docker-compose.yml](./docker-compose.yml) | Orchestration des 6 APIs + Nginx |
| [nginx/nginx.conf](./nginx/nginx.conf) | Configuration reverse proxy et SSL |
| [.env.oracle.example](./.env.oracle.example) | Template variables d'environnement |
| apps/*/api/Dockerfile | Dockerfiles optimisés multi-stage |
| [scripts/oracle-*.sh](./scripts/) | Scripts d'automatisation |

---

## 🚂 Configuration Railway (ANCIENNE - Maintenant sur Oracle)

### 1. EZAuth API

**Source Repository:**

```
Repository: DFranck/ezstart
Branch: master
Root Directory: (none - racine du monorepo)
```

**Build Configuration:**

```bash
# Build Command (OPTIMISÉ - seulement express-core nécessaire)
pnpm install --frozen-lockfile --shamefully-hoist && \
pnpm --filter @ezstart/express-core build && \
pnpm turbo build --filter=api-ezauth

# Note: auth-sdk n'est utilisé que côté web, pas dans l'API
# @ezstart/ui n'est pas nécessaire pour l'API

# Start Command
cd apps/ezauth/api && node dist/index.js

# Healthcheck Path
/api/health
```

**Variables d'Environnement:**

```env
NODE_ENV=production
PORT=5010
MONGO_URL=mongodb+srv://user:password@cluster.mongodb.net/ezauth?retryWrites=true&w=majority
JWT_SECRET=production-secure-jwt-secret-change-me
ALLOWED_ORIGINS=https://ezauth.vercel.app,https://ezstart-ezbill.vercel.app,https://tower-defense-web.vercel.app,https://ezstart-ezpay.vercel.app
```

**Networking:**

- Public: `ezauth.up.railway.app` (Port 5010)
- Private: `ezauth.railway.internal` (IPv6)
- Healthcheck: `/api/health`
- Region: Southeast Asia (Singapore)
- Resources: 512MB RAM / 1 vCPU

---

### 2. EZPay API

**Source Repository:**

```
Repository: DFranck/ezstart
Branch: master
Root Directory: (none - racine du monorepo)
```

**Build Configuration:**

```bash
# Build Command (OPTIMISÉ - seulement express-core nécessaire)
pnpm install --frozen-lockfile --shamefully-hoist && \
pnpm --filter @ezstart/express-core build && \
pnpm turbo build --filter=api-ezpay

# Note: pay-sdk n'est utilisé que côté web, pas dans l'API

# Start Command
cd apps/ezpay/api && node dist/index.js

# Healthcheck Path
/api/health
```

**Variables d'Environnement:**

```env
NODE_ENV=production
PORT=5040
MONGO_URL=mongodb+srv://user:password@cluster.mongodb.net/ezpay?retryWrites=true&w=majority
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
WEB_URL=https://ezstart-ezpay.vercel.app
```

**Networking:**

- Public: `ezpay-api.up.railway.app` (Port 5040)
- Private: `ezstart.railway.internal` (IPv6)
- Healthcheck: `/api/health`
- Region: Southeast Asia (Singapore)
- Resources: 512MB RAM / 1 vCPU

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
1. NEXT_PUBLIC_EZAUTH_API_URL = https://ezauth.up.railway.app/api/auth

Pour EZPay Web:
1. NEXT_PUBLIC_API_URL = https://ezpay-api.up.railway.app/api
2. NEXT_PUBLIC_WEB_URL = https://ezstart-ezpay.vercel.app
3. NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_live_...

Environment: Production
Branch: master (ou main)
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

## 🔧 Optimisation Build Railway

### Pourquoi builder express-core avant l'API ?

Les APIs dépendent de `@ezstart/express-core` qui doit être compilé AVANT :

```bash
# ❌ MAUVAIS (erreurs de build)
pnpm turbo build --filter=api-ezauth

# ✅ BON (express-core compilé d'abord)
pnpm --filter @ezstart/express-core build && \
pnpm turbo build --filter=api-ezauth
```

**Ordre de build obligatoire :**

1. `@ezstart/express-core` - Infrastructure API commune (OBLIGATOIRE)
2. `api-ezauth` ou `api-ezpay` - API finale

**⚠️ SDKs NON nécessaires pour le build API :**

- `@ezstart/auth-sdk` - Utilisé uniquement côté web
- `@ezstart/pay-sdk` - Utilisé uniquement côté web
- `@ezstart/ui` - Utilisé uniquement côté web

---

## 📊 Monitoring Usage Railway

### Vérifier la Consommation

**Dashboard Railway :**

```
Settings → Usage
- CPU Usage
- Memory Usage
- Network (entrant/sortant)
```

**Estimation Consommation :**

```
EZAuth API (SSO ponctuel) : ~$0.10-0.20/mois
EZPay API (paiements rares) : ~$0.10-0.20/mois
TOTAL : ~$0.20-0.40/mois (reste $0.60-0.80 de marge)
```

**Optimisations pour réduire la consommation :**

- ✅ Healthcheck timeout à 300s (évite vérifications trop fréquentes)
- ✅ Restart policy: On Failure (10 retries max)
- ✅ Pas de cron jobs (évite réveils inutiles)
- ✅ Regions optimisées (Southeast Asia proche utilisateurs)

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

- [ ] Build command inclut les dépendances workspace
- [ ] Start command pointe vers `dist/index.js`
- [ ] Variables d'environnement configurées
- [ ] Healthcheck path configuré (`/api/health`)
- [ ] Region optimisée (Southeast Asia)

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

1. **Railway Free Plan** : Réservé aux APIs critiques avec usage ponctuel (auth, paiements)
2. **Vercel Free Plan** : Parfait pour apps web Next.js avec Edge déploiement
3. **Monorepo** : Toujours builder les dépendances workspace avant les apps
4. **Secrets** : Utiliser `.env.local` en dev, Railway Variables en prod
5. **Monitoring** : Surveiller usage Railway pour rester sous $1/mois
6. **Healthchecks** : Obligatoires pour confirmer déploiements réussis

---

## 📚 Ressources

- [Railway Docs](https://docs.railway.app)
- [Vercel Docs](https://vercel.com/docs)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [Stripe Dashboard](https://dashboard.stripe.com)
