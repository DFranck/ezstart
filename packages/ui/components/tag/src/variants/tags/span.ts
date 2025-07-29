import { cva } from 'class-variance-authority';
import { intentText, layoutText, sizeText } from '../../tokens/tokens';
import { createAlias } from '../../utils/create-alias';

export const spanVariantConfig = {
  size: sizeText,
  intent: intentText,
  layout: layoutText,
} as const;

export const DEFAULT_SPAN_VARIANTS = {
  size: 'xs',
  intent: 'default',
  layout: 'inline',
} as const;

export const spanVariants = cva('', {
  variants: spanVariantConfig,
  defaultVariants: DEFAULT_SPAN_VARIANTS,
});

export const Span = createAlias('span');

export const spanVariantsMeta = Object.fromEntries(
  Object.entries(spanVariantConfig).map(([variantName, variantValues]) => [
    variantName,
    Object.keys(variantValues),
  ])
) as {
  size: string[];
  intent: string[];
  layout: string[];
};
