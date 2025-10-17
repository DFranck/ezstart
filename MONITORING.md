# 🎛️ Système de Monitoring - @ezstart Monorepo

> Documentation complète du système de monitoring et d'observabilité

## 📚 Vue d'Ensemble

Le monorepo @ezstart dispose d'un **système de monitoring centralisé** qui track automatiquement l'état de santé de tout l'écosystème :

- ✅ 13 services (5 APIs + 8 Web Apps)
- ✅ 14 audits (security, performance, architecture, etc.)
- ✅ 13 déploiements (Railway + Vercel)
- ✅ 5 bases de données MongoDB
- ✅ Git/commits tracking
- ✅ Métriques globales et score de santé

## 🏗️ Architecture

### 1. Package `@ezstart/monitoring`

**Location:** `packages/monitoring/`

Package centralisé contenant :
- **Types TypeScript** - Tous les types pour monitoring, audits, health checks
- **Utilities** - Scoring, formatage, calculs
- **Health Checker** - Classe pour health checks avec historique
- **Constants** - Services monitorés, audits metadata, deployments

**Installation:**
```bash
pnpm add @ezstart/monitoring
```

**Usage:**
```typescript
import { HealthChecker, MONITORED_SERVICES } from '@ezstart/monitoring'

const checker = new HealthChecker()
const result = await checker.check({
  name: 'EZAuth API',
  type: 'api',
  url: 'http://localhost:5010/api/health',
  timeout: 5000,
  interval: 30000,
  retries: 3,
})

console.log(result.status) // 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
```

### 2. API de Monitoring

**Location:** `apps/monitoring/api/`
**Port:** 5080 (local) / Railway (production)

API Express qui expose les endpoints de monitoring :

```bash
# Health Checks
GET /api/health-checks              # Tous les services
GET /api/health-checks/:serviceId   # Service spécifique
GET /api/health-checks/:serviceId/history?limit=50  # Historique

# Audits
GET /api/audits                     # Tous les audits
GET /api/audits/:type               # Audit spécifique

# Deployments
GET /api/deployments                # Tous les déploiements
GET /api/deployments/:id            # Déploiement spécifique

# Metrics
GET /api/metrics                    # Métriques agrégées
GET /api/metrics/dashboard          # Dashboard complet
```

**Démarrage:**
```bash
cd apps/monitoring/api
pnpm dev
```

### 3. Dashboard de Monitoring

**Location:** `apps/ezstart/web/src/app/[locale]/monitoring/`
**URL:** http://localhost:5050/monitoring

Dashboard Next.js intégré dans EZStart qui affiche :
- État en temps réel de tous les services
- Scores et status des audits
- Info déploiements et commits
- Métriques globales
- Alertes et issues
- Continuous improvement tracking

## 🚀 Quick Start

### Démarrer le système complet

```bash
# 1. Installer les dépendances
pnpm install

# 2. Builder le package monitoring
pnpm --filter @ezstart/monitoring build

# 3. Démarrer l'API de monitoring
cd apps/monitoring/api
pnpm dev

# 4. Démarrer EZStart (dashboard)
cd apps/ezstart/web
pnpm dev

# 5. Accéder au dashboard
open http://localhost:5050/monitoring
```

### Checker tous les services

```bash
# Script automatisé
bash scripts/monitoring/check-all-services.sh

# Via API
curl http://localhost:5080/api/health-checks | jq
```

### Générer un rapport d'audit

```bash
# Script automatisé
bash scripts/monitoring/generate-audit-report.sh > audit-report.md

# Via API
curl http://localhost:5080/api/audits | jq
```

## 📊 Services Monitorés

### APIs (Port 50X0)

| Service | Port | Health Endpoint | Production URL |
|---------|------|----------------|----------------|
| EZAuth | 5010 | /api/health | ezauth-api.up.railway.app |
| EZPay | 5040 | /api/health | ezpay-api.up.railway.app |
| EZBill | 5020 | /api/health | ezbill-api.up.railway.app |
| Tower Defense | 5030 | /api/health | tower-defense-api.up.railway.app |
| GreenPulse | 5070 | /api/health | green-pulse-api.up.railway.app |
| **Monitoring** | **5080** | **/api/health** | **monitoring-api.up.railway.app** |

### Web Apps (Port 50X5)

| Service | Port | Production URL |
|---------|------|----------------|
| EZStart | 5050 | www.ezstart.xyz |
| EZAuth | 5015 | ezauth.ezstart.xyz |
| EZBill | 5025 | ezbill.ezstart.xyz |
| EZPay | 5045 | ezpay.ezstart.xyz |
| Tower Defense | 5035 | tower-defense.ezstart.xyz |
| FengShui | 5065 | ezfengshui.ezstart.xyz |
| ASC-TCD | 5055 | www.asc-tcd.com |
| GreenPulse | 5075 | www.ai-greenpulse.com |

## 📋 Audits Trackés

Le système parse automatiquement les fichiers markdown dans `docs/audits/` pour extraire :
- Score (e.g., `**Total Score:** 85/100`)
- Last Updated (e.g., `**Last Updated:** 2025-10-16`)
- Status (calculé : complete si ≥90, partial si <90)

