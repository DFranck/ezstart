# 🎯 Adaptive Health Checks - Monitoring Intelligent avec Exponential Backoff

## Problème Résolu

**Consommation excessive due au double monitoring :**
- Monitoring API : Toutes les 5-10 min
- UptimeRobot : Toutes les 5 min
- **Résultat** : Railway $5 consommés en 1 semaine, Render 750h/mois dépassées

## Solution Implémentée : Exponential Backoff

### Concept

Ton monitoring s'adapte automatiquement selon la santé des services :

```
✅ Service stable → Augmente progressivement l'intervalle (économies)
❌ Service down → Retour immédiat à checks fréquents (réactivité)
```

### Progression Exemple (Railway/Vercel)

```
✅ Check 1: UP → Next in 5 min (base)
✅ Check 2: UP → Next in 10 min (2x)
✅ Check 3: UP → Next in 20 min (2x)
✅ Check 4: UP → Next in 40 min (2x)
✅ Check 5: UP → Next in 60 min (max, capped)
❌ Check 6: DOWN → Next in 5 min (reset!)
```

### Progression Exemple (Render - Keep Awake)

```
✅ Check 1: UP → Next in 5 min
✅ Check 2: UP → Next in 10 min (max, prevent sleep!)
✅ Check 3: UP → Next in 10 min (capped at 10min)
❌ Check 4: DOWN → Next in 5 min (reset!)
```

---

## Configuration

### Constantes (packages/monitoring/src/types/health.ts)

```typescript
export const ADAPTIVE_CHECK_CONFIG = {
  MIN_INTERVAL_MS: 5 * 60 * 1000,       // 5 min (après failure)
  MAX_INTERVAL_MS: 60 * 60 * 1000,      // 60 min (Railway/Vercel stable)
  RENDER_MAX_INTERVAL_MS: 10 * 60 * 1000,  // 10 min (Render keep awake)
  BACKOFF_MULTIPLIER: 2,                // Double à chaque succès
  SUCCESS_THRESHOLD: 1,                 // 1 succès avant d'augmenter
  FAILURE_THRESHOLD: 3,                 // 3 échecs avant alerte
}
```

### Platform-Specific Limits

```typescript
// Railway APIs : Max 60 min (économiser $)
getMaxIntervalForService('ezauth-api') → 60 minutes

// Render APIs : Max 10 min (empêcher sleep)
getMaxIntervalForService('ezbill-api') → 10 minutes

// Vercel Web : Max 60 min (pas de sleep)
getMaxIntervalForService('ezstart-web') → 60 minutes
```

---

## Architecture

### 1. Types & Config (packages/monitoring/src/types/health.ts)

**Nouveaux types :**
- `AdaptiveCheckState` - État pour chaque service (interval, succès, échecs)
- `ADAPTIVE_CHECK_CONFIG` - Configuration centralisée

**Nouvelles fonctions :**
- `getMaxIntervalForService(serviceId)` - Max interval selon platform
- `calculateNextInterval(state)` - Logique exponential backoff

### 2. Scheduler (apps/monitoring/api/src/services/healthCheckScheduler.ts)

**Refactoring complet :**
- ❌ Supprimé : cron job fixe toutes les 5 min
- ✅ Ajouté : Scheduler adaptatif avec setTimeout par service
- ✅ Ajouté : Tracking `serviceStates` (Map) pour chaque service
- ✅ Ajouté : Métadonnées dans MongoDB (`adaptiveInterval`, `consecutiveSuccesses`)

**Méthodes principales :**
- `initializeServiceStates()` - Init tous les services à 5 min
- `scheduleNextCheck(serviceId)` - setTimeout individuel par service
- `performHealthCheck(serviceId)` - Check + update interval + schedule next
- `getStatus()` - État complet de tous les services

### 3. Routes API (apps/monitoring/api/src/routes/scheduler.ts)

**Nouveaux endpoints :**
- `GET /api/scheduler/status` - État complet du scheduler
- `GET /api/scheduler/service/:serviceId` - État d'un service spécifique

**Exemple response `/api/scheduler/status` :**
```json
{
  "isRunning": true,
  "environment": "production",
  "totalServices": 13,
  "states": [
    {
      "serviceId": "ezauth-api",
      "currentInterval": "40min",
      "nextCheckAt": "2025-10-29T15:30:00Z",
      "lastStatus": "healthy",
      "consecutiveSuccesses": 4,
      "consecutiveFailures": 0
    },
    {
      "serviceId": "ezbill-api",
      "currentInterval": "10min",
      "nextCheckAt": "2025-10-29T14:55:00Z",
      "lastStatus": "healthy",
      "consecutiveSuccesses": 2,
      "consecutiveFailures": 0
    }
  ]
}
```

