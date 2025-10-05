import type { Metadata } from 'next'
import { ThemeProvider } from '@ezstart/next-theme'
import './globals.css'

export const metadata: Metadata = {
  title: 'EZPay - Universal Payment System',
  description: 'Centralized payment, donation, and subscription management',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
