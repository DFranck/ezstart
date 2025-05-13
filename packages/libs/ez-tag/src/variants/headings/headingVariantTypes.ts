import { VariantProps } from 'class-variance-authority';
import { headingVariants } from './headingVariants';

/**
 * Adds a `variant` prop only if it's declared as a variant in the cva() function.
 * Type T must be a cva factory (function).
 */
type ExtractVariantIfPresent<T extends (...args: any) => any> =
  'variant' extends keyof VariantProps<T>
    ? { variant?: VariantProps<T>['variant'] }
    : {};

/**
 * Dynamically generates the valid variant props for each heading tag (`h1` to `h6`),
 * based on the `headingVariants` map.
 */
export type HeadingTagVariantsMap = {
  [K in keyof typeof headingVariants]: VariantProps<
    (typeof headingVariants)[K]
  > &
    ExtractVariantIfPresent<(typeof headingVariants)[K]>;
};

/**
 * Keys of the supported heading tags (`h1`, `h2`, ..., `h6`).
 * Used to type the `as` prop in EzTag.
 */
export type HeadingTag = keyof typeof headingVariants;
