'use client'

import { AuthProvider, useAuthStore, createAuthClient } from '@ezstart/auth-sdk'
import { PayProvider } from '@ezstart/pay-sdk'
import { ThemeProvider } from '@ezstart/next-theme'
import { ReactNode } from 'react'

const authClient = createAuthClient({ appName: 'ezpay', redirectUri: '/auth/callback' })

function getToken() {
  return useAuthStore.getState().accessToken
}

async function handleTokenRefresh(): Promise<string | null> {
  const { refreshToken } = useAuthStore.getState()
  if (!refreshToken) return null
  try {
    const result = await authClient.refreshTokens(refreshToken)
    useAuthStore.getState().setTokens(result.accessToken, result.refreshToken)
    return result.accessToken
  } catch {
    return null
  }
}

function handleAuthFailure() {
  useAuthStore.getState().logout()
  if (typeof window !== 'undefined') {
    window.location.href = '/'
  }
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider appName="ezpay">
      <ThemeProvider>
        <PayProvider
          appName="ezpay"
          getToken={getToken}
          onTokenRefresh={handleTokenRefresh}
          onAuthFailure={handleAuthFailure}
        >
          {children}
        </PayProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}
