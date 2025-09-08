'use client'

import { AuthProvider } from '@ezstart/auth-sdk'
import { AbstractIntlMessages, Locale, NextIntlClientProvider } from 'next-intl'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import * as React from 'react'

const authConfig = {
  baseURL: 'http://localhost:8081/api/auth',
  appName: 'tower-defense',
  redirectUri: 'http://localhost:3100/auth/callback'
}

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
    <AuthProvider config={authConfig}>
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
