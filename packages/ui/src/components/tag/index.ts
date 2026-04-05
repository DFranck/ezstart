// Component
export { Tag } from './src/components/tag'
export type { TagProps } from './src/components/tag'

// Types
export type { TagAriaProps } from './src/types'
export { INTENT_ARIA_MAP } from './src/types'

// Variants & configs (from centralized design-system)
export {
  // Tag variant map + keys + meta
  tagVariants,
  tagVariantsKeys,
  tagVariantsMeta,
  // Grouped variant subsets
  headingVariants,
  listingVariants,
  layoutVariants,
  typographyVariants,
  // Constants
  HEADING_TAGS,
  LISTING_TAGS,
  LISTING_CONTAINERS,
  LISTING_ITEMS,
  // Heading
  baseHeadingClasses,
  tagHeadingVariantConfig,
  headingVariantsMeta,
  // Div
  divVariantConfig,
  divSize,
  divLayout,
  DEFAULT_DIV_VARIANTS,
  divVariantsMeta,
  // Section
  sectionVariantConfig,
  sectionVariant,
  sectionSize,
  sectionLayout,
  DEFAULT_SECTION_VARIANTS,
  sectionVariantsMeta,
  // Aside
  asideVariantConfig,
  asideSize,
  asideLayout,
  DEFAULT_ASIDE_VARIANTS,
  asideVariantsMeta,
  // Main
  mainVariantConfig,
  DEFAULT_MAIN_VARIANTS,
  mainVariantsMeta,
  // Nav
  navVariantConfig,
  navSize,
  navLayout,
  DEFAULT_NAV_VARIANTS,
  navVariantsMeta,
  // Header
  headerVariantConfig,
  headerVariantsMeta,
  // Footer
  footerVariantConfig,
  footerVariantsMeta,
  // Span
  spanVariantConfig,
  DEFAULT_SPAN_VARIANTS,
  spanVariantsMeta,
  // P
  pVariantConfig,
  pWeight,
  pVariantsMeta,
  // Listing
  listingContainersVariantConfig,
  listingContainersSize,
  listingContainersLayout,
  listingItemsVariantConfig,
  listingItemsSize,
  listingVariantsMeta,
} from '../../lib/design-system/variants'

// Aliases (all in one place)
export {
  Div,
  Section,
  Aside,
  Main,
  Nav,
  Article,
  Span,
  Strong,
  P,
  H1,
  H2,
  H3,
  H4,
  H5,
  H6,
  UL,
  LI,
  Ol,
  FooterTag,
} from './src/aliases'
