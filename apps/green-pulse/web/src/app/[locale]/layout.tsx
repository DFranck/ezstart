import { getTimeZoneFromLocale } from '@/i18n/routing'
import { Providers } from '@/providers/providers'
import { createJsonLd } from '@ezstart/seo-config/json-ld'
import { createMetadata, createViewport } from '@ezstart/seo-config/metadata'
import { ErrorBoundary, Toaster } from '@ezstart/ui/components'
import '@ezstart/ui/globals.css'
import { getMessages } from 'next-intl/server'
import { Gugi, K2D } from 'next/font/google'
import Script from 'next/script'
import ClientLayout from './client-layout'

const gugi = Gugi({ weight: '400', subsets: ['latin'], variable: '--font-gugi' })
const k2d = K2D({
  weight: ['300', '400', '600', '700'],
  subsets: ['latin'],
  variable: '--font-k2d',
})

export const metadata = createMetadata({
  appName: 'GreenPulse',
  description:
    'AI-powered sustainable development assistant - Track and improve your environmental impact',
  domain: 'https://www.ai-greenpulse.com',
  keywords: ['sustainability', 'environment', 'AI', 'green', 'climate'],
  themeColor: '#10b981',
  ogImage: 'https://www.ai-greenpulse.com/og-image.svg',
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
  appName: 'GreenPulse',
  description:
    'AI-powered sustainable development assistant - Track and improve your environmental impact',
  url: 'https://www.ai-greenpulse.com',
  applicationCategory: 'UtilitiesApplication',
})

interface RootLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function RootLayout({ children, params }: RootLayoutProps) {
  const { locale } = await params
  const messages = await getMessages()
  const timeZone = getTimeZoneFromLocale(locale)

  return (
    <html lang={locale} suppressHydrationWarning className={`${gugi.variable} ${k2d.variable}`}>
      <body>
        <Script
          id="json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ErrorBoundary title="Something went wrong in GreenPulse">
          <Providers
            messages={messages}
            locale={locale}
            timeZone={timeZone}
            enableThemeSelector={true}
          >
            <ClientLayout>{children}</ClientLayout>
          </Providers>
        </ErrorBoundary>
        <Toaster />
      </body>
    </html>
  )
}
