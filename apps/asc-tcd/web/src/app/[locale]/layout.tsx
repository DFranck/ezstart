import { Providers } from '@/components/providers'
import { getTimeZoneFromLocale, routing } from '@/i18n/routing'
import { ErrorBoundary, Toaster } from '@ezstart/ui/components'
import '@ezstart/ui/globals.css'
import { createMetadata, createViewport } from '@ezstart/seo-config/metadata'
import { createJsonLd } from '@ezstart/seo-config/json-ld'
import { hasLocale } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { Geist, Geist_Mono } from 'next/font/google'
import { notFound } from 'next/navigation'
import ClientLayout from './client-layout'
import Script from 'next/script'

export const metadata = createMetadata({
  appName: 'ASC TCD',
  description: 'Association Sportive et Culturelle Trait de Côte Dauphinois - Sports and cultural activities',
  domain: 'https://asc-tcd-web.vercel.app',
  keywords: ['sports', 'culture', 'association', 'activities', 'asc-tcd'],
  themeColor: '#000000',
  ogImage: 'https://asc-tcd-web.vercel.app/og-image.svg',
})

export const viewport = createViewport('#000000')

const jsonLd = createJsonLd({
  appName: 'ASC TCD',
  description: 'Association Sportive et Culturelle Trait de Côte Dauphinois - Sports and cultural activities',
  url: 'https://asc-tcd-web.vercel.app',
  applicationCategory: 'WebApplication',
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
    <html lang={locale} suppressHydrationWarning data-app="asc-tcd">
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased flex flex-col min-h-screen`}
      >
        <Script id="json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ErrorBoundary title="Something went wrong in ASC-TCD">
          <Providers messages={messages} locale={locale} timeZone={timeZone}>
            <ClientLayout>{children}</ClientLayout>
          </Providers>
        </ErrorBoundary>
        <Toaster />
      </body>
    </html>
  )
}
