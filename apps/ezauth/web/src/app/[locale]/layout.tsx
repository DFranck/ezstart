import { createMetadata, createViewport } from '@ezstart/seo-config/metadata'
import { createJsonLd } from '@ezstart/seo-config/json-ld'
import { getWebUrl } from '@ezstart/config'
import { Providers } from '@/components/providers'
import { ErrorBoundary, Toaster } from '@ezstart/ui/components'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import Script from 'next/script'
import { headers } from 'next/headers'
import { ReactNode } from 'react'
import { resolveSsrTheme, renderThemeStyle } from '@/server/theme-ssr'

const DOMAIN = getWebUrl('ezauth', 'production')

export const metadata = createMetadata({
  appName: 'EZAuth',
  description:
    'EZStart centralized authentication service - Secure SSO for all EZStart applications',
  domain: DOMAIN,
  keywords: ['authentication', 'SSO', 'OAuth2', 'login', 'ezstart'],
  themeColor: '#00D9F7',
  ogImage: `${DOMAIN}/og-image.svg`,
})

export const viewport = createViewport('#00D9F7')

const jsonLd = createJsonLd({
  appName: 'EZAuth',
  description:
    'EZStart centralized authentication service - Secure SSO for all EZStart applications',
  url: DOMAIN,
  applicationCategory: 'BusinessApplication',
})

type Props = {
  children: ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }))
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params
  const messages = await getMessages()
  const t = await getTranslations({ locale })

  // Read app theme + tokens set by middleware from ?app= or ?key= search
  // params. Sets data-app on <html> at SSR time AND injects the per-tenant
  // CSS variable overrides inline, so the first-render paint is already
  // white-labeled (zero flash for EZAuth Pro tenants).
  const headersList = await headers()
  const { appName: ssrAppName, theme: ssrTheme } = resolveSsrTheme(headersList)
  const themeCss = renderThemeStyle(ssrAppName, ssrTheme)

  return (
    <html lang={locale} suppressHydrationWarning data-app={ssrAppName}>
      <head>
        {themeCss ? (
          <style
            id="ezauth-tenant-theme"
            // The inline CSS is built from a narrow allow-list of tokens
            // validated by `isSafeCssValue` — `<`, `{`, `}`, `;` are rejected
            // so `dangerouslySetInnerHTML` is safe here.
            dangerouslySetInnerHTML={{ __html: themeCss }}
          />
        ) : null}
      </head>
      <body className="min-h-screen">
        <Script
          id="json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <NextIntlClientProvider messages={messages} locale={locale}>
          <ErrorBoundary title={t('errorBoundary.title')}>
            <Providers>{children}</Providers>
          </ErrorBoundary>
        </NextIntlClientProvider>
        <Toaster />
      </body>
    </html>
  )
}
