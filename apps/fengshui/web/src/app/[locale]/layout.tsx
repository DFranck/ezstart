import { AuthProvider } from '@ezstart/auth-sdk'
import { ThemeProvider } from '@ezstart/next-theme'
import { PayProvider } from '@ezstart/pay-sdk'
import '@ezstart/ui/globals.css'
import { cn } from '@ezstart/ui/lib'
import { createMetadata, createViewport } from '@ezstart/seo-config/metadata'
import { createJsonLd } from '@ezstart/seo-config/json-ld'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { Inter } from 'next/font/google'
import ClientLayout from './client-layout'

const inter = Inter({ subsets: ['latin'] })

export const metadata = createMetadata({
  appName: 'Feng Shui Bagua',
  description: "Application web pour l'analyse Feng Shui avec import de plans et roue d'orientation interactive",
  domain: 'https://ezfengshui.vercel.app',
  keywords: ['feng shui', 'bagua', 'orientation', 'plans', 'analyse'],
  themeColor: '#10b981',
  ogImage: 'https://ezfengshui.vercel.app/og-image.svg',
  icons: {
    icon: '/icons/icon-192x192.png',
    shortcut: '/icons/icon-96x96.png',
    apple: '/icons/icon-152x152.png',
  },
})

export const viewport = createViewport('#10b981')

const jsonLd = createJsonLd({
  appName: 'Feng Shui Bagua',
  description: "Application web pour l'analyse Feng Shui avec import de plans et roue d'orientation interactive",
  url: 'https://ezfengshui.vercel.app',
  applicationCategory: 'LifestyleApplication',
})

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
    <html lang={locale} suppressHydrationWarning>
      <body className={cn(inter.className, 'min-h-screen flex flex-col')}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <AuthProvider appName="fengshui" useHttpOnlyCookies={true}>
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
