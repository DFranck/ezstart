'use client'

import { AuthProvider, useAuthStore } from '@ezstart/auth-sdk'
import { PayProvider } from '@ezstart/pay-sdk'
import { ThemeProvider } from '@ezstart/ui/theme'
import { useLocale } from 'next-intl'
import { QueryProvider } from './providers/QueryProvider'

function handleAuthFailure() {
  useAuthStore.getState().logout()
}

export function Providers({ children }: { children: React.ReactNode }) {
  const locale = useLocale()
  return (
    <ThemeProvider>
      <AuthProvider
        appName="ezauth"
        authMode="httpOnly"
        mode="first-party"
        apiUrl={process.env.NEXT_PUBLIC_EZAUTH_API_URL ?? 'http://localhost:6110'}
        webUrl={process.env.NEXT_PUBLIC_EZAUTH_WEB_URL}
      >
        <QueryProvider>
          {/*
            PayProvider is scoped via `applicationId` (not `publishableKey`):
            NEXT_PUBLIC_EZAUTH_KEY is an EZAUTH publishable key; passing it
            here would make PayProvider call ezpay `/api/keys/config` with an
            ezauth key and 404. Using `applicationId` bypasses the key-config
            resolve and scopes ezpay queries directly to the ezauth tenant.
          */}
          <PayProvider
            applicationId={process.env.NEXT_PUBLIC_EZAUTH_APP_ID ?? ''}
            appName="ezauth"
            config={{ apiUrl: process.env.NEXT_PUBLIC_EZPAY_API_URL ?? 'http://localhost:6130' }}
            locale={locale}
            getToken={() => useAuthStore.getState().accessToken}
            onAuthFailure={handleAuthFailure}
          >
            {children}
          </PayProvider>
        </QueryProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
