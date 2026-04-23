'use client'

import { AuthProvider, useAuthStore } from '@ezstart/auth-sdk'
import { PayProvider } from '@ezstart/pay-sdk'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AbstractIntlMessages, Locale, NextIntlClientProvider } from 'next-intl'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import * as React from 'react'

function handleAuthFailure() {
  useAuthStore.getState().logout()
}

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
      <AuthProvider
        appName="ezstart"
        authMode="httpOnly"
        apiUrl={process.env.NEXT_PUBLIC_EZAUTH_API_URL ?? 'http://localhost:6110'}
        webUrl={process.env.NEXT_PUBLIC_EZAUTH_WEB_URL}
        publishableKey={process.env.NEXT_PUBLIC_EZAUTH_KEY}
      >
        <PayProviderWrapper>
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
        </PayProviderWrapper>
      </AuthProvider>
    </QueryClientProvider>
  )
}

/**
 * Inner wrapper that can access auth context for token refresh.
 * Must be inside AuthProvider.
 *
 * NOTE — `applicationId` is the ezauth Application id for ezstart. We use
 * `applicationId` over `publishableKey` here because ezstart is the hub: it
 * talks to the ezpay API on behalf of the ezstart app (no separate ezpay
 * publishable key needed). The ezauth JWT carries the user identity and
 * `applicationId` scopes the ezpay queries to the ezstart tenant.
 */
function PayProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <PayProvider
      applicationId={process.env.NEXT_PUBLIC_EZAUTH_APP_ID ?? ''}
      appName="ezstart"
      config={{ apiUrl: process.env.NEXT_PUBLIC_EZPAY_API_URL ?? 'http://localhost:6130' }}
      payWebUrl={process.env.NEXT_PUBLIC_EZPAY_WEB_URL ?? 'http://localhost:6131'}
      getToken={() => useAuthStore.getState().accessToken}
      onAuthFailure={handleAuthFailure}
    >
      {children}
    </PayProvider>
  )
}
