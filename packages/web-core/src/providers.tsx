'use client'

import { AuthProvider } from '@ezstart/auth-sdk'
import {
  AbstractIntlMessages,
  Locale,
  NextIntlClientProvider,
} from 'next-intl'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import * as React from 'react'

export interface WebProvidersProps {
  children: React.ReactNode
  messages?: AbstractIntlMessages
  locale?: Locale
  timeZone?: string
  appName: string
}

export function WebProviders({
  children,
  messages,
  locale,
  timeZone,
  appName,
}: WebProvidersProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      enableColorScheme
    >
      <AuthProvider appName={appName}>
        {messages && locale && timeZone ? (
          <NextIntlClientProvider
            messages={messages}
            locale={locale}
            timeZone={timeZone}
          >
            {children}
          </NextIntlClientProvider>
        ) : (
          children
        )}
      </AuthProvider>
    </NextThemesProvider>
  )
}

// Pour les apps sans i18n
export function SimpleWebProviders({
  children,
  appName,
}: {
  children: React.ReactNode
  appName: string
}) {
  return (
    <WebProviders appName={appName}>
      {children}
    </WebProviders>
  )
}