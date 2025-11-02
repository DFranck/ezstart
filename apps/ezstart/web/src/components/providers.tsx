'use client'

import { AuthProvider } from '@ezstart/auth-sdk'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AbstractIntlMessages, Locale, NextIntlClientProvider } from 'next-intl'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import * as React from 'react'

// Create a client instance outside the component to ensure it's stable across renders
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

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
    <QueryClientProvider client={queryClient}>
      <AuthProvider appName="ezstart" useHttpOnlyCookies={true}>
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
    </QueryClientProvider>
  )
}
