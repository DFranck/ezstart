import { createMetadata, createViewport } from '@ezstart/seo-config/metadata'
import { createJsonLd } from '@ezstart/seo-config/json-ld'
import { ThemeProvider } from '@ezstart/next-theme'
import '@ezstart/ui/globals.css'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { ReactNode } from 'react'

export const metadata = createMetadata({
  appName: 'EZPay',
  description: 'Universal payment system for donations, purchases, and subscriptions',
  domain: 'https://ezpay.vercel.app',
  keywords: ['payment', 'donations', 'subscriptions', 'stripe', 'ezstart'],
  themeColor: '#10B981',
})

export const viewport = createViewport('#10B981')

const jsonLd = createJsonLd({
  appName: 'EZPay',
  description: 'Universal payment system for donations, purchases, and subscriptions',
  url: 'https://ezpay.vercel.app',
  applicationCategory: 'FinanceApplication',
})

type Props = {
  children: ReactNode
  params: Promise<{ locale: string }>
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params
  const messages = await getMessages()

  return (
    <NextIntlClientProvider messages={messages}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ThemeProvider>{children}</ThemeProvider>
    </NextIntlClientProvider>
  )
}
