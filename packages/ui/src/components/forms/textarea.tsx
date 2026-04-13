'use client'

import { ComponentProps, forwardRef, useEffect, useRef, useState } from 'react'
import * as React from 'react'
import { cn } from '../../lib/utils'
import {
  paddingX,
  paddingY,
  fontSize,
  radius as radiusTokens,
} from '../../lib/design-system/tokens'
import { useDesignTokens } from '../../lib/design-system/DesignTokenContext'

/**
 * Textarea Component - Enhanced with Auto-Resize, Character Count & Design Tokens
 *
 * Accessible textarea with optional auto-resize, character counting, label,
 * and design token support (size, density, radius).
 * Inherits tokens from DesignTokenProvider context (e.g. inside a Card).
 *
 * @example
 * // Basic usage
 * <Textarea label="Description" placeholder="Enter description..." />
 *
 * @example
 * // With auto-resize
 * <Textarea autoResize maxRows={10} />
 *
 * @example
 * // With size
 * <Textarea size="sm" placeholder="Small textarea" />
 *
 * @example
 * // With character count
 * <Textarea showCharCount maxLength={500} />
 */

type TextareaSize = 'sm' | 'default' | 'lg'
type TextareaDensity = 'compact' | 'default' | 'relaxed'
type TextareaRadius = 'none' | 'sm' | 'default' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'

/** Size → fontSize + minHeight mapping */
const sizeConfig: Record<TextareaSize, { fontSize: string; minHeight: string }> = {
  sm: { fontSize: fontSize.sm, minHeight: 'min-h-[64px] sm:min-h-[48px]' },
  default: { fontSize: fontSize.base, minHeight: 'min-h-[80px] sm:min-h-[60px]' },
  lg: { fontSize: fontSize.lg, minHeight: 'min-h-[96px] sm:min-h-[72px]' },
}

/** Size → paddingX mapping */
const sizePaddingX: Record<TextareaSize, string> = {
  sm: paddingX.sm,
  default: paddingX.default,
  lg: paddingX.lg,
}

/** Density → paddingY override */
const densityPaddingY: Record<TextareaDensity, string> = {
  compact: paddingY.xs,
  default: paddingY.default,
  relaxed: paddingY.md,
}

export interface TextareaProps extends ComponentProps<'textarea'> {
  /** Label text */
  label?: string
  /** Enable auto-resize based on content */
  autoResize?: boolean
  /** Maximum rows when auto-resizing */
  maxRows?: number
  /** Show character count */
  showCharCount?: boolean
  /** Size of the textarea (font size + min-height) */
  size?: TextareaSize
  /** Density adjusts vertical padding */
  density?: TextareaDensity
  /** Border radius */
  radius?: TextareaRadius
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      className,
      autoResize,
      maxRows = 10,
      showCharCount,
      maxLength,
      value,
      size: sizeProp,
      density: densityProp,
      radius: radiusProp,
      ...props
    },
    ref
  ) => {
    const inherited = useDesignTokens()
    const size = (sizeProp ?? inherited.size ?? 'default') as TextareaSize
    const density = (densityProp ?? inherited.density ?? 'default') as TextareaDensity
    const resolvedRadius = (radiusProp ?? inherited.radius ?? 'default') as TextareaRadius

    const [charCount, setCharCount] = useState(0)
    const internalRef = useRef<HTMLTextAreaElement>(null)
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef

    // Auto-resize logic
    useEffect(() => {
      if (!autoResize || !textareaRef.current) return

      const textarea = textareaRef.current
      const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight || '20')
      const maxHeight = lineHeight * maxRows

      // Reset height to get accurate scrollHeight
      textarea.style.height = 'auto'

      // Set new height (capped at maxHeight)
      const newHeight = Math.min(textarea.scrollHeight, maxHeight)
      textarea.style.height = `${newHeight}px`
    }, [value, autoResize, maxRows, textareaRef])

    // Character count logic
    useEffect(() => {
      if (showCharCount && value) {
        setCharCount(String(value).length)
      }
    }, [value, showCharCount])

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (showCharCount) {
        setCharCount(e.target.value.length)
      }
      props.onChange?.(e)
    }

    return (
      <div className="space-y-2">
        {label && <label className="text-sm font-medium text-foreground">{label}</label>}
        <textarea
          ref={textareaRef}
          data-slot="textarea"
          className={cn(
            'placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex w-full border bg-transparent shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
            sizeConfig[size].minHeight,
            sizePaddingX[size],
            densityPaddingY[density],
            sizeConfig[size].fontSize,
            radiusTokens[resolvedRadius],
            'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
            'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
            autoResize ? 'resize-none overflow-hidden' : 'resize-vertical',
            className
          )}
          maxLength={maxLength}
          value={value}
          onChange={handleChange}
          {...props}
        />
        {showCharCount && (
          <div className="text-xs text-muted-foreground text-right">
            {charCount}
            {maxLength && ` / ${maxLength}`}
          </div>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

export default Textarea
