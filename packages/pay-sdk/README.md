# @ezstart/pay-sdk

SDK React pour le système de paiement universel EZPay.

## 📦 Overview

`@ezstart/pay-sdk` fournit un client React complet pour intégrer les paiements, donations, abonnements et factures dans n'importe quelle application du monorepo @ezstart.

## 🎯 Features

- ✅ **Client TypeScript** avec auto-configuration dev/prod
- ✅ **Provider React** avec state management Zustand
- ✅ **Hooks** (`usePay`, `useDonations`)
- ✅ **Composants UI** prêts à l'emploi (DonateButton, DonateModal, DonationWall)
- ✅ **Types Zod** pour validation et OpenAPI
- ✅ **Support SSR** Next.js
- ✅ **Link EZAuth** automatique

## 📥 Installation

```bash
# Dans une app du monorepo
pnpm add @ezstart/pay-sdk
```

```json
// package.json
{
  "dependencies": {
    "@ezstart/pay-sdk": "workspace:*"
  }
}
```

## 🚀 Quick Start

### 1. Configuration Client

```typescript
// src/lib/pay-client.ts
import { createPayClient } from '@ezstart/pay-sdk'

export const payClient = createPayClient({
  appName: 'your-app-name', // 'tower-defense', 'fengshui', etc.
})
```

### 2. Provider Setup

```tsx
// src/app/layout.tsx
import { PayProvider } from '@ezstart/pay-sdk'
import { payClient } from '@/lib/pay-client'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <PayProvider client={payClient}>
          {children}
        </PayProvider>
      </body>
    </html>
  )
}
```

### 3. Utilisation des Composants

```tsx
import { DonateModal, DonationWall } from '@ezstart/pay-sdk'
import { useAuth } from '@ezstart/auth-sdk'

export default function DonatePage() {
  const { user } = useAuth()

  return (
    <div>
      <h1>Support Our Project</h1>

      {/* Modal de donation */}
      <DonateModal
        projectId="your-project"
        projectName="Your Project Name"
        amounts={[5, 10, 25, 50]}
        userId={user?._id}
        userEmail={user?.email}
        userName={user?.username}
      />

      {/* Mur de testimonials */}
      <DonationWall projectId="your-project" limit={9} />
    </div>
  )
}
```

## 🎨 Composants Disponibles

### Donations

**DonateButton**
```tsx
import { DonateButton } from '@ezstart/pay-sdk'

<DonateButton onClick={() => console.log('Donate clicked')}>
  ❤️ Support Us
</DonateButton>
```

**DonateModal**
```tsx
import { DonateModal } from '@ezstart/pay-sdk'

<DonateModal
  projectId="tower-defense"
  projectName="Tower Defense"
  amounts={[5, 10, 25, 50, 100]}  // Montants prédéfinis
  userId={user?._id}               // EZAuth user ID (optional)
  userEmail={user?.email}          // Pre-fill email (optional)
  userName={user?.username}        // Pre-fill name (optional)
/>
```

**DonationWall**
```tsx
import { DonationWall } from '@ezstart/pay-sdk'

<DonationWall
  projectId="tower-defense"  // Filter par projet (optional)
  limit={12}                 // Nombre de donations à afficher
/>
```

## 🪝 Hooks

### usePay

Hook principal avec toutes les méthodes de paiement.

```tsx
import { usePay } from '@ezstart/pay-sdk'

function MyComponent() {
  const { createDonation, createPurchase, createSubscription, isLoading, error } = usePay()

  const handleDonate = async () => {
    const result = await createDonation({
      projectId: 'my-project',
      amount: 10,
      message: 'Great work!',
    })

    // Redirect to Stripe checkout
    window.location.href = result.checkoutUrl
  }

  return <button onClick={handleDonate}>Donate $10</button>
}
```

### useDonations

Hook spécialisé pour charger les donations.

```tsx
import { useDonations } from '@ezstart/pay-sdk'

function DonationsList() {
  const { donations, isLoading, error, reload } = useDonations({
    projectId: 'my-project',
    limit: 10,
    autoLoad: true,
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      {donations.map(donation => (
        <div key={donation.id}>
          {donation.customerName} donated ${donation.amount}
        </div>
      ))}
    </div>
  )
}
```

## 📖 API Reference

### Client Methods

```typescript
const client = createPayClient({ appName: 'my-app' })

// Donations
await client.createDonation(data: CreateDonationRequest): Promise<PaymentResponse>
await client.getDonations(params?: { projectId?: string, limit?: number }): Promise<PaymentsListResponse>
await client.getDonationStats(projectId?: string): Promise<StatsResponse>

// Purchases
await client.createPurchase(data: CreatePurchaseRequest): Promise<PaymentResponse>
await client.getPurchases(params?: { userId?: string, limit?: number }): Promise<PaymentsListResponse>

// Subscriptions
await client.createSubscription(data: CreateSubscriptionRequest): Promise<PaymentResponse>
await client.getSubscriptions(userId: string): Promise<PaymentsListResponse>
await client.cancelSubscription(subscriptionId: string): Promise<{ success: boolean }>

// General
await client.getPayment(paymentId: string): Promise<Payment>
```

### Types

```typescript
interface CreateDonationRequest {
  projectId: string
  amount: number
  currency?: string
  message?: string
  isPublic?: boolean
  isAnonymous?: boolean
  userId?: string
  donorName?: string
  donorEmail?: string
}

interface Payment {
  id: string
  projectId: string
  projectName: string
  type: 'donation' | 'purchase' | 'subscription' | 'invoice'
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled'
  userId?: string
  customerName?: string
  customerEmail?: string
  isAnonymous: boolean
  metadata?: Record<string, any>
  createdAt: string
  completedAt?: string
}
```

## 🔧 Configuration

Le client se configure automatiquement selon l'environnement :

**Development:**
- API: `http://localhost:5040/api`
- Web: `http://localhost:5045`

**Production:**
- API: `https://ezpay-api.onrender.com/api`
- Web: `https://ezpay.vercel.app`

Pour override la configuration :

```typescript
const client = createPayClient({
  appName: 'my-app',
  baseURL: 'https://custom-api.com/api', // Override API URL
})
```

## 🔗 Applications Utilisant ce Package

- ✅ **Feng Shui** - Page donations avec modal et wall
- ⏳ **Tower Defense** - Donations + achats in-app (à venir)
- ⏳ **EZStart** - Donations (à venir)
- ⏳ **EZBill** - Integration factures (à venir)

## 📚 Related Packages

- `@ezstart/ui` - Composants UI (Button, Dialog, Input, etc.)
- `@ezstart/auth-sdk` - Authentification EZAuth
- `@ezstart/next-theme` - Theme provider Next.js
- `@ezstart/express-core` - Infrastructure API backend

## 🔗 Links

- [EZPay API](../../apps/ezpay/api)
- [EZPay Web Dashboard](../../apps/ezpay/web)
- [CLAUDE.md - EZPay Section](../../CLAUDE.md#ezpay---système-de-paiement-universel-⭐-nouveau)

## 🛠️ Development

```bash
# Build
pnpm build

# Watch mode
pnpm dev

# Type check
pnpm typecheck
```

## 📝 Notes

- Ce package nécessite React 18+ et Next.js 15+
- Les composants utilisent `@ezstart/ui` pour le styling
- Compatible SSR Next.js (usePayStoreSSR disponible)
- Auto-configuration dev/prod sans variables d'environnement
