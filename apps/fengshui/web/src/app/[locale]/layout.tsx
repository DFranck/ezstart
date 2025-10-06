import { AuthProvider } from '@ezstart/auth-sdk'
import { ThemeProvider } from '@ezstart/next-theme'
import { PayProvider } from '@ezstart/pay-sdk'
import '@ezstart/ui/globals.css'
import { cn } from '@ezstart/ui/lib'
import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { Inter } from 'next/font/google'
import ClientLayout from './client-layout'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Feng Shui Bagua - Application Interactive',
  description:
    "Application web pour l'analyse Feng Shui avec import de plans et roue d'orientation interactive",
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Feng Shui',
  },
  icons: {
    icon: '/icons/icon-192x192.png',
    shortcut: '/icons/icon-96x96.png',
    apple: '/icons/icon-152x152.png',
  },
}

// Viewport avec themeColor (Next.js 15+)
export const viewport = {
  themeColor: '#10b981',
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const messages = await getMessages()

  return (
    <html lang={locale}>
      <body className={cn(inter.className, 'min-h-screen flex flex-col')}>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <AuthProvider appName="fengshui">
              <PayProvider appName="fengshui">
                <ClientLayout>{children}</ClientLayout>
              </PayProvider>
            </AuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
