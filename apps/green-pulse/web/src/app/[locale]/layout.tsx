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
