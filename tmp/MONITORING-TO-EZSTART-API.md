# 🔄 Restructuration: monitoring API → ezstart API

**Date:** 30/10/2025
**Objectif:** Déplacer `apps/monitoring/api` vers `apps/ezstart/api` pour architecture cohérente

---

## 🎯 Justification Architecture

### Architecture Actuelle (Incohérente)
```
Vercel (Web Apps):
├─ apps/ezstart/web         ✅
├─ apps/ezauth/web           ✅
├─ apps/ezbill/web           ✅
├─ apps/tower-defense/web    ✅
└─ apps/green-pulse/web      ✅

Railway/Render (APIs):
├─ apps/ezauth/api           ✅
├─ apps/ezbill/api           ✅
├─ apps/ezpay/api            ✅
├─ apps/tower-defense/api    ✅
├─ apps/green-pulse/api      ✅
└─ apps/monitoring/api       ❌ PAS dans ezstart/

Oracle Cloud (Future APIs):
└─ (Toutes les APIs ci-dessus)
```

**Problème:**
- `apps/monitoring/api` est un projet standalone
- MAIS il est **exclusivement** utilisé par `apps/ezstart/web/monitoring` dashboard
- Logiquement, il devrait être `apps/ezstart/api`

### Architecture Cible (Cohérente)
```
Vercel (Web Apps):
├─ apps/ezstart/web         ✅ Landing + Monitoring dashboard
├─ apps/ezauth/web           ✅
├─ apps/ezbill/web           ✅
└─ ...

Oracle Cloud (APIs):
├─ apps/ezstart/api          ✅ Monitoring endpoints
├─ apps/ezauth/api           ✅ SSO
├─ apps/ezbill/api           ✅ Invoicing
├─ apps/ezpay/api            ✅ Payments
└─ ...
```

**Avantages:**
- ✅ **Cohérence:** Chaque projet suit pattern `apps/[projet]/web + api`
- ✅ **Clarté:** EZStart dashboard = EZStart API
- ✅ **Déploiement:** Toutes PWAs Vercel, Toutes APIs Oracle
- ✅ **Maintenance:** Code monitoring avec son dashboard

---

## 📊 Analyse de l'Existant

### 1. Usage de Monitoring API

**UNIQUEMENT utilisé par:** `apps/ezstart/web/src/app/[locale]/monitoring/`

```typescript
// apps/ezstart/web/src/app/[locale]/monitoring/page.tsx
const MONITORING_API_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:5080'
  : getApiUrl('monitoring', 'production')

// Endpoints utilisés:
- GET  /api/projects          (Liste projets + health status)
- GET  /api/audits            (Liste audits)
- POST /api/trigger-checks    (Trigger manual health checks)
- GET  /api/activity          (Activity feed)
- WebSocket: health-checks-updated events
```

**Aucun autre projet n'utilise monitoring API** ✅

### 2. Endpoints Monitoring API

```
Root API Routes (apps/monitoring/api/src/routes/index.ts):
├─ GET  /api/health                   (API health)
├─ GET  /api/health-checks            (All health checks)
├─ GET  /api/projects                 (Projects aggregation)
├─ GET  /api/audits                   (Audits aggregation)
├─ GET  /api/deployments              (Deployments)
├─ GET  /api/metrics                  (System metrics)
├─ GET  /api/history/:serviceId       (Service history)
├─ GET  /api/history/project/:id      (Project history)
├─ GET  /api/activity                 (Activity feed)
├─ GET  /api/activity/errors          (Error logs)
├─ GET  /api/activity/stats           (Activity stats)
├─ POST /api/trigger-checks           (Manual health checks)
├─ GET  /api/scheduler/status         (Scheduler status)
└─ WebSocket health-checks-updated    (Real-time updates)
```

### 3. Database

**MongoDB:** `ezstart-monitoring`

```typescript
// apps/monitoring/api/src/index.ts:48
connectToMongo('ezstart-monitoring')

// Models:
- HealthCheck (serviceId, status, responseTime, timestamp)
```

