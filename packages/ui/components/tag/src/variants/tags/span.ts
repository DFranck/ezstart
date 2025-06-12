import { cva } from 'class-variance-authority';
import { intentText, layoutText } from '../../tokens/tokens';
import { createAlias } from '../../utils/create-alias';

export const spanVariantConfig = {
  intent: intentText,
  layout: layoutText,
} as const;

export const spanVariants = cva('', {
  variants: spanVariantConfig,
  defaultVariants: {
    intent: 'default',
    layout: 'inline',
  },
});

export const Span = createAlias('span');

export const spanVariantsMeta = Object.fromEntries(
  Object.entries(spanVariantConfig).map(([variantName, variantValues]) => [
    variantName,
    Object.keys(variantValues),
  ])
) as {
  intent: string[];
  layout: string[];
};
