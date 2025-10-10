# EZPay Web - Universal Payment Dashboard

Dashboard et documentation pour le système de paiement centralisé du monorepo @ezstart.

## 📋 Vue d'ensemble

EZPay Web est l'interface de gestion et de documentation du système de paiement universel. Il fournit :

- 📊 **Dashboard Analytics** - Statistiques globales de tous les paiements du monorepo
- 📖 **Documentation Interactive** - Guide d'intégration pour les développeurs
- 🧪 **Playground** - Test des composants pay-sdk en temps réel
- 📈 **Revenue Tracking** - Suivi des revenus par projet et type de paiement
- 🎯 **Project Stats** - Performance et trending des projets

## 🚀 Démarrage

### Prérequis

- Node.js 20+
- pnpm 9+
- Accès à l'API EZPay (http://localhost:5040)

### Installation

```bash
# À la racine du monorepo
pnpm install

# Démarrer EZPay Web
pnpm --filter web-ezpay dev

# Ou via le script dédié
pnpm dev:pay
```

L'application sera accessible sur **http://localhost:5045**

### Variables d'environnement

Créer `.env.local` à partir de `.env.example` :

```env
# API EZPay
NEXT_PUBLIC_API_URL=http://localhost:5040/api
NEXT_PUBLIC_WEB_URL=http://localhost:5045

# Stripe (pour playground)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Auth (optionnel - pour historique utilisateur)
NEXT_PUBLIC_EZAUTH_API_URL=http://localhost:5010/api
```

## 🏗️ Architecture

### Stack Technique

- **Framework** : Next.js 15.5.2 (App Router)
- **UI** : @ezstart/ui (Radix UI + Tailwind CSS)
- **Theme** : @ezstart/next-theme (dark/light mode)
- **Charts** : Recharts (à venir)
- **SDK** : @ezstart/pay-sdk (hooks et composants)

### Structure

```
apps/ezpay/web/
├── src/
│   └── app/
│       ├── layout.tsx         # Root layout with ThemeProvider
│       ├── page.tsx           # Home page (documentation)
│       ├── docs/              # Documentation interactive (à venir)
│       ├── playground/        # Test des composants (à venir)
│       ├── analytics/         # Statistiques détaillées (à venir)
│       └── globals.css        # Global styles
├── public/
│   └── manifest.json          # PWA manifest (à venir)
├── .env.example               # Template variables
├── next.config.ts             # Next.js config
├── tailwind.config.js         # Tailwind config (shared)
└── package.json
```

## 📊 Fonctionnalités

### Page d'Accueil (Actuelle)

**Documentation complète avec :**
- Vue d'ensemble d'EZPay
- Types de paiements supportés (Donations, Purchases, Subscriptions, Invoices)
- Guide de démarrage rapide
- Exemples d'intégration par type
- API Reference basique

### Dashboard Analytics (À venir)

**Vue globale des paiements :**
- Total des revenus (tous projets confondus)
- Répartition par type (donations, purchases, subscriptions)
- Top projets (par revenus)
- Trending (croissance mensuelle)
- Graphiques temporels

### Documentation Interactive (À venir)

**Sections prévues :**
- 🎯 Getting Started - Installation et setup
- 🔌 Integration Examples - Code snippets par use case
- 🧩 Components Reference - API des composants
- 🪝 Hooks Reference - Documentation des hooks
- 🌐 API Endpoints - Référence API REST
- 💳 Stripe Setup - Configuration webhooks

### Playground Interactif (À venir)

**Test des composants pay-sdk :**
- DonateModal - Modal de donation avec testimonials
- BuyButton - Bouton d'achat avec callback
- SubscribeButton - Bouton d'abonnement
- PaymentHistory - Historique utilisateur

## 🔌 Intégration avec @ezstart/pay-sdk

### Installation du SDK dans une app

```bash
pnpm add @ezstart/pay-sdk
```

### Setup Provider

```tsx
import { PayProvider, createPayClient } from '@ezstart/pay-sdk'

const payClient = createPayClient({
  appName: 'tower-defense'
})

export default function RootLayout({ children }) {
  return (
    <PayProvider client={payClient}>
      {children}
    </PayProvider>
  )
}
```

### Utilisation des composants

**Donations avec testimonials :**
```tsx
import { DonateModal, DonationWall } from '@ezstart/pay-sdk'

// Modal de donation
<DonateModal
  projectId="tower-defense"
  projectName="Tower Defense"
  amounts={[5, 10, 20, 50]}
/>

// Mur de testimonials publics
<DonationWall
  projectId="tower-defense"
  limit={9}
/>
```

