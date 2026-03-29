/**
 * Server-side theme override fetching
 * Prevents theme flash by loading overrides during SSR
 */

import type { AppName } from '@ezstart/config/urls'
import { getApiUrl } from '@ezstart/config/urls'

export interface ThemeOverrides {
  overrides: Record<string, string>
  appName: string
}

/**
 * Fetch theme overrides from API (server-side only)
 * Returns empty object if API call fails (graceful fallback to CSS defaults)
 */
export async function fetchThemeOverrides(appName: string): Promise<ThemeOverrides> {
  try {
    const apiUrl = getApiUrl(appName as AppName)
    const endpoint = `${apiUrl}/api/theme`

    // Server-side fetch with short timeout to avoid blocking render
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Use Next.js cache config for ISR
      next: {
        revalidate: 60, // Revalidate every 60 seconds
        tags: [`theme-${appName}`],
      },
      // Timeout after 2 seconds to avoid blocking
      signal: AbortSignal.timeout(2000),
    } as RequestInit)

    if (!response.ok) {
      console.warn(`[fetchThemeOverrides] API returned ${response.status}, using CSS defaults`)
      return { appName, overrides: {} }
    }

    const data = await response.json()

    if (data.success && data.data?.overrides) {
      return {
        appName,
        overrides: data.data.overrides,
      }
    }

    return { appName, overrides: {} }
  } catch (error) {
    // Network error or timeout - fail gracefully
    console.warn(`[fetchThemeOverrides] Failed to fetch theme for ${appName}:`, error)
    return { appName, overrides: {} }
  }
}

/**
 * Generate CSS from theme overrides
 * Handles light:/dark: prefixes and generates proper :root/.dark rules
 */
export function generateThemeCSS(overrides: Record<string, string>): string {
  if (Object.keys(overrides).length === 0) {
    return ''
  }

  const lightOverrides: string[] = []
  const darkOverrides: string[] = []

  Object.entries(overrides).forEach(([key, value]) => {
    if (key.startsWith('light:')) {
      const varName = key.substring(6) // Remove "light:" prefix
      lightOverrides.push(`  ${varName}: ${value};`)
    } else if (key.startsWith('dark:')) {
      const varName = key.substring(5) // Remove "dark:" prefix
      darkOverrides.push(`  ${varName}: ${value};`)
    } else {
      // App-specific variables (no prefix) - apply to both themes
      lightOverrides.push(`  ${key}: ${value};`)
      darkOverrides.push(`  ${key}: ${value};`)
    }
  })

  // Generate CSS
  let css = ''
  if (lightOverrides.length > 0) {
    css += `:root {\n${lightOverrides.join('\n')}\n}\n`
  }
  if (darkOverrides.length > 0) {
    css += `.dark {\n${darkOverrides.join('\n')}\n}\n`
  }

  return css
}
