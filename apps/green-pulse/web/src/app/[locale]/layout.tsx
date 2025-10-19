import { Providers } from '@/providers/providers'
import { getTimeZoneFromLocale } from '@/i18n/routing'
import { Toaster } from '@ezstart/ui/components'
import '@ezstart/ui/globals.css'
import type { Metadata } from 'next'
import { getMessages } from 'next-intl/server'
import ClientLayout from './client-layout'

export const metadata: Metadata = {
  title: 'Green-pulse',
  description: 'Green-pulse application',
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
}

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
        <Providers messages={messages} locale={locale} timeZone={timeZone}>
          <ClientLayout>{children}</ClientLayout>
        </Providers>
        <Toaster />
      </body>
    </html>
  )
}
