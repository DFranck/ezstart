import { cva } from 'class-variance-authority';
import { textIntents } from '../../tokens/Intents';
import { textSizeVariants } from '../../tokens/size';
import { textVariants } from '../../tokens/variants';
import { createAlias } from '../../utils/create-alias';

export const pVariantConfig = {
  variant: textVariants,
  size: textSizeVariants,
  intent: textIntents,
};

export const pVariants = cva('', {
  variants: pVariantConfig,
  defaultVariants: {
    variant: 'default',
    size: 'default',
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
  intent: string[];
};
