import { createMetadata } from '@ezstart/seo-config/metadata'
import { ThemeProvider } from '@ezstart/next-theme'
import './globals.css'

export const metadata = createMetadata({
  appName: 'EZPay',
  description: 'Universal payment system for donations, purchases, and subscriptions',
  domain: 'https://ezpay.vercel.app',
  keywords: ['payment', 'donations', 'subscriptions', 'stripe', 'ezstart'],
  themeColor: '#10B981',
})

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