**Audits disponibles :**
1. 🔒 Security - Weekly
2. ⚡ Performance - Monthly
3. 🏗️ Architecture - Quarterly
4. ✨ Code Quality - Monthly
5. 📦 Dependencies - Weekly
6. ♿ Accessibility - Quarterly
7. 🚀 Infrastructure - Monthly
8. 🔌 API - Quarterly
9. 🔍 SEO - Quarterly
10. 🌐 Web Apps - As needed
11. 🧪 Testing - Monthly
12. 🎨 UX - Quarterly
13. 🌐 i18n - Quarterly
14. 📊 Monitoring - Monthly

## 📈 Métriques Trackées

### Overall Health Score (0-100)

Calculé à partir de :
- **Services** (30%) : healthy/total
- **Audits** (30%) : complete/total
- **Deployments** (20%) : active/total
- **Databases** (20%) : connected/total

**Status:**
- **90-100** 🟢 Excellent
- **70-89** 🟡 Good
- **50-69** 🟠 Fair
- **0-49** 🔴 Poor

### Service Health

Pour chaque service :
- Status (healthy/degraded/unhealthy/unknown)
- Response time (ms)
- Uptime (24h, 7d, 30d)
- Last check timestamp
- History (last 100 checks)

### Audit Metrics

- Total audits / Complete / Partial / Not audited
- Average score
- Overdue audits count
- Next due dates

### Git Metrics

- Uncommitted changes count
- Unpushed commits count
- Last commit age (hours)
- Commit frequency (active/moderate/stale)

## 🔧 Configuration

### Variables d'Environnement

**Monitoring API (`apps/monitoring/api/.env.local`):**
```env
NODE_ENV=development
PORT=5080
HEALTH_CHECK_INTERVAL=30000
HEALTH_CHECK_TIMEOUT=5000
HEALTH_CHECK_RETRIES=3
```

### CORS Configuration

CORS est auto-configuré via `@ezstart/config` pour permettre :
- Toutes les apps web @ezstart (local + production)
- Dashboard de monitoring

## 🛠️ Scripts Disponibles

### Monitoring Package

```bash
cd packages/monitoring
pnpm build      # Build TypeScript
pnpm typecheck  # Type checking
pnpm dev        # Watch mode
```

### Monitoring API

```bash
cd apps/monitoring/api
pnpm dev        # Development server
pnpm build      # Build for production
pnpm start      # Production server
pnpm typecheck  # Type checking
pnpm lint       # ESLint
```

### Scripts Utilitaires

```bash
# Check all services
bash scripts/monitoring/check-all-services.sh

# Generate audit report
bash scripts/monitoring/generate-audit-report.sh

# (À créer) Auto-run audits
bash scripts/monitoring/auto-audit.sh security
bash scripts/monitoring/auto-audit.sh all
```

## 💡 Cas d'Usage

### 1. Monitoring de Production

```typescript
// Checker tous les services en production
const response = await fetch('https://monitoring-api.up.railway.app/api/health-checks')
const data = await response.json()

// Alerter si services unhealthy
const unhealthy = data.services.filter(s => s.status === 'unhealthy')
if (unhealthy.length > 0) {
  sendAlert(`${unhealthy.length} services are down!`)
}
```

### 2. CI/CD Integration

```yaml
# .github/workflows/health-check.yml
- name: Check Services Health
  run: |
    curl -f http://monitoring-api.up.railway.app/api/metrics
    if [ $? -ne 0 ]; then
      echo "Monitoring API is down!"
      exit 1
    fi
```

### 3. Audit Automation

```bash
# Cron job pour audits hebdomadaires
0 9 * * 1 cd /path/to/monorepo && bash scripts/monitoring/auto-audit.sh security
0 9 * * 1 cd /path/to/monorepo && bash scripts/monitoring/auto-audit.sh dependencies
```

### 4. Continuous Improvement Tracking

```typescript
// Créer une amélioration à tracker
const improvement: ContinuousImprovement = {
  id: 'improve-build-time',
  category: 'performance',
  title: 'Réduire le temps de build',
  currentState: '8 minutes',
  desiredState: '3 minutes',
  actionItems: [
    'Activer Turbo cache',
    'Optimiser tsconfig references',
    'Paralléliser les builds'
  ],
  estimatedEffort: 'medium',
  priority: 'high',
  createdAt: new Date(),
  metrics: {
    before: 8,
    after: null, // À remplir après
    unit: 'minutes'
  }
}
```

## 🔗 Documentation Liée

- [AUDIT-GUIDE.md](./docs/AUDIT-GUIDE.md) - Guide complet des audits
- [CLAUDE.md](./CLAUDE.md) - Configuration monorepo
- [packages/monitoring/README.md](./packages/monitoring/README.md) - Package monitoring
- [apps/monitoring/api/README.md](./apps/monitoring/api/README.md) - API monitoring

## 🤝 Contribution

### Ajouter un Nouveau Service

1. Ajouter dans `packages/monitoring/src/types/health.ts` :
```typescript
'new-service-api': {
  name: 'New Service API',
  type: 'api' as ServiceType,
  localUrl: 'http://localhost:5090/api/health',
  productionUrl: 'https://new-service-api.up.railway.app/api/health',
  port: 5090,
}
```

2. Rebuild le package :
```bash
pnpm --filter @ezstart/monitoring build
```

3. L'API de monitoring le détectera automatiquement !

### Ajouter un Nouvel Audit

1. Créer `docs/audits/NEW-AUDIT.md`
2. Ajouter metadata dans `packages/monitoring/src/types/audit.ts`
3. Le système le trackera automatiquement

## 📄 License

MIT

---

**Créé avec ❤️ pour maintenir @ezstart en bonne santé**
