'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider, type Attribute } from 'next-themes'

export interface ThemeProviderProps {
  children: any
  defaultTheme?: string
  storageKey?: string
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
  attribute?: Attribute
}

/**
 * ThemeProvider wrapper for next-themes
 *
 * IMPORTANT: next-themes includes a blocking script that runs BEFORE React hydration
 * to prevent theme flash. This script automatically adds the correct class to <html>
 * based on localStorage or system preference.
 *
 * DO NOT add mounted guards or suppress hydration warnings - this breaks the script!
 *
 * Configuration:
 * - defaultTheme: 'system' (respects OS preference by default)
 * - enableSystem: true (allows system theme detection)
 * - disableTransitionOnChange: true (prevents animation flash on theme change)
 */
export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'theme',
  enableSystem = true,
  disableTransitionOnChange = true,
  attribute = 'class',
  ...props
}: ThemeProviderProps) {
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