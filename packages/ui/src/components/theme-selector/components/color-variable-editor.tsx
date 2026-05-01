'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../button'
import { Icon } from '../../icon'
import { Input } from '../../forms/input'
import { Label } from '../../forms/label'
import type { ThemeVariable } from '../types'
import { toHex, toOklch } from '../utils/oklch-to-hex'

interface ColorVariableEditorProps {
  variable: ThemeVariable
  value: string
  onChange: (varName: string, value: string) => void
  onReset?: (varName: string) => void
  showReset?: boolean
}

export function ColorVariableEditor({
  variable,
  value,
  onChange,
  onReset,
  showReset = true,
}: ColorVariableEditorProps) {
  const [inputValue, setInputValue] = useState(value)
  const [isValid, setIsValid] = useState(true)

  // Sync inputValue when value prop changes
  useEffect(() => {
    setInputValue(value)
  }, [value])

  const hasChanged = inputValue !== variable.value

  const handleInputChange = useCallback(
    (newValue: string) => {
      const isOklch = /^oklch\([\d.]+ [\d.]+ [\d.]+/.test(newValue.trim())
      const isHex = /^#[0-9A-Fa-f]{3,6}$/.test(newValue.trim())

      setIsValid(isOklch || isHex)

      // Only update if valid
      if (isOklch || isHex) {
        // IMPORTANT: Preserve original format
        // If original variable was OKLCH and user inputs HEX (from color picker),
        // convert back to OKLCH to maintain format consistency
        let finalValue = newValue.trim()

        const originalIsOklch = variable.value.trim().startsWith('oklch(')
        const inputIsHex = finalValue.startsWith('#')

        if (originalIsOklch && inputIsHex) {
          finalValue = toOklch(finalValue)
        }

        // Update local input state AFTER conversion
        setInputValue(finalValue)

        onChange(variable.name, finalValue)
      } else {
        // Invalid input - still update local state to show what user typed
        setInputValue(newValue)
      }
    },
    [variable.name, variable.value, value, onChange]
  )

  const handleReset = useCallback(() => {
    setInputValue(variable.value)
    setIsValid(true)
    onReset?.(variable.name)
    onChange(variable.name, variable.value)
  }, [variable, onReset, onChange])

  // Convert OKLCH to Hex for native color picker
  const colorValue = toHex(inputValue)

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
      role="group"
      aria-labelledby={`label-${variable.name}`}
    >
      {/* Color preview + picker */}
      <div className="flex-shrink-0">
        <label
          htmlFor={`color-${variable.name}`}
          className="block w-12 h-12 rounded-md border-2 border-border cursor-pointer overflow-hidden hover:border-primary transition-colors"
          style={{ backgroundColor: colorValue }}
          title="Click to pick color"
        >
          <input
            id={`color-${variable.name}`}
            type="color"
            value={colorValue}
            onChange={e => handleInputChange(e.target.value)}
            className="sr-only"
            aria-label={`Color picker for ${variable.name}`}
          />
        </label>
      </div>

      {/* Variable info + input */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <Label
            id={`label-${variable.name}`}
            htmlFor={`input-${variable.name}`}
            className="text-sm font-mono text-foreground"
          >
            {variable.name}
          </Label>

          {/* Changed indicator */}
          {hasChanged && (
            <span
              className="text-xs text-warning"
              aria-label="Modified"
              title="This value has been modified"
            >
              <Icon name="lucide:Pencil" size={14} />
            </span>
          )}
        </div>

        {/* Color value input */}
        <div className="flex items-center gap-2">
          <Input
            id={`input-${variable.name}`}
            type="text"
            value={inputValue}
            onChange={e => handleInputChange(e.target.value)}
            className={`flex-1 font-mono text-sm ${!isValid ? 'border-destructive' : ''}`}
            placeholder="oklch(0.5 0.2 250)"
            aria-invalid={!isValid}
            aria-describedby={!isValid ? `error-${variable.name}` : undefined}
          />

          {/* Reset button */}
          {showReset && hasChanged && (
            <Button
              onClick={handleReset}
              variant="ghost"
              size="sm"
              className="flex-shrink-0"
              aria-label={`Reset ${variable.name} to default`}
              title="Reset to default value"
            >
              <Icon name="lucide:RotateCcw" size={16} />
            </Button>
          )}
        </div>

        {/* Validation error */}
        {!isValid && (
          <p id={`error-${variable.name}`} className="text-xs text-destructive" role="alert">
            Invalid color format. Use OKLCH (e.g., oklch(0.5 0.2 250)) or hex (e.g., #ff0000)
          </p>
        )}
      </div>
    </div>
  )
}
