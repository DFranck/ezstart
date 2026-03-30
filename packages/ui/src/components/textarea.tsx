'use client'

import { ComponentProps, forwardRef, useEffect, useRef, useState } from 'react'
import { cn } from '../lib/utils'
import { paddingX, paddingY, fontSize, radius } from '../lib/design-system/tokens'

/**
 * TextArea Component - Enhanced with Auto-Resize & Character Count
 *
 * Accessible textarea with optional auto-resize, character counting, and label.
 *
 * @example
 * // Basic usage
 * <TextArea label="Description" placeholder="Enter description..." />
 *
 * @example
 * // With auto-resize
 * <TextArea autoResize maxRows={10} />
 *
 * @example
 * // With character count
 * <TextArea showCharCount maxLength={500} />
 */

export interface TextAreaProps extends ComponentProps<'textarea'> {
  /** Label text */
  label?: string
  /** Enable auto-resize based on content */
  autoResize?: boolean
  /** Maximum rows when auto-resizing */
  maxRows?: number
  /** Show character count */
  showCharCount?: boolean
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    { label, className, autoResize, maxRows = 10, showCharCount, maxLength, value, ...props },
    ref
  ) => {
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
            'min-h-[80px] sm:min-h-[60px]', // Responsive min-height (mobile 80px, desktop 60px)
            paddingX.default, // px-4 sm:px-3
            paddingY.default, // py-2 sm:py-2
            fontSize.base, // text-base sm:text-sm
            radius.default, // rounded-md
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

TextArea.displayName = 'TextArea'

/**
 * Legacy export for backward compatibility
 * @deprecated Use named export TextArea instead
 */
export default TextArea
