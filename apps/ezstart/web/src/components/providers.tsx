'use client'

import {
  AuthProvider,
  useAuthStoreApi,
  useAuthStoreGetSnapshot,
  type AuthUser,
} from '@ezstart/auth-sdk'
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
  initialUser,
}: {
  children: React.ReactNode
  messages: AbstractIntlMessages
  locale: Locale
  timeZone: string
  /**
   * SSR-resolved user — passed down from the locale-root layout, which calls
   * `getServerAuth()` from `@ezstart/auth-sdk/server` against the request
   * cookie. Hydrates the auth store synchronously on first render so the
   * UserMenu / LoginButton render the right state on the very first paint
   * — no flash on initial load or cross-group navigations.
   */
  initialUser?: AuthUser | null
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider
        appName="ezstart"
        authMode="httpOnly"
        // Phase A1 ENV-DIET (2026-05-05) — `apiUrl` is OPTIONAL in production
        // (SDK ships `https://ezauth-api.ezstart.xyz` as a hardcoded default).
        // The prop is still threaded so dev / staging consumers can override
        // via `NEXT_PUBLIC_EZAUTH_API_URL` in their `.env.local`. `webUrl` is
        // auto-resolved from `/keys/config.webUrl` (Phase 3 ENV-DIET 2026-05-05).
        apiUrl={process.env.NEXT_PUBLIC_EZAUTH_API_URL}
        publishableKey={process.env.NEXT_PUBLIC_EZAUTH_KEY}
        initialUser={initialUser}
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
 * Phase 3 ENV-DIET (2026-05-05) — `applicationId` and `payWebUrl` are now
 * auto-resolved by pay-sdk from `NEXT_PUBLIC_EZPAY_KEY` via ezpay's
 * `/keys/config.applicationId` + `/keys/config.webUrl`. The legacy
 * `NEXT_PUBLIC_EZAUTH_APP_ID` and `NEXT_PUBLIC_EZPAY_WEB_URL` env vars are
 * no longer required. Make sure `NEXT_PUBLIC_EZPAY_KEY` is seeded against
 * the ezstart-tenant Application in EZPay's DB so the resolved
 * `applicationId` correctly scopes payments / subscriptions to ezstart.
 */
function PayProviderWrapper({ children, locale }: { children: React.ReactNode; locale: Locale }) {
  const getSnapshot = useAuthStoreGetSnapshot()
  const storeApi = useAuthStoreApi()
  const onAuthFailure = React.useCallback(() => {
    storeApi.getState().logout()
  }, [storeApi])

  return (
    <PayProvider
      appName="ezstart"
      publishableKey={process.env.NEXT_PUBLIC_EZPAY_KEY}
      // Phase A1 ENV-DIET (2026-05-05) — `apiUrl` is OPTIONAL: SDK ships
      // `https://ezpay-api.ezstart.xyz` as a hardcoded default for prod.
      config={{ apiUrl: process.env.NEXT_PUBLIC_EZPAY_API_URL }}
      locale={locale}
      getToken={() => getSnapshot().accessToken}
      onAuthFailure={onAuthFailure}
    >
      {children}
    </PayProvider>
  )
}
