import '@ezstart/ui/globals.css'
import { ErrorBoundary } from '@ezstart/ui/components'
import { QueryProvider } from '@/providers/query-provider'
import { AuthProvider } from '@ezstart/auth-sdk'
import { ThemeProvider } from '@ezstart/next-theme'
import { createMetadata, createViewport } from '@ezstart/seo-config/metadata'
import { createJsonLd } from '@ezstart/seo-config/json-ld'
import { Geist } from 'next/font/google'
import { Toaster } from 'sonner'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import Script from 'next/script'
import { ReactNode } from 'react'

const fontSans = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata = createMetadata({
  appName: 'EZ Billing',
  description: 'Simple and efficient billing management for businesses',
  domain: 'https://ezbill-web.vercel.app',
  keywords: ['billing', 'invoices', 'clients', 'payments', 'business'],
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
})

export const viewport = createViewport('#3B82F6')

const jsonLd = createJsonLd({
  appName: 'EZ Billing',
  description: 'Simple and efficient billing management for businesses',
  url: 'https://ezbill-web.vercel.app',
  applicationCategory: 'BusinessApplication',
})

type Props = {
  children: ReactNode
  params: Promise<{ locale: string }>
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params
  const messages = await getMessages()

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${fontSans.variable} font-sans antialiased`}>
        <Script
          id="json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <NextIntlClientProvider messages={messages}>
          <div className="flex flex-col min-h-screen">
            <ErrorBoundary>
              <QueryProvider>
                <ThemeProvider>
                  <AuthProvider
                    appName="ezbill"
                    useHttpOnlyCookies={false}
                  >
                    {children}
                  </AuthProvider>
                </ThemeProvider>
              </QueryProvider>
            </ErrorBoundary>
            <Toaster />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