---

## Économies Estimées

### Avant (Fixed 5min Checks)

```
13 services × 288 checks/jour = 3,744 checks/jour

Railway (EZAuth + EZPay):
- 2 APIs × 288 checks/jour × 30 jours = 17,280 checks/mois
- Coût: ~$2-3/mois

Render (EZBill + TD + GreenPulse):
- 3 APIs × 288 checks/jour × 30 jours = 25,920 checks/mois
- Uptime: 720h/mois (limite atteinte)

Total checks/mois: ~43,200
```

### Après (Adaptive Checks)

**Scénario Stable (tous services UP) :**

```
Railway APIs (60min max):
- Check 1: 5min, Check 2: 10min, Check 3: 20min, Check 4: 40min, Check 5+: 60min
- Moyenne après stabilisation: ~24 checks/jour par API
- 2 APIs × 24 × 30 = 1,440 checks/mois (-92% !)
- Coût: ~$0.10-0.20/mois ✅

Render APIs (10min max):
- Check 1: 5min, Check 2+: 10min
- Moyenne: ~144 checks/jour par API
- 3 APIs × 144 × 30 = 12,960 checks/mois (-50% !)
- Uptime: 720h/mois (optimal, APIs restent éveillées)

Vercel Web (60min max):
- Moyenne après stabilisation: ~24 checks/jour par app
- 8 apps × 24 × 30 = 5,760 checks/mois (-92% !)

Total checks/mois: ~20,160 (-53% !)
```

**Scénario Instable (1 service DOWN) :**

```
Service DOWN reste à 5min checks: 288 checks/jour
Services UP passent à 60min: ~24 checks/jour

Exemple: EZBill DOWN, autres UP
- EZBill: 288 checks/jour
- Autres 12 services: ~288 checks/jour total
- Total: ~576 checks/jour

Réactivité: Service récupère → Détecté en 5min ✅
```

---

## UptimeRobot + Adaptive Monitoring

### Tu peux GARDER les deux !

**Stratégie Hybride Intelligente :**

1. **UptimeRobot (toutes les 5min)**
   - Vérifie SEULEMENT Monitoring API (1 service)
   - Garde Monitoring éveillé 24/7
   - Coût: 0 check additionnel (juste 1 service)

2. **Monitoring API Adaptatif**
   - Vérifie tous les autres services (13 services)
   - S'adapte selon leur santé
   - Économise Railway/Render/Vercel

**Avantages :**
✅ Monitoring API toujours éveillé (UptimeRobot)
✅ Tous les autres services monitorés intelligemment
✅ Économies maximales sur Railway/Render
✅ 0 conflit entre les deux systèmes

**Configuration UptimeRobot :**
```
✅ GARDER : Monitor Monitoring API (https://monitoring-api.up.railway.app/api/health)
❌ SUPPRIMER : Tous les autres monitors (EZAuth, EZBill, etc.)

Résultat: UptimeRobot = 1 check toutes les 5min (288/jour)
Monitoring API = ~500 checks/jour (adaptive, tous services)
```

---

## Monitoring en Temps Réel

### Dashboard Monitoring

Tu pourras voir en temps réel :
- Interval actuel de chaque service
- Next check dans X minutes
- Succès consécutifs / Échecs consécutifs
- Status (healthy/unhealthy)

**Socket.IO Events :**
```javascript
socket.on('health-check-updated', (data) => {
  // { serviceId, status, responseTime, nextCheckIn, timestamp }
  console.log(`${data.serviceId}: ${data.status} - Next in ${data.nextCheckIn}ms`)
})
```

---

## Logs Exemples

### Démarrage

```
⏰ [Scheduler] Starting ADAPTIVE health check scheduler in production mode...
⏰ [Scheduler] Monitoring 13 services with exponential backoff
⏰ [Scheduler] Config:
   - Min interval: 5 minutes
   - Max interval (Railway/Vercel): 60 minutes
   - Max interval (Render): 10 minutes
   - Backoff multiplier: 2x
⏰ [Scheduler] Waiting 30 seconds before first health check...
⏰ [Scheduler] Scheduled 13 services for adaptive health checks
⏰ [Scheduler] ezauth-api: Next check in 5min (interval: 5min)
⏰ [Scheduler] ezbill-api: Next check in 5min (interval: 5min)
...
✅ [Scheduler] Adaptive health check scheduler started (production mode)
```

### Checks Réussis

