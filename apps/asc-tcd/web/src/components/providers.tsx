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
      // Phase A1 ENV-DIET (2026-05-05) — `apiUrl` is OPTIONAL in production
      // (SDK ships `https://ezauth-api.ezstart.xyz` as a hardcoded default).
      // The prop is still threaded so dev / staging consumers can override
      // via `NEXT_PUBLIC_EZAUTH_API_URL` in their `.env.local`. `webUrl` is
      // auto-resolved from `/keys/config.webUrl` (Phase 3 ENV-DIET 2026-05-05).
      apiUrl={process.env.NEXT_PUBLIC_EZAUTH_API_URL}
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
