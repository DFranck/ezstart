'use client'

import { AuthProvider } from '@ezstart/auth-sdk'
import { ThemeProvider } from '@ezstart/ui/theme'
import { QueryProvider } from './providers/QueryProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ThemeProvider>
        <AuthProvider appName="ezauth" authMode="httpOnly">
          {children}
        </AuthProvider>
      </ThemeProvider>
    </QueryProvider>
  )
}
