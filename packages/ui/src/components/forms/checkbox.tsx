'use client'

import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { CheckIcon, MinusIcon } from 'lucide-react'
import * as React from 'react'

import { touchSmall } from '../../lib/design-system/tokens'
import { cn } from '../../lib/utils'
import { useDesignTokens } from '../../lib/design-system/DesignTokenContext'
import { useDeprecationWarning } from '../../hooks/use-deprecation-warning'
import { Label } from './label'
import { Span } from '../tag'

/**
 * Checkbox Component - Enhanced with Indeterminate State
 *
 * Accessible checkbox with support for indeterminate state (partial selection).
 * Built on Radix UI primitives for WCAG 2.1 AA compliance.
 *
 * @example
 * // Basic checkbox
 * <Checkbox checked={checked} onCheckedChange={setChecked} />
 *
 * @example
 * // With label
 * <div className="flex items-center gap-2">
 *   <Checkbox id="terms" />
 *   <label htmlFor="terms">Accept terms</label>
 * </div>
 *
 * @example
 * // Indeterminate state (select all with partial selection)
 * <Checkbox
 *   checked={allSelected ? true : someSelected ? 'indeterminate' : false}
 *   onCheckedChange={handleSelectAll}
 * />
 */

export interface CheckboxProps extends React.ComponentProps<typeof CheckboxPrimitive.Root> {
  /** Optional label for the checkbox */
  label?: string
}

const Checkbox = React.forwardRef<React.ElementRef<typeof CheckboxPrimitive.Root>, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const inherited = useDesignTokens()
    const sizeClass =
      {
        sm: 'size-4 sm:size-3.5',
        default: touchSmall.checkbox,
        lg: 'size-6 sm:size-5',
      }[(inherited.size ?? 'default') as 'sm' | 'default' | 'lg'] ?? touchSmall.checkbox

    const checkboxElement = (
      <CheckboxPrimitive.Root
        ref={ref}
        id={id}
        data-slot="checkbox"
        className={cn(
          'peer border-input dark:bg-input/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
          sizeClass,
          // Indeterminate state styling
          'data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground data-[state=indeterminate]:border-primary',
          className
        )}
        {...props}
      >
        <CheckboxPrimitive.Indicator
          data-slot="checkbox-indicator"
          className="flex items-center justify-center text-current transition-none"
        >
          {props.checked === 'indeterminate' ? (
            <MinusIcon className="size-3.5" />
          ) : (
            <CheckIcon className="size-3.5" />
          )}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
    )

    if (label) {
      return (
        <Span className="flex items-center">
          {checkboxElement}
          <Label htmlFor={id}>{label}</Label>
        </Span>
      )
    }

    return checkboxElement
  }
)

Checkbox.displayName = 'Checkbox'

export { Checkbox }

/**
 * Legacy export for backward compatibility
 * @deprecated Use named export Checkbox instead
 */
const DeprecatedDefaultCheckbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>((props, ref) => {
  useDeprecationWarning(
    'Checkbox default export',
    'named export `Checkbox` from @ezstart/ui/components'
  )
  return <Checkbox ref={ref} {...props} />
})

DeprecatedDefaultCheckbox.displayName = 'DeprecatedDefaultCheckbox'

export default DeprecatedDefaultCheckbox
