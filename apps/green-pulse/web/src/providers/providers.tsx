'use client'

import { AuthProvider } from '@ezstart/auth-sdk'
import { ThemeProvider } from '@ezstart/next-theme'
import { NextIntlClientProvider } from 'next-intl'
import { ReactNode } from 'react'

interface ProvidersProps {
  children: ReactNode
  locale: string
  messages: any
  timeZone?: string
}

export function Providers({ children, locale, messages, timeZone }: ProvidersProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <AuthProvider appName="green-pulse">
          {children}
        </AuthProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  )
}
