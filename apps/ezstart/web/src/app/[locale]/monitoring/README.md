# Monitoring Dashboard - Architecture

## Overview

Le monitoring dashboard de @ezstart suit une **architecture à pages dédiées** (au lieu de tabs), pour une meilleure navigation et SEO.

---

## Structure des Pages

```
/monitoring          → Overview (Vue d'ensemble)
/monitoring/health   → Projects Health (Santé des projets)
/monitoring/audits   → Quality Audits (Audits qualité)
/monitoring/errors   → Error Monitoring (Suivi des erreurs)
```

### Navigation

La navigation se fait via le menu principal :

```json
{
  "menuLabel": "Monitoring",
  "href": "/monitoring",
  "menu": [
    { "label": "Health", "href": "/monitoring/health" },
    { "label": "Audits", "href": "/monitoring/audits" },
    { "label": "Errors", "href": "/monitoring/errors" }
  ]
}
```

---

## Pages Détaillées

### 1. `/monitoring` - Overview

**Contenu :**

- Hero section avec Global Health Score (96.6/100)
- Metrics overview (métriques globales)
- SystemOverview component (cartes résumées pour chaque catégorie)

**Données chargées :**

- Projects (pour stats)
- Audits (pour stats)
- Errors (pour stats)

---

### 2. `/monitoring/health` - Projects Health

**Contenu :**

- Hero section avec Projects Health Score
- Trending Metrics (top 3 projets)
- Projects Grid (tous les projets avec UptimeGraph)

**Composants :**

- `health/components/TrendingMetrics.tsx` - Graphiques Recharts
- `health/components/ProjectCard.tsx` - Carte projet + UptimeGraph
- `health/components/ServiceCard.tsx` - Carte service

**Données chargées :**

- Projects + health checks history

---

### 3. `/monitoring/audits` - Quality Audits

**Contenu :**

- Hero section avec Audits Quality Score
- Audits Grid (toutes les catégories d'audits)

**Composants :**

- `health/components/AuditCard.tsx` - Carte audit avec score

**Données chargées :**

- Audits

---

### 4. `/monitoring/errors` - Error Monitoring

**Contenu :**

- Hero section avec Error Status Score
- ErrorsFeed (flux en temps réel des erreurs)

**Composants :**

- `errors/components/ErrorsFeed.tsx` - Feed d'erreurs paginé

**Données chargées :**

- Error logs

---

## Architecture des Composants

```
monitoring/
├── page.tsx                     # Overview page
├── components/                  # Composants partagés
│   ├── MetricsOverview.tsx     # Métriques cards
│   ├── TabScore.tsx            # Score badge + title
│   ├── SystemOverview.tsx      # Overview cards grid
│   └── TrendingGraph.tsx       # Graph tendances
├── health/
│   ├── page.tsx                # Health page
│   └── components/
│       ├── ProjectCard.tsx     # Carte projet
│       ├── TrendingMetrics.tsx # Recharts graphs
│       ├── AuditCard.tsx       # Carte audit
│       └── ServiceCard.tsx     # Carte service
├── audits/
│   └── page.tsx                # Audits page
├── errors/
│   ├── page.tsx                # Errors page
│   └── components/
│       └── ErrorsFeed.tsx      # Feed erreurs
├── hooks/
│   ├── useMonitoringProjects.ts
│   ├── useMonitoringAudits.ts
│   ├── useMonitoringErrors.ts
│   ├── useSocket.ts
│   └── useCountdown.ts
└── lib/
    ├── config.ts               # API URLs
    └── utils.ts                # Health calculations
```

---

## Hooks Partagés

### Data Fetching (React Query)

- `useMonitoringProjects()` - Fetch projects + summary
- `useMonitoringAudits()` - Fetch audits
- `useMonitoringErrors()` - Fetch error logs

### Real-time Updates

- `useSocket()` - Socket.IO pour updates en temps réel
- `useCountdown()` - Compte à rebours jusqu'au prochain refresh (5min)

---

## Avantages de cette Architecture

### ✅ SEO-Friendly

- Chaque page a son propre URL
- Meilleur indexation par Google
- Partage de liens direct vers une section

### ✅ Performance

- Code-splitting automatique par Next.js
- Chaque page charge seulement les données nécessaires
- Lazy loading des composants

### ✅ Navigation Intuitive

- Breadcrumbs possibles
- Back button fonctionnel
- Deep linking supporté

### ✅ Maintenance

- Code mieux organisé
- Composants isolés par page
- Imports plus clairs

---

## Real-time Updates

### Socket.IO Integration

Toutes les pages écoutent l'événement `healthChecksUpdated` :

```ts
useSocket({
  onHealthChecksUpdated: () => {
    queryClient.invalidateQueries({ queryKey: ['monitoring'] })
    resetCountdown()
  },
})
```

### Automatic Refresh

- Health checks toutes les 5 minutes (API cron)
- Socket.IO push les updates immédiatement
- React Query invalide le cache automatiquement
- Countdown affiché à l'utilisateur

---

## Performance Optimizations

### 1. UptimeGraph - Dynamic Aggregation

Le composant `UptimeGraph` agrège intelligemment les données :

- **<100 checks** : 1 barre = 1 check (pas d'agrégation)
- **>100 checks** : Agrégation pour ~60 barres max

Avant (fixe) : `groupSize = 6` → 4 barres pour 26 checks ❌
Après (dynamique) : `groupSize = 1` → 26 barres pour 26 checks ✅

### 2. TrendingMetrics - XAxis Configuration

- `interval="preserveStartEnd"` - Garde début et fin visibles
- `minTickGap={30}` - Espacement minimal entre labels
- Sampling si >60 points (pour lisibilité)

---

## Migration depuis Tabs

### Avant (v1)

```tsx
<Tabs>
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="projects">Projects</TabsTrigger>
    // ...
  </TabsList>
  <TabsContent value="overview">...</TabsContent>
  // ...
</Tabs>
```

**Problèmes :**

- Tout le code chargé d'un coup
- Navigation cachée (tabs invisibles)
- URLs statiques (`/monitoring`)
- Redondance Hero + Tabs

### Après (v2 - Pages dédiées)

```tsx
/monitoring          → page.tsx (Overview)
/monitoring/health   → health/page.tsx
/monitoring/audits   → audits/page.tsx
/monitoring/errors   → errors/page.tsx
```

**Avantages :**

- Code-splitting par page
- Navigation évidente (menu)
- URLs sémantiques
- Pas de redondance

---

## Next Steps

### Améliorations Possibles

1. **Breadcrumbs Navigation**

   ```tsx
   Home > Monitoring > Health
   ```

2. **Search & Filters**
   - Filter projects par status
   - Search audits par type
   - Filter errors par severity

3. **Export Features**
   - Export audits en PDF
   - Export errors en CSV
   - Share monitoring reports

4. **Alerting**
   - Email alerts si score < 90
   - Slack notifications
   - Webhook pour CI/CD

5. **Analytics**
   - Track page views avec Vercel Analytics (gratuit)
   - Monitor user engagement
   - Web Vitals tracking

---

## Testing

```bash
# TypeScript
pnpm --filter web-ezstart typecheck

# Dev server
pnpm dev:ez

# URLs to test
http://localhost:6101/fr/monitoring
http://localhost:6101/fr/monitoring/health
http://localhost:6101/fr/monitoring/audits
http://localhost:6101/fr/monitoring/errors
```

---

**Dernière mise à jour :** 11 Novembre 2025
**Architecture :** Pages dédiées (SEO-optimized)
**Real-time :** Socket.IO + React Query
