## 🌐 Web Apps - Standards Next.js

### 1. Architecture Provider

**Setup standard (TOUTES les apps utilisent i18n + [locale] routing) :**

```tsx
// app/[locale]/layout.tsx
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { ThemeProvider } from '@ezstart/next-theme'
import { AuthProvider } from '@ezstart/auth-sdk'
import { ErrorBoundary } from '@ezstart/ui/components'
import { Toaster } from 'sonner'

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: { locale: string }
}) {
  const messages = await getMessages()

  return (
    <html lang={params.locale} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider messages={messages} locale={params.locale}>
          <ErrorBoundary>
            <ThemeProvider>
              <AuthProvider appName="myapp" authMode="httpOnly">
                {children}
              </AuthProvider>
            </ThemeProvider>
          </ErrorBoundary>
        </NextIntlClientProvider>
        <Toaster />
      </body>
    </html>
  )
}
```

**Ajout QueryProvider (apps data-heavy uniquement : EZBill, GreenPulse, EZStart) :**

```tsx
// Wrapper autour de ThemeProvider + AuthProvider
<QueryProvider>
  <ThemeProvider>
    <AuthProvider appName="ezbill" authMode="httpOnly">
      {children}
    </AuthProvider>
  </ThemeProvider>
</QueryProvider>
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
