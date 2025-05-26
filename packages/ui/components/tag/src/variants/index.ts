// packages/libs/ez-tag/src/variants/index.ts
import { formVariants } from './forms/formVariants';
import { headingVariants, headingVariantsMeta } from './groups/heading';
import { layoutVariants } from './groups/layout';
import { typographyVariants } from './groups/typography';
import { listVariants } from './lists/listVariants';

export const tagVariants = {
  ...layoutVariants,
  ...headingVariants,
  ...formVariants,
  ...typographyVariants,
  ...listVariants,
};

export const tagVariantsMeta = {
  ...headingVariantsMeta,
};
