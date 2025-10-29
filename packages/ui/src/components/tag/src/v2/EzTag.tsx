/**
 * EzTag v2 - Optimized Polymorphic Component
 *
 * Features:
 * - Full accessibility (ARIA attributes)
 * - Performance optimized (React.memo, useMemo)
 * - Type-safe polymorphism
 * - Common variants (layout, variant, size, intent)
 * - Radix Slot support (asChild)
 * - DOM-safe props filtering
 *
 * @example
 * <EzTag as="section" layout="col" size="md" intent="success">
 *   <EzTag as="h2" size="h2">Title</EzTag>
 *   <EzTag as="p">Content</EzTag>
 * </EzTag>
 */

import { Slot } from '@radix-ui/react-slot'
import React, { ElementType, useMemo } from 'react'
import { cn } from '../../../../lib/utils'
import { EzTagProps, INTENT_ARIA_MAP } from './types'
import { ezTagVariants } from './variants'

/**
 * Filter props to only pass valid DOM attributes
 * Prevents React warnings for non-standard attributes
 */
function filterDomSafeProps(props: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(props).filter(([key, value]) => {
      // Keep only valid DOM attributes
      if (key.startsWith('data-') || key.startsWith('aria-')) return true
      if (key === 'id' || key === 'className' || key === 'style') return true
      if (key === 'role') return true
      if (typeof value === 'string') return true
      if (typeof value === 'number') return true
      if (typeof value === 'boolean') return true
      if (typeof value === 'function' && key.startsWith('on')) return true
      return false
    })
  )
}

/**
 * Build ARIA attributes based on intent and explicit props
 */
function buildAriaAttributes(props: EzTagProps): Record<string, any> {
  const {
    intent,
    ariaLabel,
    ariaLabelledBy,
    ariaDescribedBy,
    ariaRole,
    ariaLive,
    ariaHidden,
  } = props

  const ariaAttrs: Record<string, any> = {}

  // Auto-inject ARIA based on intent
  if (intent && INTENT_ARIA_MAP[intent]) {
    Object.assign(ariaAttrs, INTENT_ARIA_MAP[intent])
  }

  // Explicit ARIA props override auto-injected ones
  if (ariaLabel) ariaAttrs['aria-label'] = ariaLabel
  if (ariaLabelledBy) ariaAttrs['aria-labelledby'] = ariaLabelledBy
  if (ariaDescribedBy) ariaAttrs['aria-describedby'] = ariaDescribedBy
  if (ariaRole) ariaAttrs.role = ariaRole
  if (ariaLive) ariaAttrs['aria-live'] = ariaLive
  if (ariaHidden !== undefined) ariaAttrs['aria-hidden'] = ariaHidden

  return ariaAttrs
}

/**
 * EzTag Component (non-memoized)
 */
function EzTagComponent<T extends ElementType = 'div'>(
  props: EzTagProps<T>
) {
  const {
    as,
    asChild = false,
    children,
    className,
    layout,
    variant,
    size,
    intent,
    align,
    debug = false,
    ariaLabel,
    ariaLabelledBy,
    ariaDescribedBy,
    ariaRole,
    ariaLive,
    ariaHidden,
    ...rest
  } = props

  // Determine component to render
  const Component: ElementType = asChild ? Slot : (as || 'div')

  // Build variant classes (memoized for performance)
  const variantClasses = useMemo(
    () =>
      ezTagVariants({
        layout,
        variant,
        size,
        intent,
        align,
        debug,
      }),
    [layout, variant, size, intent, align, debug]
  )

  // Merge variant classes with custom className (memoized)
  const mergedClassName = useMemo(
    () => cn(variantClasses, className),
    [variantClasses, className]
  )

  // Build ARIA attributes (memoized)
  const ariaAttributes = useMemo(
    () => buildAriaAttributes({ intent, ariaLabel, ariaLabelledBy, ariaDescribedBy, ariaRole, ariaLive, ariaHidden } as EzTagProps),
    [intent, ariaLabel, ariaLabelledBy, ariaDescribedBy, ariaRole, ariaLive, ariaHidden]
  )

  // Filter DOM-safe props (memoized)
  const domSafeProps = useMemo(
    () => filterDomSafeProps(rest as Record<string, any>),
    [rest]
  )

  return (
    <Component
      className={mergedClassName}
      {...ariaAttributes}
      {...domSafeProps}
    >
      {children}
    </Component>
  )
}

/**
 * EzTag with React.memo for performance
 * Only re-renders if props actually change
 */
export const EzTag = React.memo(EzTagComponent) as typeof EzTagComponent & { displayName: string }

if (EzTag) {
  EzTag.displayName = 'EzTag'
}

/**
 * Default export
 */
export default EzTag
