## 🌐 Web Apps - Standards Next.js

## Légende des priorités

- **🔴 P0** : non-négociable. Tout item ici sans annotation est P0.
- **🟠 P1 / V1** : nécessaire dans 3 mois post-launch
- **🟡 P2 / V2** : pro polish
- **⚡ QW** : Quick Win

Voir `standard.md` "Système de priorisation" pour le pattern complet, et `standard-saas-perf.md` pour les optimisations performance Next.js détaillées.

### 1. Architecture Provider — SSR-FIRST OBLIGATOIRE

**Règle dure :** TOUT provider qui hydrate un état "remote" (auth user, locale messages, theme preference, feature flags, key config, etc.) DOIT être bootstrappé côté serveur via une `initialXxx` prop. Aucune exception. Le client `useEffect` async-fetch est INTERDIT comme source primaire — c'est uniquement un fallback de revalidation post-hydration.

**Pourquoi :** sans SSR bootstrap, le premier paint affiche l'état par défaut (`isAuthenticated: false`, theme = light, etc.) puis remplace après l'async fetch → **flash visible** (LoginButton → UserMenu, light → dark, EN → FR). C'est le défaut #1 qui distingue un SaaS amateur d'un SaaS pro (Stripe / Clerk / Vercel n'ont JAMAIS ce flash).

**Setup standard (TOUTES les apps) :**

```tsx
// app/[locale]/layout.tsx — Server Component (async)
import { headers } from 'next/headers'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { getServerAuth } from '@ezstart/auth-sdk/server'
import { resolveSsrTheme } from '@ezstart/ui/theme/server' // ou helper local
import { ErrorBoundary, Toaster } from '@ezstart/ui/components'
import { Providers } from '@/components/providers'

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params
  const headersList = await headers()
  const cookieHeader = headersList.get('cookie') ?? undefined

  // SSR bootstrap — TOUTES les sources remote lues server-side AVANT le render
  const [messages, initialUser, ssrTheme] = await Promise.all([
    getMessages(),
    getServerAuth({ apiUrl: process.env.NEXT_PUBLIC_EZAUTH_API_URL!, cookieHeader }),
    resolveSsrTheme(headersList),
  ])

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={ssrTheme === 'dark' ? 'dark' : undefined}
    >
      <body>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <ErrorBoundary>
            <Providers initialUser={initialUser} initialTheme={ssrTheme}>
              {children}
            </Providers>
          </ErrorBoundary>
        </NextIntlClientProvider>
        <Toaster />
      </body>
    </html>
  )
}
```

```tsx
// components/providers.tsx — Client wrapper qui forward les initial props
'use client'
import { ThemeProvider } from '@ezstart/ui/theme'
import { AuthProvider, type AuthUser } from '@ezstart/auth-sdk'

export function Providers({ children, initialUser, initialTheme }: Props) {
  return (
    <ThemeProvider initialTheme={initialTheme}>
      <AuthProvider appName="myapp" authMode="httpOnly" initialUser={initialUser}>
        {children}
      </AuthProvider>
    </ThemeProvider>
  )
}
```

**Checklist SSR-first par provider :**

- [ ] **AuthProvider** : `initialUser` prop bootstrap depuis `getServerAuth()` côté server layout
- [ ] **ThemeProvider** : `<html className=...>` injecté server-side via cookie/header (kill FOWT — Flash of Wrong Theme)
- [ ] **NextIntlClientProvider** : `messages` lu via `getMessages()` server-side (déjà OK par défaut next-intl)
- [ ] **PayProvider** (si présent) : `initialKeyConfig` ou `initialPlans` bootstrap si l'UI dépend de ça au premier paint
- [ ] **Tout futur provider** qui a un état "remote" → `initialXxx` prop OBLIGATOIRE + helper SSR companion exporté depuis `@ezstart/<sdk>/server`

**Pattern SDK (chaque SDK ship son `/server` entry point) :**

```
packages/<sdk>/src/
├── core/        # agnostique
├── react/       # 'use client' Provider + hooks
├── server/      # 'server-only' SSR bootstrap helpers ← NOUVEAU layer
└── components/  # 'use client' UI
```

`server/` exporte `getServer<Domain>()` qui prend cookie/header + apiUrl, fait l'appel REST, retourne le state initial typé. Zero React, server-only (`import 'server-only'` au top du fichier).

**Ajout QueryProvider (apps data-heavy uniquement : EZBill, GreenPulse, EZStart) :**

```tsx
// Wrapper externe au stack SSR ci-dessus
<QueryProvider>
  <Providers initialUser={initialUser} initialTheme={ssrTheme}>
    {children}
  </Providers>
</QueryProvider>
```

**Anti-patterns INTERDITS :**

- ❌ `<AuthProvider>` sans `initialUser` quand `authMode="httpOnly"` (cookie lisible SSR → flash gratuit)
- ❌ `useEffect(() => { fetch('/me').then(setUser) }, [])` comme source primaire d'auth state
- ❌ `<html>` sans `className` SSR pour le theme quand le user a une préférence cookie/header connue
- ❌ `if (!mounted) return null` pour cacher un provider en attendant l'hydration → workaround d'amateur, fix la racine (SSR bootstrap)

### 1.1 `mounted` guard — anti-pattern qui détruit le SSR

- [ ] 🔴 P0 : **INTERDIT** : `const [mounted, setMounted] = useState(false); useEffect(() => setMounted(true), []); if (!mounted) return <Skeleton/>` — ce pattern jette TOUT le HTML SSR et force un skeleton flash sur CHAQUE page load. Avec un `<AuthProvider>` SSR-bootstrappé via `initialUser` (cf. §1), le state est correct au 1er render — pas de mismatch à craindre.

**Exception légitime** (rare) : composant qui dépend STRICTEMENT d'une browser API non-SSR (`window.matchMedia`, `IndexedDB`, `prefers-color-scheme` runtime). Dans ce cas justifier en commentaire `// mounted guard required: <browser API>` au-dessus du useState.

```tsx
// ❌ INTERDIT — détruit le SSR, force un skeleton flash
function EZAuthDashboard() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <DashboardSkeleton />
  return <DashboardContent />
}

// ✅ BON — SSR bootstrap via initialUser, no mounted needed
function EZAuthDashboard({ initialUser }: Props) {
  const user = useAuthStore(s => s.user) ?? initialUser
  if (!user) return <RequireAuthLoader />
  return <DashboardContent user={user} />
}

// ✅ EXCEPTION justifiée
function ResponsiveChart() {
  // mounted guard required: window.matchMedia not available in SSR
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  const isMobile = window.matchMedia('(max-width: 768px)').matches
  return <Chart variant={isMobile ? 'compact' : 'full'} />
}
```

### 1.2 `getServer<X>()` companion mandatory

- [ ] 🔴 P0 : Tout SDK component qui fetch des données runtime (api keys, audit log, plans, applications, user settings) DOIT avoir un helper `getServer<X>({ apiUrl, cookieHeader })` exporté depuis `@ezstart/<sdk>/server`. Le composant accepte `initial<X>` prop pour bootstrap SSR. Sans ça, le composant fait un fetch client-only après mount → flash skeleton garanti. (cf. `standard-sdk-dx.md` §11sexies pour le pattern complet)
- [ ] 🔴 P0 : `import 'server-only'` au top de chaque fichier `packages/<sdk>/src/server/*.ts`
- [ ] 🔴 P0 : `package.json` exports inclut `./server` entry point séparé
- [ ] 🟠 P1 : Backport sur les SDK existants (auth-sdk done, pay-sdk pending, ai-sdk pending)

### 1.3 Audit grep — SSR-first violations

```bash
# mounted guard pattern (justifier ou supprimer)
grep -rnE "useState\(false\).*mounted|setMounted\(true\)|if \(!mounted\)" packages/ apps/ --include="*.tsx" --include="*.ts"

# AuthProvider sans initialUser
grep -rn "<AuthProvider" apps/ --include="*.tsx" | grep -v "initialUser"

# useEffect fetch as primary source (SSR violation)
grep -rnE "useEffect\(\(\) => \{[^}]*fetch\(" packages/ apps/ --include="*.tsx" --include="*.ts" -A 3

# SDK server entry point exists
ls packages/*/src/server/ 2>/dev/null
```

### 2. Configuration Centralisée

**TOUTES les apps DOIVENT utiliser :**

- ✅ `tailwind.config.js` → `@ezstart/tailwind-config/base.js`
- ✅ `postcss.config.mjs` → `@ezstart/ui/postcss.config`
- ✅ `eslint.config.js` → `@ezstart/eslint-config/next-js`
- ✅ `tsconfig.json` → `@ezstart/typescript-config/nextjs.json`
- ✅ CSS globals : `@import "@ezstart/ui/globals.css"`

### 3. Scripts Standardisés

```json
{
  "scripts": {
    "dev": "node ../../../packages/config/bin/dev-server.js",
    "build": "pnpm --filter @ezstart/ui --filter @ezstart/auth-sdk build && next build",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  }
}
```

### 4. Vercel Deployment

**vercel.json obligatoire :**

```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": ".next",
  "installCommand": "pnpm install --frozen-lockfile",
  "framework": "nextjs"
}
```

### 5. i18n — règles complètes

Couvre Next.js + next-intl. Cf. [`ui.md`](./ui.md) section 7 pour la règle "tout texte user-facing traduit".

- [ ] 🔴 P0 : `messages/en/*.json` + `messages/fr/*.json` minimum (next-intl)
- [ ] 🔴 P0 : Routing `[locale]` configuré + middleware
- [ ] 🔴 P0 : Tous les `<Link>` depuis `@/i18n/navigation` (jamais `next/link`) — enforced via eslint
- [ ] 🔴 P0 ⚡QW : Pluralization, dates, currency via `Intl` API (`new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' })`) — JAMAIS string concat (audit grep, 1-2h)
- [ ] 🟠 P1 ⚡QW : `hreflang` tags dans `<head>` pour SEO multi-langue (15min — Next.js metadata `alternates.languages`)
- [ ] 🟠 P1 : Server-side locale detection — `Accept-Language` header → bonne locale par défaut (pas toujours `en`) (1 jour middleware)
- [ ] 🟠 P1 : Locale persistante via cookie après premier choix utilisateur (1 jour)
- [ ] 🟡 P2 : Date relative (`il y a 3 minutes`) via `Intl.RelativeTimeFormat` (1h)
- [ ] 🟡 P2 : Number compact (`1.2k`, `3.4M`) via `Intl.NumberFormat(notation: 'compact')` (15min)
- [ ] 🟢 P3 : RTL support (Arabic, Hebrew) — `dir="rtl"` + Tailwind `rtl:` modifier (1-2 semaines)
- [ ] 🟢 P3 : Dynamic locale loading (chunked messages au lieu d'un gros JSON) (1 semaine)

**Anti-patterns** :

- ❌ `'You have ' + count + ' items'` — utiliser `t('items', { count })` avec `{count, plural, ...}` ICU
- ❌ `'$' + price` — utiliser `Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' })`
- ❌ `new Date().toLocaleDateString()` sans passer la locale active
