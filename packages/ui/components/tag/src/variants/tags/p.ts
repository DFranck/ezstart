import { cva } from 'class-variance-authority';
import { sizeText, variantText } from '../../tokens/tokens';
import { createAlias } from '../../utils/create-alias';

export const pVariantConfig = {
  variant: variantText,
  size: sizeText,
};

export const pVariants = cva('', {
  variants: pVariantConfig,
  defaultVariants: {
    variant: 'default',
    size: 'h6',
  },
});

export const P = createAlias('p');

export const pVariantsMeta = Object.fromEntries(
  Object.entries(pVariantConfig).map(([variantName, variantValues]) => [
    variantName,
    Object.keys(variantValues),
  ])
) as {
  variant: string[];
  size: string[];
};
