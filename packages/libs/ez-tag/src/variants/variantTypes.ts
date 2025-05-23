// packages/libs/ez-tag/src/variants/variantTypes.ts
import type { VariantProps } from 'class-variance-authority';
import { tagVariants } from './index';

/**
 * Utility type that adds the `variant` prop
 * only if it's explicitly defined inside a cva variant object.
 */
export type ExtractVariantIfPresent<T extends (...args: any) => any> =
  'variant' extends keyof VariantProps<T>
    ? { variant?: VariantProps<T>['variant'] }
    : {};

/**
 * Dynamically infers the valid variant props (like `layout`, `size`, `variant`, etc.)
 * for each supported tag listed in `tagVariants`.
 * This map is used to type the EzTag component dynamically.
 */
export type TagVariantsMap = {
  [K in keyof typeof tagVariants]: VariantProps<(typeof tagVariants)[K]> &
    ExtractVariantIfPresent<(typeof tagVariants)[K]>;
};
