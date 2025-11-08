'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { runWithFeedback } from '../../utils'
import { Button } from '../button'
import { Checkbox } from '../checkbox'
import { Dropdown } from '../dropdown'
import { FloatingPanel, FloatingPanelFooter } from '../floating-panel'
import { Icon } from '../icon'
import { Spinner } from '../spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../tooltip'
import { ColorVariableEditor } from './components/color-variable-editor'
import { useTheme } from './hooks/use-theme'
import { useThemeEditor } from './hooks/use-theme-editor'
import type { ThemeEditorProps } from './types'
import {
  extractDarkVariables,
  extractRootVariables,
  invertColor,
  variablesToRecord,
  variablesToThemeConfig,
} from './utils'

export function ThemeEditor({
  themeSwitcher,
  globalCss,
  appCss,
  appName,
  currentTheme = 'light',
  apiEndpoint = '/theme',
  adminOnly = true,
  onSave,
  onError,
  enableHistory = true,
  showPresets = false,
}: ThemeEditorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [autoInvertForOppositeTheme, setAutoInvertForOppositeTheme] = useState(true)

  // Parse global CSS variables (light or dark)
  const globalTheme = useMemo(() => {
    const variables =
      currentTheme === 'dark' ? extractDarkVariables(globalCss) : extractRootVariables(globalCss)

    return variablesToThemeConfig(variables, 'global')
  }, [globalCss, currentTheme])

  // Parse app-specific CSS variables
  const appTheme = useMemo(() => {
    const variables = extractRootVariables(appCss)

    return variablesToThemeConfig(variables, appName)
  }, [appCss, appName])

  // Combined default theme for API
  const defaultTheme = useMemo(() => {
    return {
      variables: [...globalTheme.variables, ...appTheme.variables],
      metadata: { appName, version: '1.0.0' },
    }
  }, [globalTheme, appTheme, appName])

  // Load theme from API
  const { variables, overrides, isLoading, error, reloadTheme, isCustomized } = useTheme({
    appName,
    defaultTheme,
    apiEndpoint,
    onError,
  })

  // Editor state with optimistic updates
  const editor = useThemeEditor(overrides, {
    enableHistory,
    onSave: updatedOverrides => {
      onSave?.(updatedOverrides)
      reloadTheme()
    },
    onError,
  })

  // Get current values for the active theme mode
  const currentValues = useMemo(() => {
    // 1. Start with merged variables (default + DB overrides for current theme)
    const baseValues = variablesToRecord(variables)

    // 2. Filter overrides for current theme mode (light: or dark: prefix)
    const themePrefix = `${currentTheme}:`
    const themeModeOverrides: Record<string, string> = {}

    Object.entries(overrides).forEach(([key, value]) => {
      if (key.startsWith(themePrefix)) {
        // Remove prefix: "light:--background" → "--background"
        const varName = key.substring(themePrefix.length)
        themeModeOverrides[varName] = value
      }
    })

    // 3. Apply local changes for current theme
    const localThemeChanges: Record<string, string> = {}
    Object.entries(editor.localChanges).forEach(([key, value]) => {
      if (key.startsWith(themePrefix)) {
        const varName = key.substring(themePrefix.length)
        localThemeChanges[varName] = value
      }
    })

    const merged = {
      ...baseValues,
      ...themeModeOverrides,
      ...localThemeChanges,
    }

    return merged
  }, [variables, overrides, editor.localChanges, currentTheme])

  const handleSave = useCallback(async () => {
    await runWithFeedback({
      action: async () => {
        await editor.saveChanges(apiEndpoint, defaultTheme)
        setIsOpen(false)
      },
      toastLoading: { message: 'Saving theme...' },
      toastSuccess: { message: 'Theme saved successfully!' },
      toastError: { message: 'Failed to save theme' },
      onError: error => {
        console.error('Failed to save theme:', error)
      },
    })
  }, [editor, apiEndpoint, defaultTheme])

  const handleResetToDefaults = useCallback(() => {
    // Reset to CSS Defaults: Load all CSS default values into editor
    // This ignores DB overrides and loads pure CSS values
    // User must click "Save" to persist this reset to DB

    // Build a record of all CSS defaults with theme prefixes
    const cssDefaults: Record<string, string> = {}

    // For BOTH light and dark themes, set all variables to CSS defaults
    const allVariables = [...globalTheme.variables, ...appTheme.variables]

    ;['light', 'dark'].forEach(theme => {
      allVariables.forEach(variable => {
        const prefixedName = `${theme}:${variable.name}`
        cssDefaults[prefixedName] = variable.value
      })
    })

    // Replace local changes with CSS defaults (clears DB overrides in editor)
    editor.updateVariables(cssDefaults)
  }, [editor, globalTheme, appTheme])

  const handleDiscardChanges = useCallback(() => {
    // Discard Changes: Clear unsaved local edits only
    // Falls back to DB overrides (or CSS defaults if no DB overrides exist)
    editor.resetLocalChanges()
  }, [editor])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  const hasLocalChanges = Object.keys(editor.localChanges).length > 0

  // Apply theme overrides to DOM (both saved + local changes)
  useEffect(() => {
    if (typeof document === 'undefined') return

    const root = document.documentElement
    const allOverrides = { ...overrides, ...editor.localChanges }

    // Create or update style tag for theme overrides
    let styleTag = document.getElementById('theme-selector-overrides') as HTMLStyleElement
    if (!styleTag) {
      styleTag = document.createElement('style')
      styleTag.id = 'theme-selector-overrides'
      document.head.appendChild(styleTag)
    }

    // Build CSS rules for both light and dark themes
    const lightOverrides: string[] = []
    const darkOverrides: string[] = []

    Object.entries(allOverrides).forEach(([key, value]) => {
      if (key.startsWith('light:')) {
        const varName = key.substring(6) // Remove "light:" prefix
        lightOverrides.push(`  ${varName}: ${value};`)
      } else if (key.startsWith('dark:')) {
        const varName = key.substring(5) // Remove "dark:" prefix
        darkOverrides.push(`  ${varName}: ${value};`)
      } else {
        // App-specific variables (no prefix)
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

    styleTag.textContent = css
  }, [overrides, editor.localChanges])

  if (adminOnly) {
    // TODO: Add auth check here
    // if (!user?.roles.includes('admin')) return null
  }

  return (
    <>
      {/* Trigger Button - Opens modal directly */}
      <Button
        onClick={() => setIsOpen(true)}
        variant="ghost"
        size="icon"
        aria-label="Edit theme colors"
        title="Edit theme colors"
      >
        <Icon name="lucide:Palette" />
        {isCustomized && (
          <span
            className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary"
            title="Theme customized"
          />
        )}
      </Button>

      {/* Theme Editor Floating Panel */}
      <FloatingPanel
        open={isOpen}
        onClose={handleClose}
        title={
          <>
            <span>Theme Editor</span>
            <div className="ml-auto flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center">
                      <Checkbox
                        id="auto-invert-header"
                        checked={autoInvertForOppositeTheme}
                        onCheckedChange={checked => setAutoInvertForOppositeTheme(checked === true)}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-xs">
                      Auto-generate opposite theme colors: changing a color in {currentTheme} mode
                      will automatically invert it for {currentTheme === 'light' ? 'dark' : 'light'}{' '}
                      mode
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {themeSwitcher}
            </div>
          </>
        }
        size="md"
        closable
        minimizable
        maximizable
        draggable
      >
        <div className="space-y-6 relative">
          {/* Loading state */}
          {isLoading && <Spinner size="lg" className="mx-auto my-20" />}

          {/* Error state */}
          {error && !isLoading && (
            <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
              <Icon name="lucide:AlertCircle" className="inline mr-2" />
              Failed to load theme. Using default values.
            </div>
          )}

          {/* Editor content */}
          {!isLoading && (
            <>
              {/* Tabs: Global vs App */}
              <Tabs defaultValue="app" className="w-full">
                <TabsList className="w-full sticky top-0 z-10">
                  <TabsTrigger value="global" className="flex-1">
                    Global ({globalTheme.variables.length})
                  </TabsTrigger>
                  <TabsTrigger value="app" className="flex-1">
                    {appName} ({appTheme.variables.length})
                  </TabsTrigger>
                </TabsList>

                {/* Global Variables Tab */}
                <TabsContent value="global" className="mt-6">
                  <div className="space-y-3 pr-2" role="group" aria-label="Global theme variables">
                    {globalTheme.variables.map(variable => {
                      // Add theme prefix to variable name for storage
                      const prefixedVarName = `${currentTheme}:${variable.name}`

                      const handleChange = (_: string, value: string) => {
                        console.log(
                          `[handleChange] ${variable.name} = ${value} in ${currentTheme} mode`
                        )

                        // Update current theme
                        editor.updateVariable(prefixedVarName, value)

                        // Auto-invert for opposite theme if enabled
                        if (autoInvertForOppositeTheme) {
                          const oppositeTheme = currentTheme === 'light' ? 'dark' : 'light'
                          const oppositePrefixedVarName = `${oppositeTheme}:${variable.name}`
                          const invertedValue = invertColor(value)
                          console.log(
                            `[handleChange] Auto-invert: ${oppositePrefixedVarName} = ${invertedValue}`
                          )
                          editor.updateVariable(oppositePrefixedVarName, invertedValue)
                        }
                      }

                      const handleReset = () => {
                        // Reset: Remove customization for current theme (falls back to CSS defaults)
                        // We DON'T auto-generate opposite on reset - that doesn't make sense
                        // The goal is to go back to the original CSS values

                        // For now, just delete the override by setting to default
                        editor.updateVariable(prefixedVarName, variable.value)
                      }

                      return (
                        <ColorVariableEditor
                          key={variable.name}
                          variable={variable}
                          value={currentValues[variable.name] || variable.value}
                          onChange={handleChange}
                          onReset={handleReset}
                          showReset={true}
                        />
                      )
                    })}

                    {globalTheme.variables.length === 0 && (
                      <div className="py-8 text-center text-muted-foreground">
                        No global variables found
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* App-Specific Variables Tab */}
                <TabsContent value="app" className="mt-6">
                  <div
                    className="space-y-3 pr-2"
                    role="group"
                    aria-label={`${appName} theme variables`}
                  >
                    {appTheme.variables.map(variable => (
                      <ColorVariableEditor
                        key={variable.name}
                        variable={variable}
                        value={currentValues[variable.name] || variable.value}
                        onChange={editor.updateVariable}
                        onReset={varName => editor.updateVariable(varName, variable.value)}
                        showReset={true}
                      />
                    ))}

                    {appTheme.variables.length === 0 && (
                      <div className="py-8 text-center text-muted-foreground">
                        No {appName}-specific variables found
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              {/* Save error */}
              {editor.saveError && (
                <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <Icon name="lucide:AlertCircle" className="inline mr-2" />
                  {editor.saveError.message}
                </div>
              )}
            </>
          )}
        </div>

        {/* Screen reader announcements */}
        <div role="status" aria-live="polite" className="sr-only">
          {editor.isSaving && 'Saving theme changes...'}
          {hasLocalChanges && !editor.isSaving && 'Theme has unsaved changes'}
        </div>

        {/* Footer with actions */}
        <FloatingPanelFooter>
          <Dropdown
            trigger={
              <Button variant="outline" size="sm" disabled={editor.isSaving}>
                <Icon name="lucide:RotateCcw" size={16} />
                <span className="ml-2">Reset</span>
                <Icon name="lucide:ChevronUp" size={14} className="ml-1" />
              </Button>
            }
            items={[
              {
                label: (
                  <span className="flex items-center gap-2">
                    <Icon name="lucide:RotateCcw" size={16} />
                    Reset to Defaults
                  </span>
                ),
                value: 'reset-defaults',
                onSelect: handleResetToDefaults,
                disabled: !isCustomized && !hasLocalChanges,
              },
              {
                label: (
                  <span className="flex items-center gap-2">
                    <Icon name="lucide:X" size={16} />
                    Discard Changes
                  </span>
                ),
                value: 'discard-changes',
                onSelect: handleDiscardChanges,
                disabled: !hasLocalChanges,
              },
            ]}
            align="start"
            side="top"
          />

          <div className="flex-1" />

          <Button
            onClick={handleSave}
            variant="default"
            size="sm"
            disabled={editor.isSaving || !hasLocalChanges}
          >
            {editor.isSaving && (
              <Icon name="lucide:Loader2" className="animate-spin mr-2" size={16} />
            )}
            <span>{editor.isSaving ? 'Saving...' : 'Save Changes'}</span>
          </Button>
        </FloatingPanelFooter>
      </FloatingPanel>
    </>
  )
}
