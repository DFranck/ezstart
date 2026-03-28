import * as React from 'react'

import { cn } from '../lib/utils'
import { touchHeight, paddingX, paddingY, fontSize, radius } from '../lib/design-system/tokens'

/**
 * Input Component - Enhanced with Icon Support
 *
 * Accessible input with optional start/end icons and variants.
 *
 * @example
 * // Basic usage
 * <Input type="email" placeholder="Email" />
 *
 * @example
 * // With start icon
 * <Input
 *   type="search"
 *   placeholder="Search..."
 *   startIcon={<Icon name="lucide:Search" size={16} />}
 * />
 *
 * @example
 * // With end icon (e.g., clear button)
 * <Input
 *   type="text"
 *   placeholder="Username"
 *   endIcon={<Icon name="lucide:X" size={16} />}
 * />
 */

export interface InputProps extends React.ComponentProps<'input'> {
  /** Icon to display at the start of the input */
  startIcon?: React.ReactNode
  /** Icon to display at the end of the input */
  endIcon?: React.ReactNode
  /** Wrapper className for the container (when icons are used) */
  wrapperClassName?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, startIcon, endIcon, wrapperClassName, ...props }, ref) => {
    const inputElement = (
      <input
        type={type}
        data-slot="input"
        className={cn(
          'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex w-full min-w-0 border bg-transparent shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
          touchHeight.default, // h-11 sm:h-9 (44px mobile, 36px desktop)
          paddingX.default, // px-4 sm:px-3
          paddingY.default, // py-2 sm:py-2
          fontSize.base, // text-base sm:text-sm
          radius.default, // rounded-md
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
          // Adjust padding when icons are present
          startIcon && 'pl-10',
          endIcon && 'pr-10',
          className
        )}
        ref={ref}
        {...props}
      />
    )

    // If no icons, return input directly
    if (!startIcon && !endIcon) {
      return inputElement
    }

    // Wrap in container with icons
    return (
      <div className={cn('relative', wrapperClassName)}>
        {startIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            {startIcon}
          </div>
        )}
        {inputElement}
        {endIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {endIcon}
          </div>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }

/**
 * Legacy export for backward compatibility
 * @deprecated Use named export Input instead
 */
export default Input
