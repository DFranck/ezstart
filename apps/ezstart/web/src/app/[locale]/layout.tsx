import { Providers } from '@/components/providers'
import { getTimeZoneFromLocale, routing } from '@/i18n/routing'
import { generateOrganizationSchema } from '@ezstart/seo-config'
import {
  createEnhancedMetadata,
  createEnhancedViewport,
} from '@ezstart/seo-config/metadata-enhanced'
import { ErrorBoundary, Toaster } from '@ezstart/ui/components'
import '@ezstart/ui/globals.css'
import { Analytics } from '@vercel/analytics/next'
import { hasLocale } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { Geist, Geist_Mono } from 'next/font/google'
import { notFound } from 'next/navigation'
import Script from 'next/script'
import ClientLayout from './client-layout'

// ✅ NOUVEAU - Utilise les données riches de docs/seo/01-EZSTART-DEEP-DIVE.md
// via packages/seo-config/src/apps/ezstart.ts
export const metadata = createEnhancedMetadata({
  app: 'ezstart',
  themeColor: '#000000',
  ogImage: 'https://www.ezstart.xyz/og-image.svg',
})
// Ceci charge AUTOMATIQUEMENT:
// - seoData.shortDescription (ou longDescription pour landing)
// - seoData.keywords.primary + secondary + longTail
// - seoData.appName
// - Open Graph complet
// - Twitter Cards

export const viewport = createEnhancedViewport('#000000')

// ✅ NOUVEAU - Schema.org Organization depuis SEO config
const jsonLd = generateOrganizationSchema('ezstart')

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }))
}

const fontSans = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
})

const fontMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export default async function LocaleLayout(props: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { children, params } = props
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const messages = await getMessages()
  const timeZone = getTimeZoneFromLocale(locale)

  return (
    <html lang={locale} suppressHydrationWarning data-app="ezstart">
      <head>
        <meta name="application-name" content="EZStart" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="EZStart" />
        <meta name="description" content="EZStart - Plateforme de développement web moderne" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/icons/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#000000" />

        <link rel="apple-touch-icon" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-152x152.png" />

        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16x16.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#000000" />
        <link rel="shortcut icon" href="/favicon.ico" />
      </head>
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased flex flex-col min-h-screen`}
      >
        {/* Vercel Analytics - Free with Vercel hosting */}
        <Analytics />
        <Script
          id="json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ErrorBoundary title="Something went wrong in EZStart">
          <Providers messages={messages} locale={locale} timeZone={timeZone}>
            <ClientLayout>{children}</ClientLayout>
          </Providers>
        </ErrorBoundary>
        <Toaster />
      </body>
    </html>
  )
}
