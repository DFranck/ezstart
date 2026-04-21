'use client'

import { AuthProvider, useAuthStore } from '@ezstart/auth-sdk'
import { PayProvider } from '@ezstart/pay-sdk'
import { ThemeProvider } from '@ezstart/ui/theme'
import { QueryProvider } from './providers/QueryProvider'

function handleAuthFailure() {
  useAuthStore.getState().logout()
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider
        appName="ezauth"
        authMode="httpOnly"
        apiUrl={process.env.NEXT_PUBLIC_EZAUTH_API_URL ?? 'http://localhost:6110'}
      >
        <QueryProvider>
          {/*
            PayProvider is intentionally NOT given a `publishableKey`.
            NEXT_PUBLIC_EZAUTH_KEY is an EZAUTH publishable key — passing it
            here would make PayProvider call ezpay `/api/keys/config` with an
            ezauth key and 404. PricingPage receives `applicationId` directly
            from NEXT_PUBLIC_EZAUTH_APP_ID on the landing page instead.
          */}
          <PayProvider
            appName="ezauth"
            config={{ apiUrl: process.env.NEXT_PUBLIC_EZPAY_API_URL ?? 'http://localhost:6130' }}
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
