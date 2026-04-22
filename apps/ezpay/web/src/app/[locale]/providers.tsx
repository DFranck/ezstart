'use client'

import { AuthProvider, useAuthStore } from '@ezstart/auth-sdk'
import { PayProvider } from '@ezstart/pay-sdk'
import { ThemeProvider } from '@ezstart/ui/theme'
import { QueryProvider } from '../../providers/query-provider'
import { ReactNode } from 'react'

function handleAuthFailure() {
  useAuthStore.getState().logout()
  if (typeof window !== 'undefined') {
    window.location.href = '/'
  }
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <ThemeProvider>
        <AuthProvider
          appName="ezpay"
          apiUrl={process.env.NEXT_PUBLIC_EZAUTH_API_URL ?? 'http://localhost:6110'}
          webUrl={process.env.NEXT_PUBLIC_EZAUTH_WEB_URL}
          publishableKey={process.env.NEXT_PUBLIC_EZAUTH_KEY}
        >
          <PayProvider
            appName="ezpay"
            config={{ apiUrl: process.env.NEXT_PUBLIC_EZPAY_API_URL ?? 'http://localhost:6130' }}
            publishableKey={process.env.NEXT_PUBLIC_EZPAY_KEY}
            getToken={() => useAuthStore.getState().accessToken}
            onAuthFailure={handleAuthFailure}
          >
            {children}
          </PayProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryProvider>
  )
}
