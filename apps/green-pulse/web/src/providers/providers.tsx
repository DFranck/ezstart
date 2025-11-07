'use client'

import { AuthProvider } from '@ezstart/auth-sdk'
import { ThemeProvider } from '@ezstart/next-theme'
import { globalThemeCss, greenPulseThemeCss } from '@ezstart/ui/styles'
import { AbstractIntlMessages, Locale, NextIntlClientProvider } from 'next-intl'
import * as React from 'react'
import { QueryProvider } from '@/components/providers/QueryProvider'

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
        appName="green-pulse"
        authMode="httpOnly"
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
                  appName: 'green-pulse',
                  globalCss: globalThemeCss,
                  appCss: greenPulseThemeCss,
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