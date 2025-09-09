# @ezstart/web-core

Infrastructure web partagée pour les projets EZStart.

## Concept

Ce package standardise :
- ✅ Providers EZAuth + NextThemes  
- ✅ Configuration i18n next-intl
- ✅ Middleware standard
- ✅ Messages de base fr/en

## Usage simple

```tsx
// Dans votre layout.tsx ou _app.tsx
import { SimpleWebProviders } from '@ezstart/web-core'

export default function RootLayout({ children }) {
  return (
    <SimpleWebProviders appName="ez-billing">
      {children}
    </SimpleWebProviders>
  )
}
```

## Usage avec i18n

```tsx
// Dans votre layout.tsx avec i18n
import { WebProviders } from '@ezstart/web-core'
import { getMessages } from 'next-intl/server'

export default async function RootLayout({ children, params }) {
  const messages = await getMessages()
  
  return (
    <WebProviders 
      appName="ez-billing"
      messages={messages}
      locale={params.locale}
      timeZone="Europe/Paris"
    >
      {children}
    </WebProviders>
  )
}
```

## À venir

- Config next-intl complète
- Hooks partagés
- Composants UI communs

## Structure standardisée

Toutes les web apps ont maintenant :
- ✅ EZAuth (SSO automatique)
- ✅ NextThemes (dark/light mode)
- ✅ Configuration cohérente
- ✅ Messages i18n de base