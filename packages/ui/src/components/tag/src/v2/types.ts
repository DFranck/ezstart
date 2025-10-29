/**
 * EzTag v2 - Types
 *
 * Composant polymorphique optimisé avec accessibilité complète
 */

import type { ComponentProps, ElementType, ReactNode } from 'react'

/**
 * Common variants available on all EzTag components
 */
export interface EzTagCommonVariants {
  /**
   * Layout variant - Controls flexbox/grid layout
   * @default undefined
   */
  layout?: 'col' | 'row' | 'grid' | 'inline' | 'center' | 'default'

  /**
   * Visual variant - Controls background, border, shadow
   * @default undefined
   */
  variant?: 'default' | 'primary' | 'card' | 'outline'

  /**
   * Size variant - Controls padding, gap, and dimensions
   * @default undefined
   */
  size?: 'default' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'giant'

  /**
   * Intent variant - Semantic color for status indication
   * @default undefined
   */
  intent?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'disabled' | 'skeleton'

  /**
   * Alignment variant - Controls text and flex alignment
   * @default undefined
   */
  align?: 'center' | 'left' | 'right' | 'between'
}

/**
 * Accessibility props automatically injected based on context
 */
export interface EzTagAriaProps {
  /**
   * ARIA label for screen readers
   * Recommended for sections, navigation, etc.
   */
  ariaLabel?: string

  /**
   * ID of element that labels this component
   */
  ariaLabelledBy?: string

  /**
   * ID of element that describes this component
   */
  ariaDescribedBy?: string

  /**
   * ARIA role override (auto-detected based on intent)
   */
  ariaRole?: string

  /**
   * ARIA live region (auto-set for success/warning/danger intents)
   */
  ariaLive?: 'off' | 'polite' | 'assertive'

  /**
   * ARIA hidden (for decorative elements)
   */
  ariaHidden?: boolean
}

/**
 * EzTag component props
 */
export interface EzTagProps<T extends ElementType = 'div'>
  extends EzTagCommonVariants,
    EzTagAriaProps {
  /**
   * HTML tag to render
   * @default 'div'
   */
  as?: T

  /**
   * Use Radix Slot for composition (merges props with child)
   * @default false
   */
  asChild?: boolean

  /**
   * Children elements
   */
  children?: ReactNode

  /**
   * Additional CSS classes
   */
  className?: string

  /**
   * Debug mode - adds visual outline
   * @default false
   */
  debug?: boolean
}

/**
 * Auto-inject ARIA attributes based on intent
 */
export const INTENT_ARIA_MAP = {
  success: {
    role: 'status',
    'aria-live': 'polite' as const,
  },
  warning: {
    role: 'alert',
    'aria-live': 'assertive' as const,
  },
  danger: {
    role: 'alert',
    'aria-live': 'assertive' as const,
  },
  info: {
    role: 'status',
    'aria-live': 'polite' as const,
  },
  disabled: {
    'aria-disabled': true,
  },
  skeleton: {
    'aria-hidden': true,
  },
  default: {},
} as const

/**
 * Semantic HTML recommendations
 */
export type SemanticTag =
  | 'header'
  | 'footer'
  | 'main'
  | 'section'
  | 'article'
  | 'aside'
  | 'nav'

/**
 * Typography tags
 */
export type TypographyTag =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'p'
  | 'span'

/**
 * Layout tags
 */
export type LayoutTag =
  | 'div'
  | 'section'
  | 'main'
  | 'header'
  | 'footer'
  | 'aside'
  | 'nav'

/**
 * All supported tags
 */
export type SupportedTag = SemanticTag | TypographyTag | LayoutTag
