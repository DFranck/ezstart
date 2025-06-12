import { cva } from 'class-variance-authority';
import {
  intentContainer,
  layoutContainer,
  sizeContainer,
  variantContainer,
} from '../../tokens/tokens';
import { createAlias } from '../../utils/create-alias';

export const divVariantConfig = {
  variant: variantContainer,
  size: sizeContainer,
  intent: intentContainer,
  layout: layoutContainer,
} as const;

export const divVariants = cva('container', {
  variants: divVariantConfig,
  defaultVariants: {
    variant: 'default',
    size: 'xs',
    intent: 'default',
    layout: 'col',
  },
});

export const Div = createAlias('div');

export const divVariantsMeta = Object.fromEntries(
  Object.entries(divVariantConfig).map(([variantName, variantValues]) => [
    variantName,
    Object.keys(variantValues),
  ])
) as {
  variant: string[];
  size: string[];
  intent: string[];
  layout: string[];
};
