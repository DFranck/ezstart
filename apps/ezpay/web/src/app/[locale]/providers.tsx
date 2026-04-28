'use client'

import { AuthProvider, useAuthStoreApi, useAuthStoreGetSnapshot } from '@ezstart/auth-sdk'
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

export function Providers({ children }: { children: ReactNode }) {
  const locale = useLocale()
  return (
    <QueryProvider>
      <ThemeProvider>
        <AuthProvider
          appName="ezpay"
          apiUrl={process.env.NEXT_PUBLIC_EZAUTH_API_URL ?? 'http://localhost:6110'}
          webUrl={process.env.NEXT_PUBLIC_EZAUTH_WEB_URL}
          publishableKey={process.env.NEXT_PUBLIC_EZAUTH_KEY}
        >
          <PayBridge locale={locale}>{children}</PayBridge>
        </AuthProvider>
      </ThemeProvider>
    </QueryProvider>
  )
}
