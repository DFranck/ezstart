import { AuthProvider } from '@ezstart/auth-sdk'
import { getServerAuth } from '@ezstart/auth-sdk/server'
import { ThemeProvider } from '@ezstart/ui/theme'
import { PayProvider } from '@ezstart/pay-sdk'
import { ErrorBoundary, Toaster } from '@ezstart/ui/components'
import { QueryProvider } from '@/providers/query-provider'
import '@ezstart/ui/globals.css'
import { cn } from '@ezstart/ui/lib'
import { createMetadata, createViewport } from '@ezstart/seo-config/metadata'
import { createJsonLd } from '@ezstart/seo-config/json-ld'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { Inter } from 'next/font/google'
import { headers } from 'next/headers'
import Script from 'next/script'
import ClientLayout from './client-layout'

const inter = Inter({ subsets: ['latin'] })

export const metadata = createMetadata({
  appName: 'Feng Shui 2026 ~ Guide Complet Année du Cheval de Feu Yang',
  description:
    'Analyse Feng Shui 2026 gratuite : étoiles volantes Xuan Kong, remèdes personnalisés secteur par secteur et PDF haute résolution. Année du Cheval de Feu Yang (Bing Wu) ~ optimisez chaque zone de votre habitat pour améliorer santé, prospérité et relations.',
  domain: 'https://ezfengshui.vercel.app',
  keywords: [
    'feng shui 2026',
    'étoile volante 2026',
    'flying stars 2026',
    'analyse feng shui',
    'feng shui maison 2026',
    'feng shui gratuit',
    'remèdes feng shui',
    'cures feng shui 2026',
    'année du cheval de feu',
    'feng shui période 9',
    'xuan kong 2026',
    'fei xing 2026',
    'feng shui enhancers',
    'yang fire horse feng shui',
  ],
  themeColor: '#D4A017',
  ogImage: 'https://ezfengshui.vercel.app/logo.png',
  icons: {
    icon: [
      { url: '/logo-dark.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192x192.png', type: 'image/png', sizes: '192x192' },
    ],
    shortcut: '/icons/icon-96x96.png',
    apple: '/icons/icon-152x152.png',
  },
})

export const viewport = createViewport('#D4A017')

const jsonLd = createJsonLd({
  appName: 'Feng Shui 2026 ~ Guide Complet Année du Cheval de Feu Yang',
  description:
    'Analyse Feng Shui 2026 gratuite : étoiles volantes Xuan Kong, remèdes personnalisés secteur par secteur et PDF haute résolution. Année du Cheval de Feu Yang ~ optimisez chaque zone de votre habitat.',
  url: 'https://ezfengshui.vercel.app',
  applicationCategory: 'LifestyleApplication',
})

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
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
    <html lang={locale} suppressHydrationWarning data-app="fengshui">
      <body className={cn(inter.className, 'min-h-screen flex flex-col')}>
        <Script
          id="json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <NextIntlClientProvider messages={messages}>
          <ErrorBoundary title="Something went wrong in FengShui">
            <QueryProvider>
              <ThemeProvider>
                <AuthProvider
                  appName="fengshui"
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
                  <PayProvider
                    appName="fengshui"
                    // Same precedence for pay-sdk: SDK ships
                    // `https://ezpay-api.ezstart.xyz` default.
                    config={{ apiUrl: process.env.NEXT_PUBLIC_EZPAY_API_URL }}
                    publishableKey={process.env.NEXT_PUBLIC_EZPAY_KEY}
                    locale={locale}
                  >
                    <ClientLayout>{children}</ClientLayout>
                  </PayProvider>
                </AuthProvider>
              </ThemeProvider>
            </QueryProvider>
          </ErrorBoundary>
        </NextIntlClientProvider>
        <Toaster />
      </body>
    </html>
  )
}
