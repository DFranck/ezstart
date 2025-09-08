'use client'
import { AuthProvider } from '@ezstart/auth-sdk'
import type { ReactNode } from 'react'

export const EZAuthProvider = ({ children }: { children: ReactNode }) => {
  return (
    <AuthProvider
      config={{
        baseURL: 'http://localhost:8006/api/auth',
        appName: 'ez-billing',
        redirectUri: 'http://localhost:3200/auth/callback',
      }}
    >
      {children as any}
    </AuthProvider>
  )
}