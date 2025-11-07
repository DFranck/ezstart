'use client'

import { createContext, useContext } from 'react'

export interface ThemeSelectorContextValue {
  /** Global theme CSS (from globals.css) */
  globalCss: string
  /** App-specific theme CSS */
  appCss: string
  /** App name for API endpoint */
  appName: string
}

const ThemeSelectorContext = createContext<ThemeSelectorContextValue | null>(null)

export function ThemeSelectorProvider({
  children,
  globalCss,
  appCss,
  appName,
}: {
  children: React.ReactNode
  globalCss: string
  appCss: string
  appName: string
}) {
  return (
    <ThemeSelectorContext.Provider value={{ globalCss, appCss, appName }}>
      {children}
    </ThemeSelectorContext.Provider>
  )
}

/**
 * Hook to access theme CSS in ThemeSelector
 * Throws if used outside ThemeSelectorProvider
 */
export function useThemeSelectorContext(): ThemeSelectorContextValue {
  const context = useContext(ThemeSelectorContext)
  if (!context) {
    throw new Error('useThemeSelectorContext must be used within ThemeSelectorProvider')
  }
  return context
}
