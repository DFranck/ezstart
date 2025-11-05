import { Providers } from '@/components/providers'
import { getTimeZoneFromLocale, routing } from '@/i18n/routing'
import { Toaster, ErrorBoundary } from '@ezstart/ui/components'
import '@ezstart/ui/globals.css'
import { createMetadata, createViewport } from '@ezstart/seo-config/metadata'
import { createJsonLd } from '@ezstart/seo-config/json-ld'
import { hasLocale } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { Geist, Geist_Mono } from 'next/font/google'
import Script from 'next/script'
import { notFound } from 'next/navigation'
import ClientLayout from './client-layout'

export const metadata = createMetadata({
  app: 'ezstart',
  appName: 'EZStart',
  description: 'Modern web development platform - Build and launch applications faster with EZStart suite',
  keywords: ['development', 'platform', 'web apps', 'ezstart', 'tools'],
  themeColor: '#000000',
  ogImage: 'https://www.ezstart.xyz/og-image.svg',
})

export const viewport = createViewport('#000000')

const jsonLd = createJsonLd({
  app: 'ezstart',
  appName: 'EZStart',
  description: 'Modern web development platform - Build and launch applications faster with EZStart suite',
  applicationCategory: 'DeveloperApplication',
})

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
    <html lang={locale} suppressHydrationWarning>
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
        {/* Plausible Analytics - Privacy-focused, GDPR compliant */}
        <Script
          defer
          data-domain="ezstart.xyz"
          src="https://plausible.io/js/script.outbound-links.file-downloads.js"
          strategy="afterInteractive"
        />
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