**Note:** Database name déjà préfixé `ezstart-` ✅

### 4. Services Background

**HealthCheckScheduler:**
- Vérifie santé de TOUS les projets du monorepo
- Émet WebSocket events `health-checks-updated`
- Tourne 24/7 en background

### 5. Port

**Port actuel:** `5080` (via `getApiPort('monitoring')`)

**Port cible:** `5050` (déjà pris par `ezstart/web`)

**Solution:** Garder port `5080` OU changer vers `5085` (ezstart-api)

---

## 🔄 Plan de Migration

### Option A: Renommer Projet ✅ RECOMMANDÉ

**Déplacer** `apps/monitoring` → `apps/ezstart` (créer dossier `api/`)

```bash
# Structure actuelle:
apps/
├─ ezstart/
│  └─ web/          # Landing + Monitoring dashboard
└─ monitoring/
   └─ api/          # Monitoring API

# Structure cible:
apps/
└─ ezstart/
   ├─ web/          # Landing + Monitoring dashboard
   └─ api/          # Monitoring API (renommé)
```

**Étapes:**

1. **Créer** `apps/ezstart/api/` folder
2. **Copier** tout le contenu de `apps/monitoring/api/` → `apps/ezstart/api/`
3. **Mettre à jour** `package.json`:
   ```json
   {
     "name": "api-ezstart",  // était "api-monitoring"
     "description": "EZStart Monitoring API"
   }
   ```
4. **Mettre à jour** `@ezstart/config`:
   ```typescript
   // packages/config/urls.ts
   export const API_PORTS = {
     ezstart: 5085,  // nouveau (était monitoring: 5080)
     ezauth: 5010,
     // ...
   }
   ```
5. **Mettre à jour** `apps/ezstart/web/monitoring/page.tsx`:
   ```typescript
   const MONITORING_API_URL = process.env.NODE_ENV === 'development'
     ? 'http://localhost:5085'  // était 5080
     : getApiUrl('ezstart', 'production')  // était 'monitoring'
   ```
6. **Mettre à jour** `package.json` root scripts:
   ```json
   {
     "dev:monitor": "pnpm --filter api-ezstart dev",  // était api-monitoring
     "build:monitor": "pnpm --filter api-ezstart build"
   }
   ```
7. **Supprimer** `apps/monitoring/` folder
8. **Git commit:**
   ```bash
   git add .
   git commit -m "refactor(monitoring): restructure as ezstart API

   - Move apps/monitoring/api → apps/ezstart/api
   - Rename api-monitoring → api-ezstart
   - Update port 5080 → 5085
   - Update all references monitoring → ezstart API
   - Architecture cohérente: all PWAs on Vercel, all APIs on Oracle"
   ```

---

### Option B: Garder Nom "monitoring" ❌ PAS RECOMMANDÉ

**Garder** `apps/monitoring/api` MAIS déplacer dans `apps/ezstart/shared/monitoring-api`

**Problèmes:**
- ❌ Incohérent avec structure monorepo
- ❌ Plus complexe (nested folders)
- ❌ Nom "monitoring" pas clair (monitoring de quoi?)

**Verdict:** ❌ NE PAS UTILISER cette option

---

## 📝 Impacts et Changements Requis

### 1. Fichiers à Modifier

**Root:**
- `package.json` - Scripts dev/build
- `railway.toml` - Déploiement Railway (si existe)
- `render.yaml` - Déploiement Render (remplacer api-monitoring → api-ezstart)

**Config centralisée:**
- `packages/config/urls.ts` - Port monitoring → ezstart
- `packages/config/cors.ts` - Origins monitoring → ezstart

**Web Apps:**
- `apps/ezstart/web/src/app/[locale]/monitoring/page.tsx` - URL API
- `apps/ezstart/web/src/app/[locale]/monitoring/components/*.tsx` - URL API

