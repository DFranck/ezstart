'use client'

import {
  AuthProvider,
  useAuthStoreApi,
  useAuthStoreGetSnapshot,
  type AuthUser,
} from '@ezstart/auth-sdk'
import { PayProvider } from '@ezstart/pay-sdk'
import { ThemeProvider } from '@ezstart/ui/theme'
import { useLocale } from 'next-intl'
import { ReactNode, useCallback } from 'react'
import { QueryProvider } from '../../providers/query-provider'

/**
 * Bridge component: lives INSIDE `<AuthProvider>` so it can read the
 * Context-bound auth store and forward `getToken`/`onAuthFailure` to
 * `<PayProvider>`. Splitting the bridge out keeps the wiring close to the
 * SDK plumbing it depends on (no module-level `useAuthStore.getState()`
 * — that pattern is incompatible with the per-Provider store created by
 * the Clerk-style SSR setup).
 */
function PayBridge({ locale, children }: { locale: string; children: ReactNode }) {
  const getSnapshot = useAuthStoreGetSnapshot()
  const storeApi = useAuthStoreApi()
  const onAuthFailure = useCallback(() => {
    storeApi.getState().logout()
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }, [storeApi])

  return (
    <PayProvider
      appName="ezpay"
      config={{ apiUrl: process.env.NEXT_PUBLIC_EZPAY_API_URL ?? 'http://localhost:6130' }}
      publishableKey={process.env.NEXT_PUBLIC_EZPAY_KEY}
      locale={locale}
      getToken={() => getSnapshot().accessToken}
      onAuthFailure={onAuthFailure}
    >
      {children}
    </PayProvider>
  )
}

export function Providers({
  children,
  initialUser,
}: {
  children: ReactNode
  /**
   * SSR-resolved user — passed down from the locale-root layout, which calls
   * `getServerAuth()` from `@ezstart/auth-sdk/server` against the request
   * cookie. Hydrates the auth store synchronously on first render so the
   * AppShell renders the right chrome (UserMenu vs LoginButton) on the very
   * first paint — no flash on initial load or cross-group navigations.
   */
  initialUser?: AuthUser | null
}) {
  const locale = useLocale()
  return (
    <QueryProvider>
      <ThemeProvider>
        <AuthProvider
          appName="ezpay"
          apiUrl={process.env.NEXT_PUBLIC_EZAUTH_API_URL ?? 'http://localhost:6110'}
          // `webUrl` is auto-resolved from the publishable key via
          // `/keys/config.webUrl` (Phase 3 ENV-DIET 2026-05-05). The legacy
          // `NEXT_PUBLIC_EZAUTH_WEB_URL` env var is no longer required.
          publishableKey={process.env.NEXT_PUBLIC_EZAUTH_KEY}
          initialUser={initialUser}
        >
          <PayBridge locale={locale}>{children}</PayBridge>
        </AuthProvider>
      </ThemeProvider>
    </QueryProvider>
  )
}
