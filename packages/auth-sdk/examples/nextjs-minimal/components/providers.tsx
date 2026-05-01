'use client'

import { AuthProvider, type AuthUser } from '@ezstart/auth-sdk'
import { ThemeProvider } from '@ezstart/ui/theme'
import { Toaster } from 'sonner'

export function Providers({
  children,
  initialUser,
}: {
  children: React.ReactNode
  initialUser: AuthUser | null
}) {
  return (
    <ThemeProvider>
      <AuthProvider
        apiUrl={process.env.NEXT_PUBLIC_AUTH_API_URL!}
        publishableKey={process.env.NEXT_PUBLIC_AUTH_PUBLISHABLE_KEY}
        appName="myapp"
        authMode="httpOnly"
        initialUser={initialUser}
      >
        {children}
        <Toaster position="bottom-right" />
      </AuthProvider>
    </ThemeProvider>
  )
}
