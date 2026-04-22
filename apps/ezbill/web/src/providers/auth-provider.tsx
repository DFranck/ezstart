'use client'
import { AuthProvider } from '@ezstart/auth-sdk'
import type { ReactNode } from 'react'

export const EZAuthProvider = ({ children }: { children: ReactNode }) => {
  return (
    <AuthProvider
      appName="ezbill"
      apiUrl={process.env.NEXT_PUBLIC_EZAUTH_API_URL ?? 'http://localhost:6110'}
      webUrl={process.env.NEXT_PUBLIC_EZAUTH_WEB_URL}
      publishableKey={process.env.NEXT_PUBLIC_EZAUTH_KEY}
    >
      {children}
    </AuthProvider>
  )
}
