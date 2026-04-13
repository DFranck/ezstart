import { createMetadata, createViewport } from '@ezstart/seo-config/metadata'
import { createJsonLd } from '@ezstart/seo-config/json-ld'
import { getWebUrl } from '@ezstart/config'
import { Providers } from '@/components/providers'
import { Div, ErrorBoundary, Toaster } from '@ezstart/ui/components'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import Script from 'next/script'
import { ReactNode } from 'react'

const DOMAIN = getWebUrl('ezauth', 'production')

export const metadata = createMetadata({
  appName: 'EZAuth',
  description:
    'EZStart centralized authentication service - Secure SSO for all EZStart applications',
  domain: DOMAIN,
  keywords: ['authentication', 'SSO', 'OAuth2', 'login', 'ezstart'],
  themeColor: '#000000',
  ogImage: `${DOMAIN}/og-image.svg`,
})

export const viewport = createViewport('#000000')

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

  return (
    <html lang={locale} suppressHydrationWarning data-app="ezauth">
      <body className="min-h-screen">
        <Script
          id="json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <NextIntlClientProvider messages={messages} locale={locale}>
          <ErrorBoundary title={t('errorBoundary.title')}>
            <Providers>
              <Div className="bg-background text-foreground flex items-center justify-center mx-2 min-h-screen">
                {children}
              </Div>
            </Providers>
          </ErrorBoundary>
        </NextIntlClientProvider>
        <Toaster />
      </body>
    </html>
  )
}
