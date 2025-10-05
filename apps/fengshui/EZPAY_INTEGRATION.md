# EZPay Integration dans Feng Shui

## ✅ Intégration Complète

L'intégration EZPay est maintenant active dans Feng Shui !

### 🎯 Ce qui a été fait

1. **Dépendance ajoutée** : `@ezstart/pay-sdk` dans `package.json`
2. **Client configuré** : `src/lib/pay-client.ts`
3. **Provider ajouté** : `PayProvider` dans le layout
4. **Page donations créée** : `/donate` avec modal et wall

### 📂 Fichiers Modifiés

```
apps/fengshui/web/
├── package.json                        ← Ajout @ezstart/pay-sdk
├── src/
│   ├── lib/
│   │   └── pay-client.ts               ← ✨ NOUVEAU - Config client
│   ├── app/[locale]/
│   │   ├── layout.tsx                  ← PayProvider ajouté
│   │   └── donate/
│   │       └── page.tsx                ← ✨ NOUVEAU - Page donations
```

### 🔧 Configuration

**Client Pay** (`src/lib/pay-client.ts`):
```typescript
import { createPayClient } from '@ezstart/pay-sdk'

export const payClient = createPayClient({
  appName: 'fengshui',
})
```

**Provider** (`src/app/[locale]/layout.tsx`):
```tsx
import { PayProvider } from '@ezstart/pay-sdk'
import { payClient } from '@/lib/pay-client'

<PayProvider client={payClient}>
  <ClientLayout>{children}</ClientLayout>
</PayProvider>
```

### 🎨 Page Donations (`/donate`)

La page `/donate` contient :
- ✅ **DonateModal** - Modal de donation avec montants prédéfinis
- ✅ **DonationWall** - Mur de testimonials publics
- ✅ **Link EZAuth** - Si user connecté, nom/email pré-remplis
- ✅ **Support anonyme** - Checkbox pour donations anonymes

### 🚀 Utilisation

**Visiter la page :**
```
http://localhost:5065/donate
```

**Utiliser les composants ailleurs :**
```tsx
import { DonateModal, DonationWall } from '@ezstart/pay-sdk'

// Modal simple
<DonateModal projectId="fengshui" projectName="Feng Shui Bagua" />

// Mur de dons (sidebar, footer, etc.)
<DonationWall projectId="fengshui" limit={5} />
```

### 🔐 Variables d'Environnement

Pour utiliser en dev, créer `.env.local` :
```env
# EZPay API est déjà configuré automatiquement
# http://localhost:5040/api (dev)
# https://ezpay-api.onrender.com/api (prod)
```

### ✨ Features Disponibles

- ✅ Donations avec montants prédéfinis (5€, 10€, 25€, 50€, 100€)
- ✅ Montant custom
- ✅ Message testimonial (max 500 caractères)
- ✅ Support anonyme
- ✅ Link avec compte EZAuth
- ✅ Affichage public des donations
- ✅ Redirection Stripe checkout
- ✅ Webhooks Stripe (confirmation automatique)

### 📊 Prochaines Étapes

Pour activer les donations en production :
1. Configurer Stripe (clés API)
2. Lancer API EZPay (`pnpm dev:pay`)
3. Tester le flow complet
4. Déployer API sur Render
5. Configurer webhooks Stripe

### 🎯 Exemple Complet

```tsx
'use client'

import { DonateModal, DonationWall } from '@ezstart/pay-sdk'
import { useAuth } from '@ezstart/auth-sdk'

export default function DonatePage() {
  const { user } = useAuth()

  return (
    <div className="container">
      <h1>Support Feng Shui</h1>

      {/* Modal de donation */}
      <DonateModal
        projectId="fengshui"
        projectName="Feng Shui Bagua"
        amounts={[5, 10, 25, 50, 100]}
        userId={user?._id}
        userEmail={user?.email}
        userName={user?.username}
      />

      {/* Mur de testimonials */}
      <DonationWall projectId="fengshui" limit={12} />
    </div>
  )
}
```

### 🔗 Documentation Complète

- [EZPay README](../../../apps/ezpay/README.md)
- [CLAUDE.md - Section EZPay](../../../CLAUDE.md#ezpay---système-de-paiement-universel-⭐-nouveau)
