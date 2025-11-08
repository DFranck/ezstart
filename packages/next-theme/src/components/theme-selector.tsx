'use client'

import { getApiUrl } from '@ezstart/config/urls'
import { ThemeSelector as UIThemeSelector } from '@ezstart/ui/components'
import { useTheme } from 'next-themes'
import { useThemeSelectorContext } from '../theme-selector-context'
import { ThemeSwitcher } from './ThemeSwitcher'

/**
 * ThemeSelector component integrated with next-themes
 *
 * Usage:
 * 1. Enable in ThemeProvider with `themeSelector` prop
 * 2. Use this component anywhere in your app
 *
 * Example:
 * ```tsx
 * <ThemeProvider themeSelector={{ appName: 'green-pulse', globalCss, appCss }}>
 *   <ThemeSelector />
 * </ThemeProvider>
 * ```
 */
export function ThemeSelector({
  adminOnly = false,
  enableHistory = true,
  showPresets = false,
}: {
  adminOnly?: boolean
  enableHistory?: boolean
  showPresets?: boolean
}) {
  const { globalCss, appCss, appName } = useThemeSelectorContext()
  const { theme, resolvedTheme } = useTheme()
  const actualTheme = resolvedTheme || theme

  // Build full API URL for theme endpoint
  const apiUrl = getApiUrl(appName as any)
  const apiEndpoint = `${apiUrl}/api/theme`

  return (
    <UIThemeSelector
      themeSwitcher={<ThemeSwitcher />}
      globalCss={globalCss}
      appCss={appCss}
      appName={appName}
      currentTheme={actualTheme === 'dark' ? 'dark' : 'light'}
      apiEndpoint={apiEndpoint}
      adminOnly={adminOnly}
      enableHistory={enableHistory}
      showPresets={showPresets}
    />
  )
}