**Achats in-app :**
```tsx
import { BuyButton } from '@ezstart/pay-sdk'

<BuyButton
  projectId="tower-defense"
  productId="gems-100"
  productName="100 Gems"
  amount={4.99}
  onSuccess={(payment) => {
    // Ajouter les gems au compte utilisateur
    addGemsToAccount(100)
  }}
/>
```

**Abonnements :**
```tsx
import { SubscribeButton, PricingTable } from '@ezstart/pay-sdk'

// Table de pricing
<PricingTable
  plans={[
    { id: 'basic', name: 'Basic', price: 9.99, interval: 'month' },
    { id: 'pro', name: 'Pro', price: 19.99, interval: 'month' },
  ]}
/>

// Bouton d'abonnement
<SubscribeButton
  projectId="tower-defense"
  planId="premium-monthly"
  planName="Premium"
  amount={9.99}
  interval="month"
/>
```

### Hooks disponibles

```tsx
import { usePay, useDonations } from '@ezstart/pay-sdk'

// Hook principal
const { createDonation, createPurchase, createSubscription } = usePay()

// Hook spécialisé donations
const { donations, isLoading, reload } = useDonations({
  projectId: 'tower-defense',
  limit: 10
})

// Créer une donation
await createDonation({
  projectId: 'tower-defense',
  projectName: 'Tower Defense',
  amount: 10,
  customerName: 'John Doe',
  message: 'Great game!',
  isPublic: true
})
```

## 📈 Statistiques Globales (API)

### Endpoints Disponibles

**Global Stats :**
```typescript
GET /api/payments/stats

Response:
{
  totalRevenue: 12345.67,
  totalTransactions: 567,
  byType: {
    donations: { count: 234, total: 3456.78 },
    purchases: { count: 189, total: 5678.90 },
    subscriptions: { count: 144, total: 3209.99 }
  },
  byProject: {
    'tower-defense': { count: 234, total: 5678.90 },
    'ezbill': { count: 189, total: 4567.89 },
    ...
  }
}
```

**Project Stats :**
```typescript
GET /api/payments/stats?projectId=tower-defense

Response:
{
  projectId: 'tower-defense',
  totalRevenue: 5678.90,
  totalTransactions: 234,
  averageAmount: 24.27,
  topContributors: [
    { name: 'John Doe', total: 150 },
    ...
  ],
  recentTransactions: [...]
}
```

## 🌐 API Reference

### Base URL

- **Local** : http://localhost:5040/api
- **Production** : https://ezpay-api.onrender.com/api

### Endpoints Principaux

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/donate` | POST | Créer donation |
| `/donations` | GET | Liste donations (testimonials) |
| `/donations/stats` | GET | Stats donations |
| `/purchase` | POST | Créer achat |
| `/purchases` | GET | Liste achats |
| `/subscribe` | POST | Créer abonnement |
| `/subscriptions` | GET | Liste abonnements |
| `/subscriptions/:id/cancel` | POST | Annuler abonnement |
| `/payments/:id` | GET | Détails paiement |
| `/payments/stats` | GET | Statistiques globales |
| `/webhooks/stripe` | POST | Webhook Stripe |
| `/health` | GET | Health check |

### Modèle de données

```typescript
interface Payment {
  // Project
  projectId: string
  projectName: string

  // Type & Amount
  type: 'donation' | 'purchase' | 'subscription' | 'invoice'
  amount: number
  currency: string

  // Customer
  userId?: string
  customerName?: string
  customerEmail?: string
  isAnonymous: boolean

  // Provider
  provider: 'stripe' | 'paypal'
  paymentId: string
  paymentMethod: string
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled'

  // Metadata (flexible par type)
  metadata: {
    // Donations
    message?: string
    isPublic?: boolean

    // Purchases
    productId?: string
    productName?: string
    quantity?: number

    // Subscriptions
    subscriptionId?: string
    planId?: string
    interval?: 'month' | 'year'
  }

  createdAt: Date
  completedAt?: Date
}
```

## 🎨 Thèmes et UI

### Theme Provider

```tsx
import { ThemeProvider } from '@ezstart/next-theme'

<ThemeProvider>
  <App />
</ThemeProvider>
```

### Composants UI disponibles

```tsx
import {
  Button,
  Card,
  Input,
  Label,
  Badge
} from '@ezstart/ui/components'

