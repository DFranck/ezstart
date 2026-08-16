import { getTimeZoneFromLocale } from '@/i18n/routing'
import { Providers } from '@/providers/providers'
import { getServerAuth } from '@ezstart/auth-sdk/server'
import { createJsonLd } from '@ezstart/seo-config/json-ld'
import { createMetadata, createViewport } from '@ezstart/seo-config/metadata'
import { ErrorBoundary, Toaster } from '@ezstart/ui/components'
import '@ezstart/ui/globals.css'
import { getMessages } from 'next-intl/server'
import { Gugi, K2D } from 'next/font/google'
import { headers } from 'next/headers'
import Script from 'next/script'
import ClientLayout from './client-layout'
import { faqSchema, organizationSchema, softwareApplicationSchema, websiteSchema } from './schemas'

const gugi = Gugi({ weight: '400', subsets: ['latin'], variable: '--font-gugi' })
const k2d = K2D({
  weight: ['300', '400', '600', '700'],
  subsets: ['latin'],
  variable: '--font-k2d',
})

export const metadata = createMetadata({
  appName: 'GreenPulse.AI',
  description:
    'AI-powered ESG compliance platform for Southeast Asian SMEs. Reduce costs by 30%, access green finance, and meet export standards with automated GRI, SFDR, CSRD reporting.',
  domain: 'https://www.ai-greenpulse.com',
  keywords: [
    'ESG compliance',
    'SME sustainability',
    'green finance',
    'Southeast Asia',
    'carbon tracking',
    'sustainable business',
    'AI ESG platform',
    'GRI reporting',
    'CSRD',
    'Vietnam green banking',
  ],
  themeColor: '#10b981',
  ogImage: 'https://www.ai-greenpulse.com/logo.png',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
})

export const viewport = createViewport('#10b981')

const jsonLd = createJsonLd({
  appName: 'GreenPulse.AI',
  description:
    'AI-powered ESG compliance platform for Southeast Asian SMEs. Automated sustainability reporting, carbon tracking, and green finance readiness.',
  url: 'https://www.ai-greenpulse.com',
  applicationCategory: 'BusinessApplication',
})

interface RootLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function RootLayout({ children, params }: RootLayoutProps) {
  const { locale } = await params
  const messages = await getMessages()
  const timeZone = getTimeZoneFromLocale(locale)

  // SSR auth bootstrap (Clerk-style) — kills the LoginButton flash. Reads the
  // session cookie from the inbound request, resolves the user via
  // `/api/auth/me` server-side, and seeds the Zustand store synchronously when
  // `<AuthProvider>` mounts (via `initialUser`). Anonymous requests still
  // work: returns `null`. Phase A1 ENV-DIET (2026-05-05) — `apiUrl` is
  // OPTIONAL: SDK helper falls back to `NEXT_PUBLIC_EZAUTH_API_URL` then the
  // shipped production default.
  const headersList = await headers()
  const cookieHeader = headersList.get('cookie')
  const initialUser = await getServerAuth({ cookieHeader })

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      data-app="green-pulse"
      className={`${gugi.variable} ${k2d.variable}`}
    >
      <body className="font-k2d">
        <Script
          id="json-ld-app"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Script
          id="json-ld-organization"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <Script
          id="json-ld-website"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <Script
          id="json-ld-software"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }}
        />
        <Script
          id="json-ld-faq"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
        <ErrorBoundary title="Something went wrong in GreenPulse">
          <Providers
            messages={messages}
            locale={locale}
            timeZone={timeZone}
            enableThemeSelector={true}
            initialUser={initialUser}
          >
            <ClientLayout>{children}</ClientLayout>
          </Providers>
        </ErrorBoundary>
        <Toaster />
      </body>
    </html>
  )
}