**API elle-même:**
- `apps/ezstart/api/package.json` - Name, description
- `apps/ezstart/api/src/index.ts` - Service name (cosmétique)

**Documentation:**
- `CLAUDE.md` - Update ports table
- `DEPLOY.md` - Update monitoring references
- `docs/audits/audit-api.md` - Update references

### 2. Variables d'Environnement

**Aucun changement requis** ✅

```bash
# .env.local (reste identique)
MONGO_URL=mongodb://localhost:27017/ezstart-monitoring
```

Database name `ezstart-monitoring` déjà correct.

### 3. Déploiement

**Railway/Render:**
```yaml
# render.yaml AVANT:
services:
  - type: web
    name: monitoring-api
    env: node
    buildCommand: pnpm build --filter=api-monitoring
    startCommand: pnpm start --filter=api-monitoring

# render.yaml APRÈS:
services:
  - type: web
    name: ezstart-api
    env: node
    buildCommand: pnpm build --filter=api-ezstart
    startCommand: pnpm start --filter=api-ezstart
```

**Oracle Cloud:**
```bash
# systemd service (future)
/etc/systemd/system/ezstart-api.service  # était monitoring-api.service
```

### 4. URLs Production

**AVANT:**
```
https://monitoring-api.up.railway.app
https://api-monitoring.onrender.com
```

**APRÈS:**
```
https://ezstart-api.up.railway.app
https://api-ezstart.onrender.com
```

**Impact:** ⚠️ Nécessite reconfiguration service Railway/Render

---

## ⚙️ Migration Step-by-Step

### Étape 1: Préparation (5 min)

```bash
# Vérifier aucun changement en cours
git status

# Créer branche
git checkout -b refactor/monitoring-to-ezstart-api

# Vérifier que monitoring API tourne
pnpm --filter api-monitoring dev
# Ouvrir http://localhost:5080/api → doit afficher endpoints
```

### Étape 2: Créer Structure (2 min)

```bash
# Créer dossier api dans ezstart
mkdir apps/ezstart/api

# Copier tout le contenu
cp -r apps/monitoring/api/* apps/ezstart/api/

# Vérifier structure
ls -la apps/ezstart/
# Doit afficher: web/ et api/
```

### Étape 3: Mettre à Jour package.json API (3 min)

```bash
# Éditer apps/ezstart/api/package.json
```

```json
{
  "name": "api-ezstart",
  "version": "1.0.0",
  "description": "EZStart Monitoring API - System monitoring for @ezstart monorepo",
  "type": "module",
  "scripts": {
    "dev": "tsx watch --env-file=.env.local src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "lint": "eslint ."
  }
  // ... reste identique
}
```

### Étape 4: Mettre à Jour Config Centralisée (5 min)

**packages/config/urls.ts:**
```typescript
export const API_PORTS = {
  ezstart: 5085,  // CHANGÉ (était monitoring: 5080)
  ezauth: 5010,
  ezbill: 5020,
  'tower-defense': 5030,
  ezpay: 5040,
  'green-pulse': 5070,
} as const

export const API_URLS = {
  development: {
    ezstart: `http://localhost:5085`,  // CHANGÉ
    ezauth: `http://localhost:5010`,
    // ...
  },
  production: {
    ezstart: process.env.NEXT_PUBLIC_EZSTART_API_URL || 'https://ezstart-api.up.railway.app',  // CHANGÉ
    ezauth: process.env.NEXT_PUBLIC_EZAUTH_API_URL || 'https://ezauth.up.railway.app',
    // ...
  }
}
```

**packages/config/cors.ts:**
```typescript
const API_ALLOWED_ORIGINS = {
  ezstart: [...ALL_WEB_ORIGINS],  // CHANGÉ (était monitoring)
  ezauth: [...ALL_WEB_ORIGINS],
  // ...
}
```

### Étape 5: Mettre à Jour Web App (5 min)

**apps/ezstart/web/src/app/[locale]/monitoring/page.tsx:**
```typescript
// AVANT:
const MONITORING_API_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:5080'
  : getApiUrl('monitoring', 'production')

