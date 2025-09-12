'use client'

import { ThemeProvider as NextThemesProvider, type Attribute } from 'next-themes'
import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'

export interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: string
  storageKey?: string
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
  attribute?: Attribute
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'theme',
  enableSystem = true,
  disableTransitionOnChange = true,
  attribute = 'class',
  ...props
}: ThemeProviderProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div suppressHydrationWarning>{children}</div>
  }

  return (
    <NextThemesProvider
      attribute={attribute}
      defaultTheme={defaultTheme}
      storageKey={storageKey}
      enableSystem={enableSystem}
      disableTransitionOnChange={disableTransitionOnChange}
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}