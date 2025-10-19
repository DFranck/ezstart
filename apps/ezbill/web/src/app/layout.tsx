import '@ezstart/ui/globals.css'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { QueryProvider } from '@/providers/query-provider'
import { AuthProvider } from '@ezstart/auth-sdk'
import { ThemeProvider } from '@ezstart/next-theme'
import { createMetadata } from '@ezstart/seo-config/metadata'
import { Geist } from 'next/font/google'
import { Toaster } from 'sonner'

const fontSans = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata = createMetadata({
  appName: 'EZ Billing',
  description: 'Simple and efficient billing management for businesses',
  domain: 'https://ezbill-web.vercel.app',
  keywords: ['billing', 'invoices', 'clients', 'payments', 'business'],
  themeColor: '#3B82F6',
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={`${fontSans.variable} font-sans antialiased flex flex-col min-h-screen`}>
        <ErrorBoundary>
          <QueryProvider>
            <ThemeProvider>
              <AuthProvider appName="ezbill">{children}</AuthProvider>
            </ThemeProvider>
          </QueryProvider>
        </ErrorBoundary>
        <Toaster />
      </body>
    </html>
  )
}
