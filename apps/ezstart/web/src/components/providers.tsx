'use client'

import { AuthProvider, useAuthStoreApi, useAuthStoreGetSnapshot } from '@ezstart/auth-sdk'
import { PayProvider } from '@ezstart/pay-sdk'
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
      <AuthProvider
        appName="ezstart"
        authMode="httpOnly"
        apiUrl={process.env.NEXT_PUBLIC_EZAUTH_API_URL ?? 'http://localhost:6110'}
        webUrl={process.env.NEXT_PUBLIC_EZAUTH_WEB_URL}
        publishableKey={process.env.NEXT_PUBLIC_EZAUTH_KEY}
      >
        <PayProviderWrapper locale={locale}>
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
 * Inner wrapper that lives INSIDE `<AuthProvider>` so it can read the
 * Context-bound auth store. Reads the access token via the `useAuthStoreGetSnapshot`
 * helper to avoid stale closures and forwards a Context-bound `onAuthFailure`
 * callback.
 *
 * NOTE — `applicationId` is the ezauth Application id for ezstart. We use
 * `applicationId` over `publishableKey` here because ezstart is the hub: it
 * talks to the ezpay API on behalf of the ezstart app (no separate ezpay
 * publishable key needed). The ezauth JWT carries the user identity and
 * `applicationId` scopes the ezpay queries to the ezstart tenant.
 */
function PayProviderWrapper({ children, locale }: { children: React.ReactNode; locale: Locale }) {
  const getSnapshot = useAuthStoreGetSnapshot()
  const storeApi = useAuthStoreApi()
  const onAuthFailure = React.useCallback(() => {
    storeApi.getState().logout()
  }, [storeApi])

  return (
    <PayProvider
      applicationId={process.env.NEXT_PUBLIC_EZAUTH_APP_ID ?? ''}
      appName="ezstart"
      config={{ apiUrl: process.env.NEXT_PUBLIC_EZPAY_API_URL ?? 'http://localhost:6130' }}
      payWebUrl={process.env.NEXT_PUBLIC_EZPAY_WEB_URL ?? 'http://localhost:6131'}
      locale={locale}
      getToken={() => getSnapshot().accessToken}
      onAuthFailure={onAuthFailure}
    >
      {children}
    </PayProvider>
  )
}