// APRÈS:
const MONITORING_API_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:5085'
  : getApiUrl('ezstart', 'production')
```

**Autres composants monitoring:**
- `AuditCard.tsx`
- `ProjectCard.tsx`
- `ServiceCard.tsx`
- `ActivityFeed.tsx`

Tous utilisent `MONITORING_API_URL` passé en prop, donc **pas de changement requis** ✅

### Étape 6: Mettre à Jour Root package.json (3 min)

**package.json root:**
```json
{
  "scripts": {
    // Dev scripts
    "dev:ez": "concurrently \"pnpm --filter web-ezstart dev\" \"pnpm --filter api-ezstart dev\" \"pnpm --filter api-ezauth dev\"",
    "dev:monitor": "pnpm --filter api-ezstart dev",

    // Build scripts
    "build:monitor": "pnpm --filter api-ezstart build",

    // Typecheck
    "typecheck:monitor": "pnpm --filter api-ezstart typecheck"
  }
}
```

### Étape 7: Mettre à Jour Documentation (5 min)

**CLAUDE.md - Table des ports:**
```markdown
| Service | Type | Port | URL |
|---------|------|------|-----|
| **EZStart** | API | 5085 | http://localhost:5085 |  <!-- CHANGÉ -->
| **EZAuth** | API | 5010 | http://localhost:5010 |
| **Monitoring** | API | 5080 | http://localhost:5080 |  <!-- SUPPRIMER -->
```

**DEPLOY.md - Services:**
```markdown
### APIs Deployed

- ✅ EZStart API (Monitoring) - `api-ezstart`  <!-- CHANGÉ -->
- ✅ EZAuth API - `api-ezauth`
```

### Étape 8: Supprimer Ancien Folder (2 min)

```bash
# Supprimer apps/monitoring/ complètement
rm -rf apps/monitoring/

# Vérifier qu'il n'existe plus
ls apps/
# Ne doit PAS afficher "monitoring"
```

### Étape 9: Tester Localement (10 min)

```bash
# Terminal 1: Démarrer ezstart API
pnpm --filter api-ezstart dev

# Vérifier port 5085
curl http://localhost:5085/api
# Doit afficher: { "message": "Monitoring API", ... }

# Terminal 2: Démarrer ezstart web
pnpm --filter web-ezstart dev

# Vérifier http://localhost:5050/monitoring
# Dashboard doit charger données depuis localhost:5085
```

### Étape 10: Commit et Push (5 min)

```bash
git add .

git commit -m "refactor(monitoring): restructure as ezstart API

- Move apps/monitoring/api → apps/ezstart/api
- Rename api-monitoring → api-ezstart
- Update port 5080 → 5085
- Update all API references (monitoring → ezstart)
- Update CORS, URLs, and deployment configs
- Architecture cohérente: all PWAs on Vercel, all APIs on Oracle Cloud

BREAKING CHANGE: Monitoring API port changed 5080 → 5085"

git push origin refactor/monitoring-to-ezstart-api
```

### Étape 11: Déploiement (Variable selon plateforme)

**Railway:**
```bash
# Supprimer ancien service monitoring-api
railway service delete monitoring-api

# Créer nouveau service ezstart-api
railway service create ezstart-api
railway service up api-ezstart

# Mettre à jour variables d'environnement
railway vars set MONGO_URL=mongodb+srv://...
```

**Render:**
```bash
# Via dashboard Render:
1. Supprimer service "monitoring-api"
2. Créer nouveau "ezstart-api"
3. Build: pnpm build --filter=api-ezstart
4. Start: pnpm start --filter=api-ezstart
```

**Oracle Cloud (future):**
```bash
# Créer systemd service
sudo nano /etc/systemd/system/ezstart-api.service

