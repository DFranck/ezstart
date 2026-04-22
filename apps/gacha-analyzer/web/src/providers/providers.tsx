'use client'

import { AuthProvider } from '@ezstart/auth-sdk'
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
}: {
  children: React.ReactNode
  messages: AbstractIntlMessages
  locale: Locale
  timeZone: string
  enableThemeSelector?: boolean
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
