# 🚀 Guide de Déploiement - @ezstart Monorepo

## 📋 Vue d'Ensemble

Ce monorepo est configuré pour déployer :
- **Apps Web** sur **Vercel** (6 applications Next.js)
- **APIs** sur **Render** (3 services Node.js)

## 🌐 Applications Web - Vercel

### Applications Disponibles

| App | URL Suggérée | Root Directory | Config |
|-----|-------------|---------------|---------|
| EZStart | `ezstart.vercel.app` | `apps/ezstart/web` | ✅ |
| EZAuth | `ezauth.vercel.app` | `apps/ezauth/web` | ✅ |
| EZ-Billing | `ez-billing.vercel.app` | `apps/ez-billing/web` | ✅ |
| Tower Defense | `tower-defense.vercel.app` | `apps/tower-defense/web` | ✅ |
| FengShui | `fengshui.vercel.app` | `apps/fengshui/web` | ✅ |
| ASC-TCD | `asc-tcd.vercel.app` | `apps/asc-tcd/web` | ✅ |

### 🔧 Configuration Vercel

**Pour chaque app web :**

1. **Connecter le repository** GitHub à Vercel
2. **Root Directory** : `apps/[app-name]/web`
3. **Build Command** : `pnpm build` (détecté automatiquement via `vercel.json`)
4. **Install Command** : `pnpm install --frozen-lockfile`
5. **Output Directory** : `.next`

### 🌍 Variables d'Environnement Vercel

**Variables communes pour toutes les apps :**
```bash
NODE_ENV=production
```

**Variables spécifiques par app :**

#### EZStart Web
```bash
NEXT_PUBLIC_API_URL=https://ezstart-api.onrender.com/api
```

#### EZAuth Web
```bash
NEXT_PUBLIC_API_URL=https://ezauth-api.onrender.com/api
```

#### EZ-Billing Web
```bash
NEXT_PUBLIC_API_URL=https://ez-billing-api.onrender.com/api
```

#### Tower Defense Web
```bash
NEXT_PUBLIC_API_URL=https://tower-defense-api.onrender.com/api
```

## 🖥️ APIs - Render

### Services Disponibles

| API | URL Suggérée | Config File | Health Check |
|-----|-------------|-------------|-------------|
| EZAuth | `ezauth-api.onrender.com` | `render-ezauth.yaml` | `/api/health` |
| EZ-Billing | `ez-billing-api.onrender.com` | `render-ez-billing.yaml` | `/api/health` |
| Tower Defense | `tower-defense-api.onrender.com` | `render-tower-defense.yaml` | `/api/health` |

### 🔧 Configuration Render

**Pour chaque API :**

1. **Connecter le repository** GitHub à Render
2. **Root Directory** : `.` (racine du monorepo)
3. **Build Command** : `pnpm install --frozen-lockfile && pnpm build --filter api-[name]`
4. **Start Command** : `pnpm --filter api-[name] start:prod`
5. **Upload render-[name].yaml** lors de la création du service

### 🌍 Variables d'Environnement Render

**Variables communes pour toutes les APIs :**
```bash
NODE_ENV=production
PORT=10000  # Port par défaut de Render
```

**Variables spécifiques par API :**

#### EZAuth API
```bash
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-super-secret-key
COOKIE_SECRET=your-cookie-secret
```

#### EZ-Billing API
```bash
MONGODB_URI=mongodb+srv://...
API_KEY_EXCHANGE_RATE=your-exchange-rate-api-key
```

#### Tower Defense API
```bash
MONGODB_URI=mongodb+srv://...
SOCKET_CORS_ORIGIN=https://tower-defense.vercel.app
```

## 🚀 Processus de Déploiement

### 1. Apps Web (Vercel)

```bash
# 1. Connecter le repo sur Vercel
# 2. Créer un nouveau projet
# 3. Configurer :
#    - Root Directory: apps/ezstart/web
#    - Build Command: détecté auto via vercel.json
#    - Variables d'environnement

# 4. Déployer
git push origin main
```

### 2. APIs (Render)

```bash
# 1. Connecter le repo sur Render
# 2. Créer un Web Service
# 3. Uploader le render-[name].yaml correspondant
# 4. Configurer les variables d'environnement

# 5. Déployer
git push origin main
```

## ✅ Tests de Déploiement en Local

### Test Build Web Apps
```bash
# EZStart
cd apps/ezstart/web && pnpm build

# EZAuth
cd apps/ezauth/web && pnpm build

# EZ-Billing
cd apps/ez-billing/web && pnpm build

# Tower Defense
cd apps/tower-defense/web && pnpm build

# FengShui
cd apps/fengshui/web && pnpm build

# ASC-TCD
cd apps/asc-tcd/web && pnpm build
```

### Test Build APIs
```bash
# EZAuth API
pnpm build --filter api-ezauth && pnpm --filter api-ezauth start:prod

# EZ-Billing API
pnpm build --filter api-ez-billing && pnpm --filter api-ez-billing start:prod

# Tower Defense API
pnpm build --filter api-tower-defense && pnpm --filter api-tower-defense start:prod
```

## 🔍 Health Checks

Toutes les APIs exposent un endpoint de santé :
```bash
GET /api/health
# Réponse: { "status": "ok" }
```

## 📚 URLs Finales Recommandées

### Apps Web
- EZStart: https://ezstart.vercel.app
- EZAuth: https://auth.ezstart.app
- EZ-Billing: https://billing.ezstart.app
- Tower Defense: https://td.ezstart.app
- FengShui: https://fengshui.ezstart.app
- ASC-TCD: https://asc-tcd.vercel.app

### APIs
- EZAuth API: https://auth-api.ezstart.app
- EZ-Billing API: https://billing-api.ezstart.app
- Tower Defense API: https://td-api.ezstart.app

## 🚨 Points Critiques

1. **Ordre de déploiement** : APIs d'abord, puis Web Apps
2. **Variables d'environnement** : Mettre à jour les URLs API dans les apps web
3. **CORS** : Configurer les domaines autorisés dans les APIs
4. **MongoDB** : Utiliser des bases de données séparées par environnement
5. **Secrets** : Utiliser les gestionnaires de secrets intégrés (Vercel/Render)

## 🔧 Troubleshooting

### Build Failures
- Vérifier que les dépendances du monorepo sont construites avant l'app
- Les `prebuild` scripts gèrent automatiquement les dépendances

### CORS Errors
- Ajouter les domaines Vercel dans la config CORS des APIs
- Vérifier les URLs dans `NEXT_PUBLIC_API_URL`

### 404 sur APIs
- Vérifier que le health check `/api/health` répond
- Contrôler les logs Render pour les erreurs de démarrage