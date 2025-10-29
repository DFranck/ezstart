'use client'

import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { CheckIcon, MinusIcon } from 'lucide-react'
import * as React from 'react'

import { cn } from '../lib/utils'

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

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, label, id, ...props }, ref) => {
  const checkboxElement = (
    <CheckboxPrimitive.Root
      ref={ref}
      id={id}
      data-slot="checkbox"
      className={cn(
        'peer border-input dark:bg-input/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
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
      <div className="flex items-center gap-2">
        {checkboxElement}
        <label
          htmlFor={id}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
        >
          {label}
        </label>
      </div>
    )
  }

  return checkboxElement
})

Checkbox.displayName = 'Checkbox'

export { Checkbox }

/**
 * Legacy export for backward compatibility
 * @deprecated Use named export Checkbox instead
 */
export default Checkbox
