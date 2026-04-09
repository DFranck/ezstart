import { Slot } from '@radix-ui/react-slot'
import type { VariantProps } from 'class-variance-authority'
import React, { ComponentProps, ElementType, useMemo } from 'react'
import { cn } from '../../../../lib/utils'
import { useDesignTokens } from '../../../../lib/design-system/DesignTokenContext'
import { CustomVariants, INTENT_ARIA_MAP, SupportedAs, TagAriaProps } from '../types'
import { tagVariants } from '../../../../lib/design-system/variants'

export type TagProps<T extends SupportedAs = 'span'> = Omit<ComponentProps<T>, never> & {
  as?: T
  asChild?: boolean
  CustomVariants?: CustomVariants<T>
} & CustomVariants<T> &
  TagAriaProps

/**
 * Filter props to only pass valid DOM attributes.
 * Prevents React warnings for non-standard attributes.
 */
function filterDomSafeProps(props: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(props).filter(([key, value]) => {
      // ref is handled separately — never spread it via domSafeProps
      if (key === 'ref') return false
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
 * Build ARIA attributes based on intent and explicit props.
 */
function buildAriaAttributes(props: TagAriaProps & { intent?: string }): Record<string, any> {
  const { intent, ariaLabel, ariaLabelledBy, ariaDescribedBy, ariaRole, ariaLive, ariaHidden } =
    props

  const ariaAttrs: Record<string, any> = {}

  if (intent && INTENT_ARIA_MAP[intent as keyof typeof INTENT_ARIA_MAP]) {
    Object.assign(ariaAttrs, INTENT_ARIA_MAP[intent as keyof typeof INTENT_ARIA_MAP])
  }

  if (ariaLabel) ariaAttrs['aria-label'] = ariaLabel
  if (ariaLabelledBy) ariaAttrs['aria-labelledby'] = ariaLabelledBy
  if (ariaDescribedBy) ariaAttrs['aria-describedby'] = ariaDescribedBy
  if (ariaRole) ariaAttrs.role = ariaRole
  if (ariaLive) ariaAttrs['aria-live'] = ariaLive
  if (ariaHidden !== undefined) ariaAttrs['aria-hidden'] = ariaHidden

  return ariaAttrs
}

function TagComponent<T extends SupportedAs = 'span'>({
  as,
  asChild,
  className,
  children,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  ariaRole,
  ariaLive,
  ariaHidden,
  ref,
  ...props
}: TagProps<T> & { asChild?: boolean; ref?: React.Ref<HTMLElement> }) {
  const tag = (as ?? 'span') as SupportedAs
  const inherited = useDesignTokens()

  // Resolve intent: explicit prop wins, then context, then undefined (let CVA default handle it)
  const propsRecord = props as Record<string, unknown>
  const resolvedIntent = (propsRecord.intent as string | undefined) ?? inherited.intent
  const resolvedProps = useMemo(
    () => (resolvedIntent !== undefined ? { ...props, intent: resolvedIntent } : props),
    [props, resolvedIntent]
  )

  const variantFn = tagVariants[tag as keyof typeof tagVariants]
  const variantClass = useMemo(
    () =>
      typeof variantFn === 'function'
        ? variantFn(resolvedProps as VariantProps<typeof variantFn>)
        : '',
    [variantFn, resolvedProps]
  )

  const merged = useMemo(
    () => cn([variantClass, className].filter(Boolean)),
    [variantClass, className]
  )

  const Component: ElementType = asChild ? Slot : as || 'span'

  const domSafeProps = useMemo(
    () => filterDomSafeProps(resolvedProps as Record<string, unknown>),
    [resolvedProps]
  )

  const ariaAttributes = useMemo(
    () =>
      buildAriaAttributes({
        intent: resolvedIntent,
        ariaLabel,
        ariaLabelledBy,
        ariaDescribedBy,
        ariaRole,
        ariaLive,
        ariaHidden,
      }),
    [resolvedIntent, ariaLabel, ariaLabelledBy, ariaDescribedBy, ariaRole, ariaLive, ariaHidden]
  )

  return (
    <Component ref={ref} className={merged} {...ariaAttributes} {...domSafeProps}>
      {children}
    </Component>
  )
}

export const Tag = React.memo(TagComponent) as typeof TagComponent & {
  displayName?: string
}

Tag.displayName = 'Tag'
