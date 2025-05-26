// packages/libs/ez-tag/src/variants/index.ts
import { headingVariants, headingVariantsMeta } from './groups/heading';
import { layoutVariants, layoutVariantsMeta } from './groups/layout';
import {
  typographyVariants,
  typographyVariantsMeta,
} from './groups/typography';
import { listVariants } from './lists/listVariants';

export const tagVariants = {
  ...layoutVariants,
  ...headingVariants,
  ...typographyVariants,
  ...listVariants,
};

export const tagVariantsMeta = {
  ...headingVariantsMeta,
  ...layoutVariantsMeta,
  ...typographyVariantsMeta,
};
