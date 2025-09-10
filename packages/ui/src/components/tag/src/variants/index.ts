import { headingVariants, headingVariantsMeta } from './groups/heading';
import { layoutVariants, layoutVariantsMeta } from './groups/layout';
import { listingVariants, listingVariantsMeta } from './groups/listing';
import {
  typographyVariants,
  typographyVariantsMeta,
} from './groups/typography';

export const tagVariants = {
  ...layoutVariants,
  ...headingVariants,
  ...typographyVariants,
  ...listingVariants,
};

export const tagVariantsMeta = {
  ...headingVariantsMeta,
  ...layoutVariantsMeta,
  ...typographyVariantsMeta,
  ...listingVariantsMeta,
};

export const tagVariantsKeys = Object.keys(
  tagVariants
) as (keyof typeof tagVariants)[];
