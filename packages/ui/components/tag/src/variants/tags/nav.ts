import { cva } from 'class-variance-authority';
import { intentContainer, variantContainer } from '../../tokens/tokens';
import { createAlias } from '../../utils/create-alias';

// --- Variants
export const navVariant = variantContainer;

export const navSize = {
  none: '',
  xs: 'px-2 py-4 md:px-4 md:py-6',
  sm: 'px-4 py-6 md:px-8 md:py-10',
  md: 'px-6 py-8 md:px-12 md:py-14',
} as const;

export const navIntent = intentContainer;

export const navLayout = {
  col: 'flex flex-col gap-4 md:gap-6 lg:gap-8',
  row: 'flex flex-row gap-4 md:gap-6 lg:gap-8 items-center justify-between',
  center: 'flex flex-col items-center justify-center gap-4 md:gap-6 lg:gap-8',
} as const;

// --- Config
export const navVariantConfig = {
  variant: navVariant,
  intent: intentContainer,
  size: navSize,
  layout: navLayout,
} as const;

// --- Default variants
export const DEFAULT_NAV_VARIANTS = {
  variant: 'default',
  intent: 'default',
  size: 'md',
  layout: 'center',
  withHeaderOffset: false,
} as const;

// --- cva
export const navVariants = cva('w-fit', {
  variants: navVariantConfig,
  defaultVariants: DEFAULT_NAV_VARIANTS,
});

// --- Alias
export const Nav = createAlias('nav');

// --- Meta for playground/devtools
export const navVariantsMeta = Object.fromEntries(
  Object.entries(navVariantConfig).map(([variantName, variantValues]) => [
    variantName,
    Object.keys(variantValues),
  ])
) as {
  variant: string[];
  intent: string[];
  size: string[];
  layout: string[];
};
