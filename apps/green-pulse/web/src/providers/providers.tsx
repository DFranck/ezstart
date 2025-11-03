'use client'

import { AuthProvider } from '@ezstart/auth-sdk'
import { AbstractIntlMessages, Locale, NextIntlClientProvider } from 'next-intl'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import * as React from 'react'
import { QueryProvider } from '@/components/providers/QueryProvider'

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
    <QueryProvider>
      <AuthProvider
        appName="green-pulse"
        authMode="httpOnly"
        jwtPublicKey={process.env.NEXT_PUBLIC_EZAUTH_JWT_PUBLIC_KEY}
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
    </QueryProvider>
  )
}