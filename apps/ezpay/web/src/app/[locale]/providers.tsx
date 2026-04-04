'use client'

import { AuthProvider } from '@ezstart/auth-sdk'
import { useAuthStore } from '@ezstart/auth-sdk'
import { PayProvider } from '@ezstart/pay-sdk'
import { ThemeProvider } from '@ezstart/next-theme'
import { ReactNode } from 'react'

function getToken() {
  return useAuthStore.getState().accessToken
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider appName="ezpay">
      <ThemeProvider>
        <PayProvider appName="ezpay" getToken={getToken}>
          {children}
        </PayProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}
