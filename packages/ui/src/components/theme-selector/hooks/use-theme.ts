'use client'

import { logger } from '@ezstart/logger'
import { useCallback, useEffect, useState } from 'react'
import type { ThemeConfig, ThemeVariable, UseThemeOptions } from '../types'
import { themeApiResponseSchema } from '../schemas/theme.schema'
import { applyThemeVariables, mergeTheme, variablesToRecord } from '../utils'

export interface UseThemeReturn {
  /** Current theme variables (merged with overrides) */
  variables: ThemeVariable[]

  /** Current overrides from DB */
  overrides: Record<string, string>

  /** Loading state */
  isLoading: boolean

  /** Error state */
  error: Error | null

  /** Reload theme from API */
  reloadTheme: () => Promise<void>

  /** Check if theme has been customized */
  isCustomized: boolean
}

/**
 * Hook to manage theme loading and state
 * Handles API calls with graceful fallbacks
 */
export function useTheme(options: UseThemeOptions): UseThemeReturn {
  const { appName, defaultTheme, apiEndpoint = '/theme', onError } = options

  const [variables, setVariables] = useState<ThemeVariable[]>(defaultTheme.variables)
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadTheme = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Try to fetch theme from API
      const response = await fetch(apiEndpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        // API exists but returned error -> use default theme
        logger.warn(`Theme API returned ${response.status}, using default theme`)
        setVariables(defaultTheme.variables)
        return
      }

      const data = await response.json()

      // Validate response
      const validated = themeApiResponseSchema.safeParse(data)

      if (!validated.success) {
        throw new Error('Invalid API response format')
      }

      if (validated.data.data?.overrides) {
        // Apply overrides
        const newOverrides = validated.data.data.overrides
        setOverrides(newOverrides)

        const merged = mergeTheme(defaultTheme, newOverrides)
        setVariables(merged)

        // Apply to DOM
        applyThemeVariables(newOverrides)
      } else {
        // No overrides -> use default
        setVariables(defaultTheme.variables)
      }
    } catch (err) {
      // Network error or API doesn't exist -> use default theme
      const error = err instanceof Error ? err : new Error('Failed to load theme')
      logger.warn('Failed to load theme, using default:', error.message)

      setError(error)
      setVariables(defaultTheme.variables)

      onError?.(error)
    } finally {
      setIsLoading(false)
    }
  }, [appName, apiEndpoint, defaultTheme, onError])

  // Load theme on mount
  useEffect(() => {
    loadTheme()
  }, [loadTheme])

  return {
    variables,
    overrides,
    isLoading,
    error,
    reloadTheme: loadTheme,
    isCustomized: Object.keys(overrides).length > 0,
  }
}
