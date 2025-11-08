'use client'

import { useCallback, useState } from 'react'
import type { ThemeConfig, ThemeHistoryEntry, UseThemeEditorOptions } from '../types'
import { applyThemeVariables, getThemeDiff, sanitizeColorValues } from '../utils'

export interface UseThemeEditorReturn {
  /** Local changes (not yet saved) */
  localChanges: Record<string, string>

  /** Update a single variable */
  updateVariable: (varName: string, value: string) => void

  /** Update multiple variables */
  updateVariables: (changes: Record<string, string>) => void

  /** Save changes to API */
  saveChanges: (apiEndpoint: string, defaultTheme: ThemeConfig) => Promise<void>

  /** Reset all local changes (unsaved edits only) */
  resetLocalChanges: () => void

  /** Reset to CSS defaults (delete all DB overrides) */
  resetToDefaults: (apiEndpoint: string) => Promise<void>

  /** Saving state */
  isSaving: boolean

  /** Save error */
  saveError: Error | null

  /** Undo/Redo history */
  history: ThemeHistoryEntry[]

  /** Current history index */
  historyIndex: number

  /** Undo last change */
  undo: () => void

  /** Redo last undone change */
  redo: () => void

  /** Can undo */
  canUndo: boolean

  /** Can redo */
  canRedo: boolean
}

/**
 * Hook to manage theme editing with optimistic updates and history
 */
export function useThemeEditor(
  initialOverrides: Record<string, string>,
  options: UseThemeEditorOptions = {}
): UseThemeEditorReturn {
  const { enableHistory = true, onSave, onError } = options

  const [localChanges, setLocalChanges] = useState<Record<string, string>>(initialOverrides)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<Error | null>(null)

  // History for undo/redo
  const [history, setHistory] = useState<ThemeHistoryEntry[]>([
    {
      timestamp: Date.now(),
      overrides: initialOverrides,
    },
  ])
  const [historyIndex, setHistoryIndex] = useState(0)

  /**
   * Add entry to history
   */
  const addToHistory = useCallback(
    (overrides: Record<string, string>, description?: string) => {
      if (!enableHistory) return

      const entry: ThemeHistoryEntry = {
        timestamp: Date.now(),
        overrides,
        description,
      }

      // Remove any "future" history if we're not at the end
      const newHistory = history.slice(0, historyIndex + 1)
      newHistory.push(entry)

      // Limit history to 50 entries
      if (newHistory.length > 50) {
        newHistory.shift()
      } else {
        setHistoryIndex(historyIndex + 1)
      }

      setHistory(newHistory)
    },
    [enableHistory, history, historyIndex]
  )

  /**
   * Update a single variable
   */
  const updateVariable = useCallback(
    (varName: string, value: string) => {
      setLocalChanges(prev => {
        const newChanges = {
          ...prev,
          [varName]: value,
        }

        // Add to history (using the new value)
        addToHistory(newChanges, `Changed ${varName}`)

        return newChanges
      })

      // Apply immediately (optimistic update)
      applyThemeVariables({ [varName]: value })
    },
    [addToHistory]
  )

  /**
   * Update multiple variables
   */
  const updateVariables = useCallback(
    (changes: Record<string, string>) => {
      const newChanges = {
        ...localChanges,
        ...changes,
      }

      setLocalChanges(newChanges)

      // Apply immediately (optimistic update)
      applyThemeVariables(changes)

      // Add to history
      addToHistory(newChanges, `Changed ${Object.keys(changes).length} variables`)
    },
    [localChanges, addToHistory]
  )

  /**
   * Save changes to API
   */
  const saveChanges = useCallback(
    async (apiEndpoint: string, defaultTheme: ThemeConfig) => {
      setIsSaving(true)
      setSaveError(null)

      // Get only the differences from default theme
      const diff = getThemeDiff(defaultTheme, localChanges)

      // Sanitize values before sending
      const sanitized = sanitizeColorValues(diff)

      try {
        const response = await fetch(apiEndpoint, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            overrides: sanitized,
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to save theme: ${response.statusText}`)
        }

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error || 'Failed to save theme')
        }

        // Success!
        onSave?.(sanitized)
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        setSaveError(error)
        onError?.(error)

        // Rollback optimistic update
        // Note: We don't rollback here because we want to keep local changes
        // User can manually reset if needed
        throw error
      } finally {
        setIsSaving(false)
      }
    },
    [localChanges, onSave, onError]
  )

  /**
   * Reset all local changes (unsaved edits)
   */
  const resetLocalChanges = useCallback(() => {
    setLocalChanges({})
    setSaveError(null)

    // Clear history
    setHistory([
      {
        timestamp: Date.now(),
        overrides: {},
      },
    ])
    setHistoryIndex(0)
  }, [])

  /**
   * Reset to CSS defaults (delete all overrides from DB)
   */
  const resetToDefaults = useCallback(
    async (apiEndpoint: string) => {
      setIsSaving(true)
      setSaveError(null)

      try {
        const response = await fetch(apiEndpoint, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error(`Failed to reset theme: ${response.statusText}`)
        }

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error || 'Failed to reset theme')
        }

        // Clear local changes too
        setLocalChanges({})
        setSaveError(null)

        // Success!
        onSave?.({})
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        setSaveError(error)
        onError?.(error)
        throw error
      } finally {
        setIsSaving(false)
      }
    },
    [onSave, onError]
  )

  /**
   * Undo last change
   */
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      const previousState = history[newIndex]

      if (previousState) {
        setHistoryIndex(newIndex)
        setLocalChanges(previousState.overrides)
        applyThemeVariables(previousState.overrides)
      }
    }
  }, [history, historyIndex])

  /**
   * Redo last undone change
   */
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      const nextState = history[newIndex]

      if (nextState) {
        setHistoryIndex(newIndex)
        setLocalChanges(nextState.overrides)
        applyThemeVariables(nextState.overrides)
      }
    }
  }, [history, historyIndex])

  return {
    localChanges,
    updateVariable,
    updateVariables,
    saveChanges,
    resetLocalChanges,
    resetToDefaults,
    isSaving,
    saveError,
    history,
    historyIndex,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
  }
}
