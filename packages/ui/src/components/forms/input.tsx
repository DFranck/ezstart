import * as React from 'react'

import { cn } from '../../lib/utils'
import { radius as radiusTokens, paddingY } from '../../lib/design-system/tokens'
import { formInputVariantConfig } from '../../lib/design-system/variants'
import { useDesignTokens } from '../../lib/design-system/DesignTokenContext'

/**
 * Input Component - Enhanced with Icon Support & Design Tokens
 *
 * Accessible input with optional start/end icons, size, density, and radius tokens.
 * Inherits tokens from DesignTokenProvider context (e.g. inside a Card).
 *
 * @example
 * // Basic usage
 * <Input type="email" placeholder="Email" />
 *
 * @example
 * // With size
 * <Input size="sm" placeholder="Small input" />
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
 * // Inherits from Card context
 * <Card size="sm">
 *   <CardContent>
 *     <Input placeholder="Inherits sm size" />
 *   </CardContent>
 * </Card>
 */

type InputSize = 'sm' | 'default' | 'lg'
type InputDensity = 'compact' | 'default' | 'relaxed'
type InputRadius = 'none' | 'sm' | 'default' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'

export interface InputProps extends Omit<React.ComponentProps<'input'>, 'size'> {
  /** Icon to display at the start of the input */
  startIcon?: React.ReactNode
  /** Icon to display at the end of the input */
  endIcon?: React.ReactNode
  /** Wrapper className for the container (when icons are used) */
  wrapperClassName?: string
  /** Size of the input (touch target height + font size). Overrides native HTML size attribute. */
  size?: InputSize
  /** Native HTML size attribute (character width) */
  htmlSize?: number
  /** Density adjusts vertical padding */
  density?: InputDensity
  /** Border radius */
  radius?: InputRadius
}

/** Density padding overrides for Input */
const densityPaddingY: Record<InputDensity, string> = {
  compact: paddingY.xs,
  default: '', // use size default (no override)
  relaxed: paddingY.md,
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      startIcon,
      endIcon,
      wrapperClassName,
      size: sizeProp,
      htmlSize,
      density: densityProp,
      radius: radiusProp,
      ...props
    },
    ref
  ) => {
    const inherited = useDesignTokens()
    const size = (sizeProp ?? inherited.size ?? 'default') as InputSize
    const density = (densityProp ?? inherited.density ?? 'default') as InputDensity
    const resolvedRadius = (radiusProp ?? inherited.radius ?? 'default') as InputRadius

    const inputElement = (
      <input
        type={type}
        size={htmlSize}
        data-slot="input"
        className={cn(
          'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex w-full min-w-0 border bg-transparent shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
          formInputVariantConfig.size[size],
          radiusTokens[resolvedRadius],
          density !== 'default' && densityPaddingY[density],
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