```
✅ [Scheduler] ezauth-api: healthy (120ms) - Next in 5min
✅ [Scheduler] ezauth-api: healthy (95ms) - Next in 10min
📊 [Scheduler] ezauth-api: Interval 5min → 10min (status: healthy, successes: 1)
✅ [Scheduler] ezauth-api: healthy (110ms) - Next in 20min
📊 [Scheduler] ezauth-api: Interval 10min → 20min (status: healthy, successes: 2)
✅ [Scheduler] ezauth-api: healthy (105ms) - Next in 40min
📊 [Scheduler] ezauth-api: Interval 20min → 40min (status: healthy, successes: 3)
✅ [Scheduler] ezauth-api: healthy (115ms) - Next in 60min
📊 [Scheduler] ezauth-api: Interval 40min → 60min (status: healthy, successes: 4)
```

### Service DOWN

```
❌ [Scheduler] ezbill-api: unhealthy (10000ms) - Reset to 5min
📊 [Scheduler] ezbill-api: Interval 10min → 5min (status: unhealthy, successes: 0)
```

### Render Service (Capped at 10min)

```
✅ [Scheduler] ezbill-api: healthy (150ms) - Next in 5min
✅ [Scheduler] ezbill-api: healthy (140ms) - Next in 10min
📊 [Scheduler] ezbill-api: Interval 5min → 10min (status: healthy, successes: 1)
✅ [Scheduler] ezbill-api: healthy (135ms) - Next in 10min
(interval reste à 10min, ne monte jamais à 20min car Render max = 10min)
```

---

## Testing

### 1. Vérifier le Status

```bash
# Status complet de tous les services
curl http://localhost:5080/api/scheduler/status | jq

# Status d'un service spécifique
curl http://localhost:5080/api/scheduler/service/ezauth-api | jq
```

### 2. Simuler un Service DOWN

```bash
# Arrêter EZAuth API temporairement
pnpm --filter api-ezauth stop

# Observer les logs du monitoring
# Tu verras: "❌ [Scheduler] ezauth-api: unhealthy - Reset to 5min"
```

### 3. Observer l'Escalation

Laisser tourner 2-3 heures et observer :
- Railway APIs montent à 60 min
- Render APIs plafonnent à 10 min
- Vercel Web apps montent à 60 min

---

## Déploiement

### 1. Build & Push

```bash
# Build packages + API
pnpm --filter @ezstart/monitoring --filter api-monitoring build

# Commit + Push
git add .
git commit -m "feat(monitoring): adaptive health checks with exponential backoff"
git push
```

### 2. Railway Auto-Deploy

Railway détecte le commit → Build → Deploy automatiquement

### 3. Vérifier Logs Railway

```
⏰ [Scheduler] Starting ADAPTIVE health check scheduler...
⏰ [Scheduler] Scheduled 13 services for adaptive health checks
✅ [Scheduler] Adaptive health check scheduler started
```

### 4. Désactiver UptimeRobot (Optionnel)

**Option 1 : Garder UptimeRobot (Recommandé)**
- Garde SEULEMENT monitor pour Monitoring API
- Supprime tous les autres monitors

**Option 2 : Tout désactiver**
- Monitoring API s'auto-monitore avec Render
- 0 externe nécessaire

---

## Prochaines Étapes (Optionnel)

### Phase 1 : Dashboard Visualization (2h)

Ajouter dans le dashboard monitoring :
- Badge "Adaptive" avec interval actuel
- Graphique de progression des intervals
- Timeline des escalations/resets

### Phase 2 : Alerting (1h)

Déclencher alertes quand :
- Service a 3+ échecs consécutifs (`FAILURE_THRESHOLD`)
- Service revient après downtime (recovery notification)

### Phase 3 : Analytics (1h)

Track métriques :
- Average interval par service (mesure de stabilité)
- Nombre de resets par jour (incidents)
- Coût économisé par rapport à fixed checks

---

## Best Practices

### ✅ DO

1. **Garder UptimeRobot pour Monitoring API uniquement**
2. **Monitorer /api/scheduler/status régulièrement**
3. **Vérifier MongoDB metadata pour trends**
4. **Ajuster MAX_INTERVAL si needed (30min, 45min, etc.)**

### ❌ DON'T

1. **Ne pas descendre MIN_INTERVAL < 5min** (trop de checks)
2. **Ne pas monter RENDER_MAX_INTERVAL > 10min** (sleep après 15min)
3. **Ne pas désactiver adaptive checks en production** (coût explose)

---

## Résumé

✅ **Monitoring intelligent avec exponential backoff implémenté**
✅ **-53% de checks totaux** (43,200 → 20,160/mois)
✅ **-92% coût Railway** ($2-3 → $0.10-0.20/mois)
✅ **Render reste éveillé** (10min checks, <15min sleep threshold)
✅ **UptimeRobot compatible** (garde juste Monitoring API)
✅ **Ready to deploy** (build successful, types OK)

**Tu peux maintenant déployer et observer les économies ! 🎉**
