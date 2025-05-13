// packages/libs/ez-tag/src/variants/index.ts
import { formVariants } from './forms/formVariants';
import { headingVariants } from './headings/headingVariants';
import { layoutVariants } from './layouts/layoutVariants';
import { listVariants } from './lists/listVariants';
import { typographyVariants } from './typographies/typographyVariants';

/**
 * Central variant map used by EzTag.
 * This aggregates all `cva()` variant configurations for supported tags.
 * You can extend it by spreading other variant groups like `headingVariants`, `buttonVariants`, etc.
 */
export const tagVariants = {
  ...layoutVariants,
  ...headingVariants,
  ...formVariants,
  ...typographyVariants,
  ...listVariants,
};
