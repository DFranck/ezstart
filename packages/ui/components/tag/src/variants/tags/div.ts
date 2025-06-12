import { cva } from 'class-variance-authority';
import { intentContainer, variantContainer } from '../../tokens/tokens';
import { createAlias } from '../../utils/create-alias';

// --- Variants
export const divVariant = variantContainer;

export const divSize = {
  none: '',
  xs: 'px-2 py-4 md:px-4 md:py-6',
  sm: 'px-4 py-6 md:px-8 md:py-10',
  md: 'px-6 py-8 md:px-12 md:py-14',
  lg: 'px-8 py-12 md:px-16 md:py-20',
  xl: 'px-12 py-16 md:px-24 md:py-28',
} as const;

export const divIntent = intentContainer;

export const divLayout = {
  col: 'flex flex-col gap-4 md:gap-6 lg:gap-8',
  grid: 'grid gap-4 md:gap-6 lg:gap-8 grid-cols-1 lg:grid-cols-2 ',
  center: 'flex flex-col items-center justify-center gap-4 md:gap-6 lg:gap-8',
} as const;

// --- Config
export const divVariantConfig = {
  variant: divVariant,
  intent: intentContainer,
  size: divSize,
  layout: divLayout,
} as const;

// --- Default variants
export const DEFAULT_DIV_VARIANTS = {
  variant: 'default',
  intent: 'default',
  size: 'md',
  layout: 'center',
} as const;

// --- cva
export const divVariants = cva('w-fit mx-auto container', {
  variants: divVariantConfig,
  defaultVariants: DEFAULT_DIV_VARIANTS,
});

// --- Alias
export const Div = createAlias('div');

// --- Meta for playground/devtools
export const divVariantsMeta = Object.fromEntries(
  Object.entries(divVariantConfig).map(([variantName, variantValues]) => [
    variantName,
    Object.keys(variantValues),
  ])
) as {
  variant: string[];
  intent: string[];
  size: string[];
  layout: string[];
};
