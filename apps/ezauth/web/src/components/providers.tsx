'use client'

import { AuthProvider } from '@ezstart/auth-sdk'
import { ThemeProvider } from '@ezstart/ui/theme'
import { QueryProvider } from './providers/QueryProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider mode="first-party" appName="ezauth" authMode="httpOnly">
        <QueryProvider>{children}</QueryProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
