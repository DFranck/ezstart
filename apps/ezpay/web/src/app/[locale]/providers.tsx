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
        <AuthProvider appName="ezpay">
          <PayProvider
            appName="ezpay"
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
