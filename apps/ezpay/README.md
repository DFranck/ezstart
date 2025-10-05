# EZPay - Universal Payment System

EZPay est le système de paiement centralisé pour tous les projets du monorepo @ezstart.

## 🎯 Cas d'Usage

| Type | Description | Exemple |
|------|-------------|---------|
| **Donations** | Dons avec testimonials publics | Support Tower Defense |
| **Purchases** | Achats in-app | Gems, powerups, items |
| **Subscriptions** | Abonnements récurrents | Premium Tower Defense |
| **Invoices** | Facturation clients | Intégration EZ-Billing |

## 📦 Architecture

```
packages/pay-sdk/          ← Client SDK React + Composants
apps/ezpay/api/           ← Service API (Port 5040)
apps/ezpay/web/           ← Dashboard (Port 5045)
```

## 🚀 Installation

### Dans une app du monorepo

```json
// package.json
{
  "dependencies": {
    "@ezstart/pay-sdk": "workspace:*"
  }
}
```

### Usage Basic

```tsx
// 1. Setup Client
import { createPayClient, PayProvider } from '@ezstart/pay-sdk'

const payClient = createPayClient({
  appName: 'tower-defense'
})

// 2. Provider
<PayProvider client={payClient}>
  <App />
</PayProvider>

// 3. Composants
import { DonateModal, DonationWall } from '@ezstart/pay-sdk'

<DonateModal projectId="tower-defense" projectName="Tower Defense" />
<DonationWall projectId="tower-defense" limit={9} />
```

## 🔧 Développement

### Démarrer l'API et le Web

```bash
# API + Web ensemble
pnpm dev:pay

# Seulement API
pnpm --filter api-ezpay dev

# Seulement Web
pnpm --filter web-ezpay dev
```

### Variables d'environnement

**API (.env.local):**
```env
PORT=5040
MONGODB_URI=mongodb://localhost:27017/ezpay
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
WEB_URL=http://localhost:5045
```

**Web (.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:5040/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## 📖 Documentation Complète

Voir [CLAUDE.md](../../CLAUDE.md) section "EZPay - Système de Paiement Universel"

## 🌐 URLs

- **API Dev:** http://localhost:5040/api
- **Web Dev:** http://localhost:5045
- **API Prod:** https://ezpay-api.onrender.com/api
- **Web Prod:** https://ezpay.vercel.app

## 📝 Composants Disponibles

### Donations
- `<DonateButton />` - Bouton simple
- `<DonateModal />` - Modal complet avec montants
- `<DonationWall />` - Mur de testimonials

### Hooks
- `usePay()` - Hook principal
- `useDonations({ projectId, limit })` - Hook donations

## 🔐 Stripe Configuration

1. Créer compte Stripe Test
2. Récupérer clés API (Dashboard > Developers > API Keys)
3. Configurer webhook endpoint : `/api/webhooks/stripe`
4. Récupérer webhook secret

## ✅ Features Implémentées

- ✅ SDK React complet
- ✅ API donations avec Stripe
- ✅ Webhooks Stripe
- ✅ Testimonials publics
- ✅ Link EZAuth (userId)
- ✅ Support anonyme
- ⏳ Purchases (à implémenter)
- ⏳ Subscriptions (à implémenter)
- ⏳ Invoices (à implémenter)

## 📊 Prochaines Étapes

1. Implémenter Purchases endpoints
2. Implémenter Subscriptions endpoints
3. Créer composants Subscriptions
4. Dashboard admin stats
5. Widget embeddable pour projets externes
