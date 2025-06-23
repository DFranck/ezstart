import { cva } from 'class-variance-authority';
import { intentContainer, variantContainer } from '../../tokens/tokens';
import { createAlias } from '../../utils/create-alias';

// --- Variants
export const divVariant = variantContainer;

export const divSize = {
  default: '',
  xs: 'px-2 py-4 md:px-4 md:py-6',
  sm: 'px-4 py-6 md:px-8 md:py-10',
  md: 'px-6 py-8 md:px-12 md:py-14',
  lg: 'px-8 py-12 md:px-16 md:py-20',
  xl: 'px-12 py-16 md:px-24 md:py-28',
  full: 'h-full w-full',
} as const;

export const divIntent = intentContainer;

export const divLayout = {
  default: '',
  none: '',
  col: 'flex flex-col gap-2 md:gap-4 lg:gap-6',
  row: 'flex flex-row gap-2 md:gap-4 lg:gap-6 items-center justify-between',
  grid: 'grid gap-2 md:gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-2 ',
  center: 'flex flex-col items-center justify-center gap-2 md:gap-4 lg:gap-6',
  aside: 'flex flex-row',
} as const;

// --- Config
export const divVariantConfig = {
  variant: divVariant,
  intent: intentContainer,
  size: divSize,
  layout: divLayout,
  withHeaderOffset: {
    true: 'mt-[71px]',
    false: '',
  },
} as const;

// --- Default variants
export const DEFAULT_DIV_VARIANTS = {
  variant: 'default',
  intent: 'default',
  size: 'md',
  layout: 'center',
  withHeaderOffset: false,
} as const;

// --- cva
export const divVariants = cva('', {
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
  withHeaderOffset: string[];
};
