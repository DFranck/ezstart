// -- Main polymorphic EzTag component (core rendering logic) --
export { EzTag } from './components/EzTag';

// -- Public types for EzTag's props and variants --
export type { CustomVariants, EzTagProps } from './components/EzTag';

// -- Supported HTML tag types for EzTag's "as" prop --
export type { SupportedAs } from './components/EzTag';

// -- Centralized variant factories (for runtime styling) and variant meta (for docs/playground/autocomplete) --
export { tagVariants, tagVariantsMeta } from './variants';

// -- Variant group exports (expose groups for advanced usage or external extension) --
export { headings, headingVariants } from './variants/groups/heading';

// -- Auto-generated type map of all supported variants per tag (for type safety, advanced helpers, and DX) --
export type { TagVariantsMap } from './variants/variantTypes';

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
} from './aliases';