// Tous les composants respectent le theme automatiquement
<Card>
  <Button variant="default">Primary</Button>
  <Button variant="destructive">Danger</Button>
  <Badge variant="success">Success</Badge>
</Card>
```

## 🔐 Intégration EZAuth (Optionnel)

### Historique Paiements Utilisateur

```tsx
import { useAuth } from '@ezstart/auth-sdk'
import { PaymentHistory } from '@ezstart/pay-sdk'

function UserDashboard() {
  const { user } = useAuth()

  return (
    <PaymentHistory
      userId={user?.id}
      limit={20}
    />
  )
}
```

### Link Payments ↔ Users

```typescript
// Créer paiement lié à un utilisateur
await createDonation({
  projectId: 'tower-defense',
  amount: 10,
  userId: user.id,        // Link avec EZAuth
  customerName: user.name,
  customerEmail: user.email
})
```

## 🚀 Déploiement

### Vercel (Recommandé)

**Configuration :**
- Root Directory: `apps/ezpay/web`
- Include files outside root: ✅ COCHÉ
- Build Command: `pnpm build`
- Environment Variables:
  - `NEXT_PUBLIC_API_URL=https://ezpay-api.onrender.com/api`
  - `NEXT_PUBLIC_WEB_URL=https://ezpay.vercel.app`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...`

**URL Production :** https://ezpay.vercel.app

### Build Local

```bash
# Build l'application
pnpm --filter web-ezpay build

# Start en production
pnpm --filter web-ezpay start
```

## 📦 Dépendances

### Runtime

- `next` ^15.5.2 - Framework
- `react` ^19.1.1 - UI Library
- `@ezstart/ui` workspace:* - Composants
- `@ezstart/next-theme` workspace:* - Theme provider
- `@ezstart/pay-sdk` workspace:* - SDK paiements
- `next-themes` ^0.4.6 - Theme management

### Dev

- `@ezstart/typescript-config` workspace:* - Config TS
- `@ezstart/eslint-config` workspace:* - Config ESLint
- `@ezstart/tailwind-config` workspace:* - Config Tailwind
- `typescript` ^5.7.3 - TypeScript

## 🔗 Ressources

### Documentation

- [EZPay API](../api/README.md) - Documentation API
- [@ezstart/pay-sdk](../../../packages/pay-sdk/README.md) - SDK Reference
- [Next.js Docs](https://nextjs.org/docs) - Next.js 15
- [Stripe Docs](https://stripe.com/docs) - Stripe Integration

### Applications Utilisant EZPay

- **Tower Defense** - Donations, purchases, subscriptions
- **EZ-Billing** - Invoice payments (futur)
- **GreenPulse** - Donations et subscriptions (futur)

### Related Packages

- `@ezstart/auth-sdk` - Authentication SDK
- `@ezstart/ui` - UI Components
- `@ezstart/next-theme` - Theme Provider
- `@ezstart/express-core` - API Infrastructure

## 🔧 Development Commands

```bash
# Dev mode
pnpm dev

# Build
pnpm build

# Start production
pnpm start

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## 📝 Features Roadmap

- ✅ **Home Page** - Documentation complète et exemples
- ⏳ **Dashboard Analytics** - Stats et graphiques en temps réel
- ⏳ **API Docs** - Documentation API interactive
- ⏳ **Playground** - Test interactif des composants
- ⏳ **Widget Generator** - Générateur de widget embeddable
- ⏳ **Public Donation Pages** - Pages publiques `/donate/:project`
- ⏳ **Testimonials Gallery** - Gallerie de tous les témoignages

## 🤝 Contribution

### Ajouter une nouvelle fonctionnalité

1. Créer composant dans `src/app/` ou `src/components/`
2. Ajouter route dans `src/app/`
3. Mettre à jour documentation
4. Tester le build et typecheck

### Ajouter un nouveau type de paiement

1. Étendre le modèle `Payment` dans `@ezstart/types`
2. Créer composant dans `@ezstart/pay-sdk`
3. Ajouter endpoint dans EZPay API
4. Documenter dans EZPay Web

## 📝 Notes

- Port **5045** (pattern 50x5 pour Web apps)
- Utilise le ThemeProvider pour dark/light mode
- Auto-configuration de l'API URL (dev/prod)
- Compatible avec le monorepo @ezstart
- Documentation synchronisée avec l'API

## 📝 License

Partie du monorepo @ezstart - Propriétaire privé
