import { cva } from 'class-variance-authority';
import { intentContainer, variantContainer } from '../../tokens/tokens';
import { createAlias } from '../../utils/create-alias';

// --- Variants
export const asideVariant = variantContainer;

export const asideSize = {
  none: '',
  xs: 'px-2 py-4 md:px-4 md:py-6',
  sm: 'px-4 py-6 md:px-8 md:py-10',
  md: 'px-6 py-8 md:px-12 md:py-14',
  lg: 'px-8 py-12 md:px-16 md:py-20',
  xl: 'px-12 py-16 md:px-24 md:py-28',
  full: 'min-h-screen w-full px-12 py-16 md:px-24 md:py-28',
} as const;

export const asideIntent = intentContainer;

export const asideLayout = {
  col: 'flex flex-col gap-4 ',
  grid: 'grid gap-4 md:gap-6 lg:gap-8 grid-cols-1 lg:grid-cols-2 ',
  center: 'flex flex-col items-center justify-center gap-4 md:gap-6 lg:gap-8',
} as const;

// --- Config
export const asideVariantConfig = {
  variant: asideVariant,
  intent: intentContainer,
  size: asideSize,
  layout: asideLayout,
  withHeaderOffset: {
    true: 'pt-[71px]',
    false: '',
  },
} as const;

// --- Default variants
export const DEFAULT_ASIDE_VARIANTS = {
  variant: 'default',
  intent: 'default',
  size: 'md',
  layout: 'center',
  withHeaderOffset: false,
} as const;

// --- cva
export const asideVariants = cva('h-full', {
  variants: asideVariantConfig,
  defaultVariants: DEFAULT_ASIDE_VARIANTS,
});

// --- Alias
export const Aside = createAlias('aside');

// --- Meta for playground/devtools
export const asideVariantsMeta = Object.fromEntries(
  Object.entries(asideVariantConfig).map(([variantName, variantValues]) => [
    variantName,
    Object.keys(variantValues),
  ])
) as {
  variant: string[];
  intent: string[];
  size: string[];
  layout: string[];
  withHeaderOffset: string[];
};
