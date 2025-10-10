'use client'
import { AuthProvider } from '@ezstart/auth-sdk'
import type { ReactNode } from 'react'

export const EZAuthProvider = ({ children }: { children: ReactNode }) => {
  return (
    <AuthProvider appName="ezbill">
      {children}
    </AuthProvider>
  )
}
