'use client'

import { AuthProvider, type AuthUser } from '@ezstart/auth-sdk'
import { ThemeProvider } from '@ezstart/ui/theme'
import { globalThemeCss } from '@ezstart/ui/styles'
import { AbstractIntlMessages, Locale, NextIntlClientProvider } from 'next-intl'
import * as React from 'react'
import { QueryProvider } from '@/components/providers/query-provider'

export function Providers({
  children,
  messages,
  locale,
  timeZone,
  enableThemeSelector = false,
  initialUser,
}: {
  children: React.ReactNode
  messages: AbstractIntlMessages
  locale: Locale
  timeZone: string
  enableThemeSelector?: boolean
  /**
   * SSR-resolved user — passed down from the locale-root layout, which
   * calls `getServerAuth()` from `@ezstart/auth-sdk/server` against the
   * request cookie. Hydrates the auth store synchronously on first
   * render so the chrome (UserMenu vs LoginButton) renders correctly on
   * the very first paint — no flash on initial load or cross-group
   * navigations.
   */
  initialUser?: AuthUser | null
}) {
  return (
    <QueryProvider>
      <AuthProvider
        appName="gacha-analyzer"
        authMode="httpOnly"
        apiUrl={process.env.NEXT_PUBLIC_EZAUTH_API_URL ?? 'http://localhost:6110'}
        webUrl={process.env.NEXT_PUBLIC_EZAUTH_WEB_URL}
        publishableKey={process.env.NEXT_PUBLIC_EZAUTH_KEY}
        jwtPublicKey={process.env.NEXT_PUBLIC_EZAUTH_JWT_PUBLIC_KEY}
        initialUser={initialUser}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          themeSelector={
            enableThemeSelector
              ? {
                  appName: 'gacha-analyzer',
                  globalCss: globalThemeCss,
                  appCss: '',
                }
              : undefined
          }
        >
          <NextIntlClientProvider messages={messages} locale={locale} timeZone={timeZone}>
            {children}
          </NextIntlClientProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryProvider>
  )
}
