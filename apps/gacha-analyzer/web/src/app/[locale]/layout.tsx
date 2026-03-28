import { getTimeZoneFromLocale } from '@/i18n/routing'
import { Providers } from '@/providers/providers'
import { ThemeStyleInjector } from '@ezstart/next-theme/server'
import { createMetadata, createViewport } from '@ezstart/seo-config/metadata'
import { ErrorBoundary, Toaster } from '@ezstart/ui/components'
import '@ezstart/ui/globals.css'
import { getMessages } from 'next-intl/server'
import { Inter } from 'next/font/google'
import ClientLayout from './client-layout'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata = createMetadata({
  appName: 'Gacha Analyzer',
  description: 'AI-powered scanner for gacha game equipment. Scan your Summoners War runes and Nikke gear instantly.',
  domain: 'https://gacha-analyzer.ezstart.xyz',
  keywords: [
    'summoners war',
    'rune scanner',
    'nikke gear',
    'gacha analyzer',
    'AI scanner',
    'rune optimizer',
  ],
  themeColor: '#6366f1',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
  },
})

export const viewport = createViewport('#6366f1')

interface RootLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function RootLayout({ children, params }: RootLayoutProps) {
  const { locale } = await params
  const messages = await getMessages()
  const timeZone = getTimeZoneFromLocale(locale)

  return (
    <html lang={locale} suppressHydrationWarning className={inter.variable}>
      <head>
        <ThemeStyleInjector appName="gacha-analyzer" />
      </head>
      <body className="font-sans">
        <ErrorBoundary title="Something went wrong in Gacha Analyzer">
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
