import { createMetadata } from '@ezstart/seo-config/metadata'
import { createJsonLd } from '@ezstart/seo-config/json-ld'
import { ThemeProvider } from '@ezstart/next-theme'
import './globals.css'

export const metadata = createMetadata({
  appName: 'EZPay',
  description: 'Universal payment system for donations, purchases, and subscriptions',
  domain: 'https://ezpay.vercel.app',
  keywords: ['payment', 'donations', 'subscriptions', 'stripe', 'ezstart'],
  themeColor: '#10B981',
})

const jsonLd = createJsonLd({
  appName: 'EZPay',
  description: 'Universal payment system for donations, purchases, and subscriptions',
  url: 'https://ezpay.vercel.app',
  applicationCategory: 'FinanceApplication',
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
