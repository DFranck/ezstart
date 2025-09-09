import { SimpleWebProviders } from '@/providers/web-providers'
import '@ezstart/ui/globals.css'
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
        <SimpleWebProviders appName="ez-billing">{children}</SimpleWebProviders>
        <Toaster />
      </body>
    </html>
  )
}
