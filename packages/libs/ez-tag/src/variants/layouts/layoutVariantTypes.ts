import type { VariantProps } from 'class-variance-authority';
import { layoutVariants } from './layoutVariants';

/**
 * Auto-extracts variant props for a given layout tag,
 * and adds the optional `variant` prop if it exists.
 */
type ExtractVariantIfPresent<T extends (...args: any) => any> =
  'variant' extends keyof VariantProps<T>
    ? { variant?: VariantProps<T>['variant'] }
    : {};

/**
 * Dynamically maps each tag in `layoutVariants` to its valid variant props.
 * No need to maintain this manually anymore.
 */
export type LayoutTagVariantsMap = {
  [K in keyof typeof layoutVariants]: VariantProps<(typeof layoutVariants)[K]> &
    ExtractVariantIfPresent<(typeof layoutVariants)[K]>;
};

/**
 * Export layout-specific tag keys (used in EzTag logic)
 */
export type LayoutTag = keyof typeof layoutVariants;
