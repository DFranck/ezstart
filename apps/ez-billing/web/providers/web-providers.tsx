'use client'

import { AuthProvider } from '@ezstart/auth-sdk'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import * as React from 'react'

interface SimpleWebProvidersProps {
  children: React.ReactNode
  appName: string
}

export function SimpleWebProviders({
  children,
  appName,
}: SimpleWebProvidersProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      enableColorScheme
    >
      <AuthProvider appName={appName}>
        {children}
      </AuthProvider>
    </NextThemesProvider>
  )
}