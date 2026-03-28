'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider, type Attribute } from 'next-themes'
import { ThemeSelectorProvider } from './theme-selector-context'

export interface ThemeProviderProps {
  children: any
  defaultTheme?: string
  storageKey?: string
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
  attribute?: Attribute
  /** Optional: Enable ThemeSelector with app-specific themes */
  themeSelector?: {
    /** App name (e.g., 'green-pulse', 'ezbill') */
    appName: string
    /** Global theme CSS (loaded server-side) */
    globalCss: string
    /** App-specific theme CSS (loaded server-side) */
    appCss: string
  }
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
 *
 * ThemeSelector (optional):
 * - Pass `themeSelector` prop to enable theme customization UI
 * - CSS is loaded server-side via loadGlobalThemeCss() and loadAppThemeCss()
 */
export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'theme',
  enableSystem = true,
  disableTransitionOnChange = true,
  attribute = 'class',
  themeSelector,
  ...props
}: ThemeProviderProps) {
  const content = (
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

  // Wrap with ThemeSelectorProvider if theme customization is enabled
  if (themeSelector) {
    return (
      <ThemeSelectorProvider
        appName={themeSelector.appName}
        globalCss={themeSelector.globalCss}
        appCss={themeSelector.appCss}
      >
        {content}
      </ThemeSelectorProvider>
    )
  }

  return content
}