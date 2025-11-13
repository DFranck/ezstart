import type { ThemeConfig, ThemeVariable } from '../types'

/**
 * Merge theme overrides with default theme
 * Overrides take precedence over defaults
 */
export function mergeTheme(
  defaultTheme: ThemeConfig,
  overrides: Record<string, string>
): ThemeVariable[] {
  const merged = [...defaultTheme.variables]

  // Apply overrides
  for (const [varName, value] of Object.entries(overrides)) {
    const index = merged.findIndex(v => v.name === varName)

    if (index !== -1 && merged[index]) {
      // Update existing variable
      merged[index] = {
        ...merged[index],
        value,
      }
    } else {
      // Add new variable (not in default theme)
      merged.push({
        name: varName,
        value,
        category: 'custom' as const,
        description: undefined,
      })
    }
  }

  return merged
}

/**
 * Get only the variables that differ from default theme
 * Returns a record of overridden variables
 *
 * IMPORTANT: Handles prefixed variable names (light:--background, dark:--background)
 * by stripping the prefix before comparing with defaultTheme
 */
export function getThemeDiff(
  defaultTheme: ThemeConfig,
  currentValues: Record<string, string>
): Record<string, string> {
  const diff: Record<string, string> = {}

  for (const [varName, currentValue] of Object.entries(currentValues)) {
    // Strip theme prefix (light:, dark:) if present
    const unprefixedVarName = varName.replace(/^(light|dark):/, '')

    // Find default variable using unprefixed name
    const defaultVar = defaultTheme.variables.find(v => v.name === unprefixedVarName)

    // Include if value changed or variable is new
    if (!defaultVar || defaultVar.value !== currentValue) {
      diff[varName] = currentValue
    }
  }

  return diff
}

/**
 * Convert theme variables array to record
 */
export function variablesToRecord(variables: ThemeVariable[]): Record<string, string> {
  return variables.reduce<Record<string, string>>((acc, variable) => {
    acc[variable.name] = variable.value
    return acc
  }, {})
}

/**
 * Apply CSS variables to document root
 */
export function applyThemeVariables(variables: Record<string, string>): void {
  if (typeof document === 'undefined') return

  for (const [varName, value] of Object.entries(variables)) {
    document.documentElement.style.setProperty(varName, value)
  }
}

/**
 * Remove CSS variable overrides from document root
 */
export function removeThemeVariables(varNames: string[]): void {
  if (typeof document === 'undefined') return

  for (const varName of varNames) {
    document.documentElement.style.removeProperty(varName)
  }
}

/**
 * Get current value of CSS variable from document
 */
export function getCssVariableValue(varName: string): string | null {
  if (typeof document === 'undefined') return null

  const value = getComputedStyle(document.documentElement).getPropertyValue(varName)
  return value.trim() || null
}

/**
 * Get all current CSS variable values from document
 */
export function getAllCssVariableValues(varNames: string[]): Record<string, string> {
  const values: Record<string, string> = {}

  for (const varName of varNames) {
    const value = getCssVariableValue(varName)
    if (value) {
      values[varName] = value
    }
  }

  return values
}

/**
 * Reset theme to default values
 */
export function resetTheme(defaultTheme: ThemeConfig): void {
  const defaultValues = variablesToRecord(defaultTheme.variables)
  applyThemeVariables(defaultValues)
}
