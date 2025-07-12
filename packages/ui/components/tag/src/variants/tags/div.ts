import { cva } from 'class-variance-authority';
import { intentContainer, variantContainer } from '../../tokens/tokens';
import { createAlias } from '../../utils/create-alias';

// --- Variants
export const divVariant = variantContainer;

export const divSize = {
  default: '',
  xs: 'p-1 py-1 md:px-2 md:py-2',
  sm: 'px-2 py-2 md:px-4 md:py-4',
  md: 'px-3 py-3 md:px-6 md:py-6',
  lg: 'px-4 py-4 md:px-8 md:py-8',
  xl: 'px-6 py-6 md:px-12 md:py-12',
  full: 'h-full w-full',
} as const;

export const divIntent = intentContainer;

export const divLayout = {
  default: '',
  col: 'flex flex-col gap-2 ',
  row: 'flex flex-row gap-2  items-center justify-between',
  grid: 'grid gap-2  grid-cols-1 lg:grid-cols-2 ',
  center: 'flex flex-col items-center justify-center gap-2 ',
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
