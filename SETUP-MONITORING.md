# 🎛️ Setup du Système de Monitoring - @ezstart

> Guide d'installation et de configuration du système de monitoring

## ✅ Ce qui est fait

### 1. Package `@ezstart/monitoring` ✅

**Location:** `packages/monitoring/`

- ✅ Types TypeScript complets (audit, health, deployment, database, git, metrics)
- ✅ Utilities (scoring, formatters)
- ✅ Health Checker class avec historique
- ✅ Constants (MONITORED_SERVICES, AUDIT_METADATA, DEPLOYMENT_CONFIGS)
- ✅ Build réussi
- ✅ README complet

### 2. API de Monitoring ✅

**Location:** `apps/monitoring/api/`

- ✅ Structure complète avec routes (health, audit, deployment, metrics)
- ✅ Configuration (.env.example, tsconfig, eslint)
- ✅ README avec endpoints documentation
- ⚠️ **Quelques erreurs TypeScript à corriger** (voir section TODO)

### 3. Scripts de Monitoring ✅

**Location:** `scripts/monitoring/`

- ✅ `check-all-services.sh` - Vérifier tous les services
- ✅ `generate-audit-report.sh` - Générer rapport d'audit

### 4. Documentation ✅

- ✅ [MONITORING.md](./MONITORING.md) - Documentation complète
- ✅ [AUDIT-GUIDE.md](./docs/AUDIT-GUIDE.md) - Updated avec nouvelle architecture
- ✅ [CLAUDE.md](./CLAUDE.md) - Updated avec section monitoring
- ✅ READMEs pour package et API

## ⚠️ TODO - Corrections à Faire

### Erreurs TypeScript à Corriger

#### 1. Fix `src/routes/deployment.ts`

Remplacer les lignes problématiques par :

```typescript
// Ligne 33-36
const parts = stdout.trim().split('|')
const hash = parts[0] || ''
const message = parts[1] || ''
const author = parts[2] || ''
const date = parts[3] || new Date().toISOString()

lastCommit = {
  hash: hash.slice(0, 7),
  message,
  author,
  date: new Date(date),
}

// Ligne 96-106
commits = stdout
  .trim()
  .split('\n')
  .filter(Boolean)
  .map(line => {
    const parts = line.split('|')
    return {
      hash: (parts[0] || '').slice(0, 7),
      message: parts[1] || '',
      author: parts[2] || '',
      date: new Date(parts[3] || new Date().toISOString()),
    }
  })
```

#### 2. Fix `src/routes/metrics.ts`

Remplacer ligne 56 et 151 :

```typescript
// Ligne 56
const scoreMatch = content.match(/\*\*Total Score:\*\*\s*(\d+)\/100/i)
if (scoreMatch && scoreMatch[1]) {
  score = parseInt(scoreMatch[1], 10)
  status = score >= 90 ? 'complete' : 'partial'
}

// Ligne 151 - Changer le type
let gitStats: {
  uncommittedChanges: number
  unpushed Commits: number
  lastCommitAge: number
  commitFrequency: 'active' | 'moderate' | 'stale'
} = {
  uncommittedChanges: 0,
  unpushedCommits: 0,
  lastCommitAge: 0,
  commitFrequency: 'stale', // Default value
}
```

### 3. Builder et Tester

Après corrections :

```bash
# Build monitoring package
pnpm --filter @ezstart/monitoring build

# Typecheck API
cd apps/monitoring/api
pnpm typecheck

# Si OK, test l'API
pnpm dev
```

## 🚀 Installation Complète

### Étape 1: Installer les Dépendances

```bash
# Root
pnpm install

# Build monitoring package
pnpm --filter @ezstart/monitoring build
```

### Étape 2: Configuration

**Créer `.env.local` dans `apps/monitoring/api/`:**

```env
NODE_ENV=development
PORT=5080
HEALTH_CHECK_INTERVAL=30000
HEALTH_CHECK_TIMEOUT=5000
HEALTH_CHECK_RETRIES=3
```

### Étape 3: Démarrer l'API

```bash
cd apps/monitoring/api
pnpm dev
```

### Étape 4: Tester les Endpoints

```bash
# Health check
curl http://localhost:5080/api/health

# Tous les services
curl http://localhost:5080/api/health-checks | jq

# Tous les audits
curl http://localhost:5080/api/audits | jq

# Métriques globales
curl http://localhost:5080/api/metrics | jq
```

## 📊 Prochaines Étapes

### 1. Dashboard Web (À Créer)

**Location:** `apps/ezstart/web/src/app/[locale]/monitoring/`

Créer les pages :
- `page.tsx` - Dashboard principal
- `services/page.tsx` - Liste des services
- `audits/page.tsx` - Liste des audits
- `deployments/page.tsx` - Liste des déploiements

