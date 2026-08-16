import { QueryProvider } from '@/providers/query-provider'
import { AuthProvider } from '@ezstart/auth-sdk'
import { getServerAuth } from '@ezstart/auth-sdk/server'
import { ThemeProvider } from '@ezstart/ui/theme'
import { createJsonLd } from '@ezstart/seo-config/json-ld'
import { createMetadata, createViewport } from '@ezstart/seo-config/metadata'
import { ErrorBoundary, Div } from '@ezstart/ui/components'
import '@ezstart/ui/globals.css'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { Geist } from 'next/font/google'
import { headers } from 'next/headers'
import Script from 'next/script'
import { ReactNode } from 'react'
import { Toaster } from 'sonner'
import ProtectedVersionSwitch from './protected-version-switch'

const fontSans = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata = createMetadata({
  appName: 'EZ Billing',
  description: 'Simple and efficient billing management for businesses',
  domain: 'https://ezbill-web.vercel.app',
  keywords: ['billing', 'invoices', 'clients', 'payments', 'business'],
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
})

export const viewport = createViewport('#3B82F6')

const jsonLd = createJsonLd({
  appName: 'EZBill',
  description: 'Simple and efficient billing management for businesses',
  url: 'https://ezbill-web.vercel.app',
  applicationCategory: 'BusinessApplication',
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
  // `initialUser`). Anonymous requests still work: returns `null`.
  const headersList = await headers()
  const cookieHeader = headersList.get('cookie')
  // Phase A1 ENV-DIET (2026-05-05) — `apiUrl` is OPTIONAL: when omitted, the
  // SDK helper falls back to `process.env.NEXT_PUBLIC_EZAUTH_API_URL`, then
  // to the shipped production default (`https://ezauth-api.ezstart.xyz`).
  const initialUser = await getServerAuth({ cookieHeader })

  return (
    <html lang={locale} suppressHydrationWarning data-app="ezbill">
      <body className={`${fontSans.variable} font-sans antialiased`}>
        <Script
          id="json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <NextIntlClientProvider messages={messages}>
          <Div className="flex flex-col min-h-screen">
            <ErrorBoundary>
              <QueryProvider>
                <ThemeProvider>
                  <AuthProvider
                    appName="ezbill"
                    authMode="httpOnly"
                    // Phase A1 ENV-DIET (2026-05-05) — `apiUrl` is OPTIONAL in
                    // production (SDK ships `https://ezauth-api.ezstart.xyz` as
                    // a hardcoded default). The prop is still threaded so dev /
                    // staging consumers can override via
                    // `NEXT_PUBLIC_EZAUTH_API_URL` in their `.env.local`.
                    // `webUrl` is auto-resolved from `/keys/config.webUrl`.
                    apiUrl={process.env.NEXT_PUBLIC_EZAUTH_API_URL}
                    publishableKey={process.env.NEXT_PUBLIC_EZAUTH_KEY}
                    initialUser={initialUser}
                  >
                    {children}
                    <ProtectedVersionSwitch />
                  </AuthProvider>
                </ThemeProvider>
              </QueryProvider>
            </ErrorBoundary>
            <Toaster />
          </Div>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
