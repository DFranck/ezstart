# 🚨 Plan Urgent - Réduction Consommation Railway/Render

## Problème Actuel

**Double monitoring consomme tout :**
- Monitoring API : Toutes les 10 min (144 checks/jour)
- UptimeRobot : Toutes les 5 min (288 checks/jour)
- **TOTAL : 432 checks/jour × 6 APIs = 2,592 checks/jour !**

**Coût estimé :**
- Railway : $5 consommés en 1 semaine
- Render : 750h/mois dépassées (services suspendus)

---

## Solution 1 : Désactiver UptimeRobot (RECOMMANDÉ)

### Avantages
✅ Gratuit - Ton monitoring API suffit
✅ Un seul système à maintenir
✅ Dashboard centralisé @ezstart/monitoring

### Actions
1. **Aller sur UptimeRobot Dashboard**
2. **Désactiver ou supprimer tous les monitors @ezstart**
3. **Garder SEULEMENT ton Monitoring API**

**Nouvelle fréquence :**
- 144 checks/jour au lieu de 432 (-67% !)

---

## Solution 2 : Stratégie Multi-Plateforme Intelligente

### Principe : Render = Keep Awake, Railway = Minimal Monitoring

**Railway APIs (EZAuth, EZPay) :**
- Check toutes les **30 minutes** (48 checks/jour)
- Juste pour monitoring, accepter le cold start

**Render APIs (EZBill, TD, GreenPulse) :**
- Check toutes les **10 minutes** (144 checks/jour)
- Empêcher le sleep (seuil = 15 min)

**Vercel Web :**
- Check toutes les **30 minutes** (48 checks/jour)
- Uptime monitoring seulement

### Configuration

```env
# apps/monitoring/api/.env.local

# Railway APIs : Minimal checks (économiser $)
RAILWAY_CHECK_INTERVAL=1800000  # 30 min

# Render APIs : Keep awake checks (empêcher sleep)
RENDER_CHECK_INTERVAL=600000    # 10 min

# Vercel Web : Uptime monitoring
VERCEL_CHECK_INTERVAL=1800000   # 30 min
```

### Code à Modifier

```typescript
// packages/monitoring/src/types/health.ts

export const SERVICE_PLATFORMS = {
  railway: ['ezauth-api', 'ezpay-api'],
  render: ['ezbill-api', 'tower-defense-api', 'green-pulse-api'],
  vercel: ['ezstart-web', 'ezauth-web', ...],
}

export const CHECK_INTERVALS = {
  railway: 30 * 60 * 1000,  // 30 min (minimal)
  render: 10 * 60 * 1000,   // 10 min (keep awake)
  vercel: 30 * 60 * 1000,   // 30 min (uptime)
}
```

### Résultat Estimé

```
AVANT (avec UptimeRobot) :
- Railway : 288 checks/jour × 2 APIs = 576 checks/jour
- Render : 288 checks/jour × 3 APIs = 864 checks/jour
- TOTAL : 1,440 checks/jour

APRÈS (monitoring intelligent) :
- Railway : 48 checks/jour × 2 APIs = 96 checks/jour (-83% !)
- Render : 144 checks/jour × 3 APIs = 432 checks/jour (-50% !)
- TOTAL : 528 checks/jour (-63% !)

Railway coût :
- Avant : $5/mois
- Après : ~$0.60/mois (-88% !) ✅

Render uptime :
- Avant : 720h/mois (limite)
- Après : 720h/mois (optimal, APIs restent éveillées)
```

---

## Solution 3 : Railway Only for Critical (EXTRÊME)

**Garder sur Railway :**
- ✅ EZAuth API (critique SSO)

**Migrer vers Render :**
- EZPay API → Render (paiements moins fréquents)

**Résultat :**
- Railway : 1 API × 48 checks/jour = 48 checks/jour
- Railway coût : ~$0.20/mois
- Render : 4 APIs × 144 checks/jour = 576 checks/jour

---

## Recommandation Finale

### Phase 1 : Immédiat (5 min)
1. **Désactiver tous les monitors UptimeRobot**
2. **Vérifier consommation Railway/Render demain**

### Phase 2 : Cette semaine (2h)
1. **Implémenter stratégie multi-plateforme**
2. **Railway : 30 min checks**
3. **Render : 10 min checks**
4. **Déployer nouveau monitoring API**

### Phase 3 : Si besoin (optionnel)
1. **Migrer EZPay → Render**
2. **Railway = EZAuth uniquement**

---

## Monitoring Dashboard - Ajustements

### Afficher stratégie par plateforme

```typescript
// Dashboard affiche la fréquence par service
<ServiceCard
  name="EZAuth API"
  platform="Railway"
  checkInterval="30 min"  // ← NEW
  lastCheck={healthCheck.timestamp}
  status={healthCheck.status}
/>

<ServiceCard
  name="EZBill API"
  platform="Render"
  checkInterval="10 min"  // ← NEW (keep awake)
  lastCheck={healthCheck.timestamp}
  status={healthCheck.status}
/>
```

---

## Questions à Répondre

1. **Tu utilises UptimeRobot ?** Si oui, désactive-le maintenant !
2. **EZPay critique ?** Si non, migrer vers Render
3. **Tu veux monitoring avancé ?** Implémenter stratégie multi-plateforme

---

## Fichiers à Modifier (Solution 2)

- `packages/monitoring/src/types/health.ts` - Ajouter `CHECK_INTERVALS`
- `apps/monitoring/api/src/services/healthCheckScheduler.ts` - Scheduler multi-fréquence
- `apps/monitoring/api/.env.example` - Documenter nouvelle stratégie
- `docs/CI-CD-SETUP.md` - Mettre à jour monitoring strategy

---

## Next Steps

Dis-moi :
1. Tu veux juste **désactiver UptimeRobot** (rapide) ?
2. Ou **implémenter stratégie intelligente** (2h, optimal) ?
