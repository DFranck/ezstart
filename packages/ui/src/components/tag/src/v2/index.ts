/**
 * EzTag v2 - Public API
 *
 * Exports:
 * - EzTag: Main polymorphic component
 * - Alias components: H1, H2, Div, Section, etc. (same names as v1)
 * - Types: EzTagProps, EzTagCommonVariants, etc.
 * - Variants: ezTagVariants, headingVariants, etc.
 */

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export { EzTag } from './EzTag'
export { default } from './EzTag'

// ============================================================================
// ALIAS COMPONENTS (same names as v1 for compatibility)
// ============================================================================

export {
  // Headings
  H1,
  H2,
  H3,
  H4,
  H5,
  H6,
  // Typography
  P,
  Span,
  Strong,
  // Layout
  Div,
  Section,
  Main,
  Header,
  Footer,
  Aside,
  Nav,
  Article,
  // Lists
  Ul,
  Ol,
  Li,
} from './aliases'

// ============================================================================
// TYPES
// ============================================================================

export type {
  EzTagProps,
  EzTagCommonVariants,
  EzTagAriaProps,
  SemanticTag,
  TypographyTag,
  LayoutTag,
  SupportedTag,
} from './types'

export { INTENT_ARIA_MAP } from './types'

// ============================================================================
// VARIANTS
// ============================================================================

export {
  ezTagVariants,
  headingVariants,
  paragraphVariants,
  sectionVariants,
  layoutVariants,
  variantStyles,
  sizeVariants,
  intentVariants,
  alignVariants,
} from './variants'

// ============================================================================
// UTILITIES
// ============================================================================

export { createAlias } from './create-alias'
