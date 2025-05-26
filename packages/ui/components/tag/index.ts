// -- Main polymorphic Tag component (core rendering logic) --
export { Tag } from './src/components/tag';

// -- Public types for Tag's props and variants --
export type { CustomVariants, TagProps } from './src/components/tag';

// -- Supported HTML tag types for Tag's "as" prop --
export type { SupportedAs } from './src/components/tag';

// -- Centralized variant factories (for runtime styling) and variant meta (for docs/playground/autocomplete) --
export { tagVariants, tagVariantsMeta } from './src/variants';

// -- Variant group exports (expose groups for advanced usage or external extension) --
export { headings, headingVariants } from './src/variants/groups/heading';

// -- Auto-generated type map of all supported variants per tag (for type safety, advanced helpers, and DX) --
export type { TagVariantsMap } from './src/variants/variantTypes';

// -- Commonly-used tag aliases (for ergonomic imports like <H1>, <Section>, etc.) --
export {
  Button,
  Dd,
  Div,
  Dl,
  Dt,
  H1,
  H2,
  H3,
  H4,
  H5,
  H6,
  Li,
  Main,
  Ol,
  P,
  Section,
  Ul,
} from './src/aliases';