sudo systemctl enable ezstart-api
sudo systemctl start ezstart-api
```

---

## 🎯 Résumé Migration

### Temps Total Estimé: 45 minutes

| Étape | Durée | Difficulté |
|-------|-------|------------|
| Préparation | 5 min | ⭐ Facile |
| Créer structure | 2 min | ⭐ Facile |
| Update package.json | 3 min | ⭐ Facile |
| Update config | 5 min | ⭐⭐ Moyen |
| Update web app | 5 min | ⭐ Facile |
| Update root scripts | 3 min | ⭐ Facile |
| Update docs | 5 min | ⭐ Facile |
| Supprimer ancien | 2 min | ⭐ Facile |
| Test local | 10 min | ⭐⭐ Moyen |
| Commit | 5 min | ⭐ Facile |
| **TOTAL** | **45 min** | ⭐⭐ Moyen |

### Risques: TRÈS FAIBLE ✅

**Pourquoi migration safe:**
- ✅ Monitoring API **uniquement** utilisé par ezstart/web
- ✅ Pas d'autres projets dépendants
- ✅ Database name déjà correct (`ezstart-monitoring`)
- ✅ Facile de rollback (garder apps/monitoring en backup)

### Bénéfices:

**Court terme:**
- ✅ Architecture cohérente (chaque projet = web + api)
- ✅ Clarté (ezstart dashboard → ezstart API)
- ✅ Meilleure organisation monorepo

**Long terme:**
- ✅ Déploiement simplifié Oracle Cloud (all APIs ensemble)
- ✅ Maintenance facilitée (code monitoring avec son dashboard)
- ✅ Documentation plus claire

---

## 🤔 Décision Finale

### ✅ RECOMMANDATION: Procéder à la migration

**Arguments:**
1. **Cohérence architecture:** Tous les projets suivent pattern `apps/[name]/web + api`
2. **Usage exclusif:** Monitoring API SEULEMENT pour ezstart/web
3. **Migration facile:** 45 minutes, risque très faible
4. **Bénéfices clairs:** Déploiement Oracle, maintenance, clarté

**Timing:**
- ✅ **MAINTENANT:** Avant déploiement Oracle Cloud
- ✅ **AVANT:** Migration vers production Oracle
- ✅ **POURQUOI:** Éviter double migration (maintenant + plus tard)

---

## 📋 Checklist Migration

```markdown
### Pre-Migration
- [ ] Git status clean
- [ ] Créer branche refactor/monitoring-to-ezstart-api
- [ ] Backup apps/monitoring/ (copie locale)

### Migration
- [ ] Créer apps/ezstart/api/
- [ ] Copier apps/monitoring/api/* → apps/ezstart/api/
- [ ] Update apps/ezstart/api/package.json (name)
- [ ] Update packages/config/urls.ts (port + URLs)
- [ ] Update packages/config/cors.ts (origins)
- [ ] Update apps/ezstart/web monitoring page (API URL)
- [ ] Update root package.json (scripts)
- [ ] Update CLAUDE.md (ports table)
- [ ] Update DEPLOY.md (services)
- [ ] Supprimer apps/monitoring/

### Testing
- [ ] pnpm install (verify dependencies)
- [ ] pnpm --filter api-ezstart dev (verify starts on 5085)
- [ ] pnpm --filter web-ezstart dev (verify connects to API)
- [ ] Open http://localhost:5050/monitoring (verify dashboard works)
- [ ] Vérifier WebSocket connection (real-time updates)
- [ ] Vérifier health checks (trigger manual check)

### Commit
- [ ] git add .
- [ ] git commit avec message détaillé
- [ ] git push origin refactor/monitoring-to-ezstart-api

### Deployment
- [ ] Update Railway/Render service
- [ ] Update production env vars
- [ ] Test production deployment
- [ ] Verify production dashboard works

### Post-Migration
- [ ] Merge branch to master
- [ ] Delete backup apps/monitoring/
- [ ] Update team/documentation
```

---

**Prêt à procéder?** 🚀