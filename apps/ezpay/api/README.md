# EZPay API

API centralisée pour la gestion des paiements, donations, abonnements et factures.

## 🎯 Overview

EZPay API est le service backend qui gère tous les types de paiements pour l'écosystème @ezstart. Il s'interface avec Stripe/PayPal et fournit une API REST standardisée.

## 🔑 Bootstrap — API keys (dev / staging / prod)

Chaque environnement (dev local, staging, production) doit être amorcé **une seule fois** pour obtenir les deux clés dont EZPay a besoin : sa propre publishable key côté web + une secret key S2S côté API pour parler à ezauth.

Ordre obligatoire (ezauth d'abord, ezpay ensuite) :

### 1. Seed ezauth (crée les Applications `ezauth` + `ezpay` + la self-key ezauth)

```bash
pnpm --filter api-ezauth seed:self-key
```

→ Copie la clé affichée dans `apps/ezauth/web/.env.local` :

```env
NEXT_PUBLIC_EZAUTH_KEY=ez_pk_live_...
```

Cette étape crée aussi l'entité `Application(slug="ezpay")` dans la DB ezauth — c'est cette Application qui sert de tenant source-of-truth pour toutes les clés ezpay.

### 2. Génère `EZPAY_SERVER_EZAUTH_KEY` (S2S)

Cette secret key permet à l'API ezpay de valider les `applicationId` auprès d'ezauth lors du `POST /api/keys`. Elle est créée une seule fois par un superadmin via le dashboard ezauth :

1. Login superadmin sur `http://localhost:6111/en/developer`
2. Sélectionner l'Application `ezpay`
3. Create key : `type=secret`, `env=live`, `scope=admin`
4. Copier la valeur (`ez_sk_live_...`) dans `apps/ezpay/api/.env.local` :

```env
EZPAY_SERVER_EZAUTH_KEY=ez_sk_live_...
```

### 3. Seed ezpay (crée la self-key ezpay pour son propre /api/keys)

```bash
pnpm --filter api-ezpay seed:self-key
```

→ Copie la clé affichée dans `apps/ezpay/web/.env.local` :

```env
NEXT_PUBLIC_EZPAY_KEY=ez_pk_live_...
```

Le script est **idempotent** : si une clé `createdBy='system-seed'` existe déjà pour `Application(slug="ezpay")` (active ou révoquée), le script est un no-op et affiche le prefix existant. Pour rotater, supprimer manuellement la row en DB puis rerun.

Redémarrer les dev servers (`pnpm dev ez` ou `pnpm dev pay`) pour que les nouvelles env vars soient prises en compte.

## 🚀 Quick Start

### Development

```bash
# Depuis la racine du monorepo
pnpm --filter api-ezpay dev

# Ou via le script dédié
pnpm dev:pay
```

### Build & Production

```bash
# Build
pnpm --filter api-ezpay build

# Start production
pnpm --filter api-ezpay start
```

## 🔧 Configuration

### Variables d'Environnement

Créer `.env.local` :

```env
# Server
PORT=6130
NODE_ENV=development

# MongoDB
MONGO_URL=mongodb://localhost:27017/ezpay

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# URLs are auto-configured via @ezstart/config
# Stripe redirects are dynamically determined based on projectId
# No need to set WEB_URL manually!

# PayPal (optional)
PAYPAL_CLIENT_ID=
PAYPAL_SECRET=
```

## 📡 API Endpoints

### Health Check

```
GET /api/health
```

### Donations

```
POST   /api/donate
GET    /api/donations
GET    /api/donations/stats
```

### Purchases (à implémenter)

```
POST   /api/purchase
GET    /api/purchases
```

### Subscriptions (à implémenter)

```
POST   /api/subscribe
GET    /api/subscriptions
POST   /api/subscriptions/:id/cancel
POST   /api/subscriptions/:id/resume
```

### Webhooks

```
POST   /api/webhooks/stripe
POST   /api/webhooks/paypal
```

## 📊 Database Schema

### Payment Model

```typescript
{
  // Project
  projectId: string           // 'fengshui', 'ezbill', etc.
  projectName: string         // Display name

  // Type & Amount
  type: 'donation' | 'purchase' | 'subscription' | 'invoice'
  amount: number
  currency: string            // Default: 'USD'

  // Customer (EZAuth integration)
  userId?: string             // EZAuth user ID
  customerName?: string
  customerEmail?: string
  isAnonymous: boolean

  // Payment Provider
  provider: 'stripe' | 'paypal'
  paymentId: string           // Stripe/PayPal transaction ID
  paymentMethod?: string      // 'card', 'paypal', etc.
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled'

  // Flexible Metadata
  metadata: {
    // For donations
    message?: string
    isPublic?: boolean

    // For purchases
    productId?: string
    productName?: string
    quantity?: number

    // For subscriptions
    subscriptionId?: string
    planId?: string
    interval?: 'month' | 'year'

    // For invoices
    invoiceId?: string
    invoiceNumber?: string
  }

  // Timestamps
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}
```

## 🔐 Stripe Integration

### Setup Stripe

1. Créer compte Stripe (test mode)
2. Récupérer clés API: Dashboard > Developers > API Keys
3. Configurer webhook endpoint: `/api/webhooks/stripe`
4. Récupérer webhook secret

### Webhooks Gérés

- ✅ `checkout.session.completed` - Payment confirmé
- ✅ `checkout.session.expired` - Session expirée
- ✅ `charge.refunded` - Remboursement
- ✅ `customer.subscription.*` - Gestion abonnements

### Test Stripe Checkout

```bash
# Créer une donation
curl -X POST http://localhost:6130/api/donate \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "test-project",
    "projectName": "Test Project",
    "amount": 10,
    "donorName": "John Doe",
    "message": "Great work!"
  }'

# Response
{
  "success": true,
  "payment": { ... },
  "checkoutUrl": "https://checkout.stripe.com/..."
}
```

## 📂 Structure

```
apps/ezpay/api/
├── src/
│   ├── models/
│   │   └── Payment.ts         # MongoDB model
│   ├── routes/
│   │   ├── donations.ts       # Donations endpoints
│   │   ├── webhooks.ts        # Stripe/PayPal webhooks
│   │   └── index.ts           # Routes aggregation
│   ├── services/
│   │   └── stripe.ts          # Stripe service
│   └── index.ts               # Server bootstrap
├── .env.example               # Template variables
└── package.json
```

## 🛠️ Technologies

- **Express.js** via `@ezstart/api-core`
- **MongoDB** via Mongoose
- **Stripe** SDK v14
- **TypeScript** with strict mode
- **Zod** schemas via `@ezstart/pay-sdk`

## 🌐 URLs

**Development:**

- API: http://localhost:6130/api
- Health: http://localhost:6130/api/health

**Production:**

- API: https://ezpay-api.onrender.com/api
- Health: https://ezpay-api.onrender.com/api/health

## 🚀 Deployment (Render)

### Build Command

```bash
pnpm install --frozen-lockfile --shamefully-hoist && pnpm turbo build --filter=api-ezpay
```

### Start Command

```bash
cd apps/ezpay/api && node dist/index.js
```

### Environment Variables (Production)

```env
NODE_ENV=production
MONGO_URL=mongodb+srv://...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
# WEB_URL is no longer needed - auto-configured via @ezstart/config
```

### Health Check Path

```
/api/health
```

## ✅ Features Status

- ✅ **Donations** - Complet avec testimonials
- ✅ **Webhooks Stripe** - Auto-confirmation
- ✅ **MongoDB Storage** - Historique complet
- ✅ **EZAuth Integration** - Link userId
- ✅ **Anonymous Support** - Checkbox anonyme
- ⏳ **Purchases** - À implémenter
- ⏳ **Subscriptions** - À implémenter
- ⏳ **Invoices** - À implémenter
- ⏳ **PayPal** - À implémenter

## 📖 Related Docs

- [EZPay SDK](../../../packages/pay-sdk/README.md)
- [EZPay Web](../web/README.md)
- [CLAUDE.md - EZPay Section](../../../CLAUDE.md#ezpay---système-de-paiement-universel-⭐-nouveau)

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

## 📝 Notes

- Port **6130** (pattern 6XX0 pour APIs)
- Prefix `/api` pour toutes les routes
- Auto-config Stripe checkout redirects
- Webhook signature verification activée
- MongoDB indexes optimisés (projectId, userId, type, status)