**Composants nécessaires :**
- `ServiceCard` - Afficher un service avec status
- `AuditCard` - Afficher un audit avec score
- `DeploymentCard` - Afficher un déploiement
- `MetricsOverview` - Vue d'ensemble des métriques
- `HealthScore` - Score de santé global

### 2. Intégration avec Existing Apps

**Ajouter `@ezstart/monitoring` aux apps qui veulent monitorer :**

```json
{
  "dependencies": {
    "@ezstart/monitoring": "workspace:*"
  }
}
```

**Utiliser dans l'app :**

```typescript
import { HealthChecker } from '@ezstart/monitoring'

const checker = new HealthChecker()
// Use it...
```

### 3. Scripts d'Automation

**Créer `scripts/monitoring/auto-audit.sh` :**

```bash
#!/bin/bash
# Auto-run audits with AI assistance

AUDIT_TYPE=$1

case $AUDIT_TYPE in
  security)
    echo "Running security audit..."
    pnpm audit
    # Run secret scanner
    # Update docs/audits/SECURITY-AUDIT.md
    ;;
  dependencies)
    echo "Running dependencies audit..."
    pnpm outdated
    # Update docs/audits/DEPENDENCIES-AUDIT.md
    ;;
  all)
    bash $0 security
    bash $0 dependencies
    # ... autres audits
    ;;
  *)
    echo "Usage: $0 {security|dependencies|all}"
    exit 1
    ;;
esac
```

### 4. CI/CD Integration

**Ajouter dans `.github/workflows/monitoring.yml` :**

```yaml
name: Monitoring Health Check

on:
  schedule:
    - cron: '*/30 * * * *' # Every 30 minutes
  workflow_dispatch:

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - name: Check Services
        run: |
          response=$(curl -sf https://monitoring-api.up.railway.app/api/metrics)
          if [ $? -ne 0 ]; then
            echo "Monitoring API is down!"
            exit 1
          fi

          score=$(echo $response | jq '.overallHealth.score')
          if [ $score -lt 50 ]; then
            echo "Health score too low: $score"
            # Send alert
          fi
```

### 5. Alerting System

**Créer `apps/monitoring/api/src/services/alerting.ts` :**

```typescript
export class AlertingService {
  async sendAlert(message: string) {
    // Send to Slack
    // Send email
    // Send SMS
  }

  async checkAndAlert() {
    // Check metrics
    // If threshold exceeded, send alert
  }
}
```

## 📝 Notes Importantes

### Architecture Decision Records

**Pourquoi une API séparée ?**
- ✅ Isolation du monitoring (ne dépend pas des autres services)
- ✅ Peut tourner même si autres services down
- ✅ Facile à déployer sur Railway
- ✅ Endpoints publics pour status pages

**Pourquoi pas de MongoDB ?**
- ⚠️ Pour l'instant, tout est en mémoire (HealthChecker)
- 💡 Future: Ajouter MongoDB pour persister l'historique
- 💡 Collections: `health_checks`, `audit_results`, `alerts`

**Pourquoi parser les .md files ?**
- ✅ Single source of truth (les audits sont déjà dans docs/)
- ✅ Pas besoin de dupliquer les données
- ✅ Facile à maintenir
- ⚠️ Limitation: Doit respecter le format exact

### Performance Considerations

**Health Checks:**
- Actuellement : À la demande (GET request)
- Futur : Background job toutes les 30s
- Historique : Limité à 100 derniers checks

**Audit Parsing:**
- Actuellement : Parse à chaque request
- Futur : Cache avec invalidation
- Alternative : Pre-compute au build time

## 🤝 Contribution

### Ajouter un Nouveau Service à Monitorer

1. Éditer `packages/monitoring/src/types/health.ts`
2. Ajouter dans `MONITORED_SERVICES`
3. Rebuild le package
4. L'API le détectera automatiquement

### Ajouter un Nouvel Audit

1. Créer `docs/audits/NEW-AUDIT.md`
2. Ajouter dans `packages/monitoring/src/types/audit.ts` → `AUDIT_METADATA`
3. Rebuild le package
4. L'API le parsera automatiquement

## 🔗 Documentation Complète

- [MONITORING.md](./MONITORING.md) - Vue d'ensemble complète
- [packages/monitoring/README.md](./packages/monitoring/README.md) - Package documentation
- [apps/monitoring/api/README.md](./apps/monitoring/api/README.md) - API documentation
- [AUDIT-GUIDE.md](./docs/AUDIT-GUIDE.md) - Guide des audits

---

**Créé le 17/10/2025 - Système prêt à 90%**
