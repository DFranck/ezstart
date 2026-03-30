'use client'

import { getApiUrl, type AppName } from '@ezstart/config/urls'
import { ThemeEditor as UIThemeEditor } from '@ezstart/ui/components'
import { useTheme } from 'next-themes'
import { useThemeSelectorContext } from '../theme-selector-context'
import { ThemeSwitcher } from './ThemeSwitcher'

/**
 * ThemeEditor component integrated with next-themes
 *
 * Usage:
 * 1. Enable in ThemeProvider with `themeSelector` prop
 * 2. Use this component anywhere in your app
 *
 * Example:
 * ```tsx
 * <ThemeProvider themeSelector={{ appName: 'green-pulse', globalCss, appCss }}>
 *   <ThemeEditor />
 * </ThemeProvider>
 * ```
 */
export function ThemeEditor({
  adminOnly = false,
  enableHistory = true,
  showPresets = false,
  getAuthState,
}: {
  adminOnly?: boolean
  enableHistory?: boolean
  showPresets?: boolean
  getAuthState?: () => {
    user: { roles?: string[]; permissions?: string[] } | null
    isAuthenticated: boolean
  }
}) {
  const { globalCss, appCss, appName } = useThemeSelectorContext()
  const { theme, resolvedTheme } = useTheme()
  const actualTheme = resolvedTheme || theme

  // Build full API URL for theme endpoint
  const apiUrl = getApiUrl(appName as AppName)
  const apiEndpoint = `${apiUrl}/api/theme`

  return (
    <UIThemeEditor
      themeSwitcher={<ThemeSwitcher />}
      globalCss={globalCss}
      appCss={appCss}
      appName={appName}
      currentTheme={actualTheme === 'dark' ? 'dark' : 'light'}
      apiEndpoint={apiEndpoint}
      adminOnly={adminOnly}
      enableHistory={enableHistory}
      showPresets={showPresets}
      getAuthState={getAuthState}
    />
  )
}

/** @deprecated Use ThemeEditor instead */
export const ThemeSelector = ThemeEditor
