import '@ezstart/ui/globals.css'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { QueryProvider } from '@/providers/query-provider'
import { AuthProvider } from '@ezstart/auth-sdk'
import { ThemeProvider } from '@ezstart/next-theme'
import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { Toaster } from 'sonner'

const fontSans = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'EZ Billing',
  description: 'Simple billing management',
}

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
