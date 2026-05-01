import { createMetadata, createViewport } from '@ezstart/seo-config/metadata'
import { createJsonLd } from '@ezstart/seo-config/json-ld'
import { ErrorBoundary, Toaster } from '@ezstart/ui/components'
import { getServerAuth } from '@ezstart/auth-sdk/server'
import { AppShell } from '@/components/app-shell'
import { Providers } from './providers'
import '@ezstart/ui/globals.css'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { headers } from 'next/headers'
import Script from 'next/script'
import { ReactNode } from 'react'

export const metadata = createMetadata({
  appName: 'EZPay',
  description: 'Universal payment system for donations, purchases, and subscriptions',
  domain: 'https://ezpay.vercel.app',
  keywords: ['payment', 'donations', 'subscriptions', 'stripe', 'ezstart'],
  themeColor: '#10B981',
})

export const viewport = createViewport('#10B981')

const jsonLd = createJsonLd({
  appName: 'EZPay',
  description: 'Universal payment system for donations, purchases, and subscriptions',
  url: 'https://ezpay.vercel.app',
  applicationCategory: 'FinanceApplication',
})

type Props = {
  children: ReactNode
  params: Promise<{ locale: string }>
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params
  const messages = await getMessages()

  // SSR auth bootstrap (Clerk-style) — kills the LoginButton flash in
  // httpOnly mode. Reads the session cookie from the inbound request,
  // resolves the user via `/api/auth/me` server-side, and seeds the
  // Zustand store synchronously when `<AuthProvider>` mounts (via
  // `initialUser`). The first paint of `<UserMenu>` / `<LoginButton>` /
  // `<RequireAuth>` then reflects the right state — no async client-side
  // gap during which the store defaults to `isAuthenticated: false`.
  // Anonymous requests still work: `getServerAuth()` returns `null`.
  const headersList = await headers()
  const cookieHeader = headersList.get('cookie')
  const initialUser = await getServerAuth({
    apiUrl: process.env.NEXT_PUBLIC_EZAUTH_API_URL ?? 'http://localhost:6110',
    cookieHeader,
  })

  return (
    <html lang={locale} suppressHydrationWarning data-app="ezpay">
      <body className="min-h-screen">
        <Script
          id="json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <NextIntlClientProvider messages={messages}>
          <ErrorBoundary title="Something went wrong in EZPay">
            <Providers initialUser={initialUser}>
              <AppShell>{children}</AppShell>
            </Providers>
          </ErrorBoundary>
        </NextIntlClientProvider>
        <Toaster />
      </body>
    </html>
  )
}
