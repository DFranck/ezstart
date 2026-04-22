'use client'

import { AIProvider } from '@ezstart/ai-sdk/client'
import { AuthProvider } from '@ezstart/auth-sdk'
import { ThemeProvider } from '@ezstart/ui/theme'
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
        authMode="localStorage"
        apiUrl={process.env.NEXT_PUBLIC_EZAUTH_API_URL ?? 'http://localhost:6110'}
        webUrl={process.env.NEXT_PUBLIC_EZAUTH_WEB_URL}
        publishableKey={process.env.NEXT_PUBLIC_EZAUTH_KEY}
      >
        <AIProvider appName="green-pulse">
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
        </AIProvider>
      </AuthProvider>
    </QueryProvider>
  )
}
