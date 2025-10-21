import { Providers } from '@/providers/providers'
import { getTimeZoneFromLocale } from '@/i18n/routing'
import { Toaster } from '@ezstart/ui/components'
import '@ezstart/ui/globals.css'
import { createMetadata, createViewport } from '@ezstart/seo-config/metadata'
import { createJsonLd } from '@ezstart/seo-config/json-ld'
import { getMessages } from 'next-intl/server'
import ClientLayout from './client-layout'

export const metadata = createMetadata({
  appName: 'Green Pulse',
  description: 'AI-powered sustainable development assistant - Track and improve your environmental impact',
  domain: 'https://green-pulse-web.vercel.app',
  keywords: ['sustainability', 'environment', 'AI', 'green', 'climate'],
  themeColor: '#10b981',
  ogImage: 'https://green-pulse-web.vercel.app/og-image.svg',
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
})

export const viewport = createViewport('#10b981')

const jsonLd = createJsonLd({
  appName: 'Green Pulse',
  description: 'AI-powered sustainable development assistant - Track and improve your environmental impact',
  url: 'https://green-pulse-web.vercel.app',
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
    <html lang={locale} suppressHydrationWarning>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Providers messages={messages} locale={locale} timeZone={timeZone}>
          <ClientLayout>{children}</ClientLayout>
        </Providers>
        <Toaster />
      </body>
    </html>
  )
}
