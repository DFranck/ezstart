'use client'

import { AuthProvider } from '@ezstart/auth-sdk'
import { AbstractIntlMessages, Locale, NextIntlClientProvider } from 'next-intl'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import * as React from 'react'

export function Providers({
  children,
  messages,
  locale,
  timeZone,
}: {
  children: React.ReactNode
  messages: AbstractIntlMessages
  locale: Locale
  timeZone: string
}) {
  return (
    <AuthProvider
      appName="asc-tcd"
      authMode="localStorage"
      apiUrl={process.env.NEXT_PUBLIC_EZAUTH_API_URL ?? 'http://localhost:6110'}
      webUrl={process.env.NEXT_PUBLIC_EZAUTH_WEB_URL}
      publishableKey={process.env.NEXT_PUBLIC_EZAUTH_KEY}
    >
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        enableColorScheme
      >
        <NextIntlClientProvider messages={messages} locale={locale} timeZone={timeZone}>
          {children}
        </NextIntlClientProvider>
      </NextThemesProvider>
    </AuthProvider>
  )
}
