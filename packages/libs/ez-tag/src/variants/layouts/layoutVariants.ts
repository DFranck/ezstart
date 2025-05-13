// packages/libs/ez-tag/src/variants/layouts.ts

import { mainVariants } from './layout-variants/mainVariants';
import { sectionVariants } from './layout-variants/sectionVariants';

/**
 * cva() variant configuration for layout-related HTML tags
 * Each key corresponds to a supported tag (`section`, `main`, etc.)
 * and defines optional variants like `variant`, `size`, etc.
 */

export const layoutVariants = {
  section: sectionVariants,
  main: mainVariants,
};

/**
 * Extracts the keys of `layoutVariants` for later use in tag typing.
 */
export type LayoutTag = keyof typeof layoutVariants;
