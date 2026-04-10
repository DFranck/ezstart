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
  // Additional HTML tags
  figureVariantConfig,
  fieldsetVariantConfig,
  detailsVariantConfig,
  dlVariantConfig,
  figcaptionVariantConfig,
  blockquoteVariantConfig,
  preVariantConfig,
  codeVariantConfig,
  smallVariantConfig,
  legendVariantConfig,
  summaryVariantConfig,
  dtVariantConfig,
  ddVariantConfig,
} from '../../lib/design-system/variants'

// Aliases (all in one place)
export {
  // Container aliases
  Div,
  Section,
  Aside,
  Main,
  Nav,
  Article,
  // Text aliases
  Span,
  Strong,
  P,
  Em,
  Small,
  Mark,
  // Heading aliases
  H1,
  H2,
  H3,
  H4,
  H5,
  H6,
  // List aliases
  UL,
  LI,
  Ol,
  // Definition list aliases
  Dl,
  Dt,
  Dd,
  // Code & preformatted aliases
  Pre,
  Code,
  Blockquote,
  // Media aliases
  Figure,
  Figcaption,
  // Form grouping aliases
  Fieldset,
  Legend,
  // Disclosure aliases
  Details,
  Summary,
  // Misc aliases
  Hr,
  Time,
  Address,
  // Legacy aliases
  FooterTag,
} from './src/aliases'
