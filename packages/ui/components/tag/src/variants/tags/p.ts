import { cva } from 'class-variance-authority';
import { intentText, sizeText, variantText } from '../../tokens/tokens';
import { createAlias } from '../../utils/create-alias';

export const pVariantConfig = {
  variant: variantText,
  size: sizeText,
  intent: intentText,
};

export const pVariants = cva('', {
  variants: pVariantConfig,
  defaultVariants: {
    variant: 'default',
    size: 'sm',
    intent: 'default',
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
