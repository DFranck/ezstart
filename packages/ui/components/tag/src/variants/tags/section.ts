import { cva } from 'class-variance-authority';
import { intentContainer } from '../../tokens/tokens';
import { createAlias } from '../../utils/create-alias';

// Variants
export const sectionVariant = {
  default: '',
  primary: 'bg-primary text-primary-foreground shadow-sm',
} as const;

export const sectionSize = {
  xs: 'px-2 py-4 md:px-4 md:py-6',
  sm: 'px-4 py-6 md:px-8 md:py-10',
  md: 'px-6 py-8 md:px-12 md:py-14',
  lg: 'px-8 py-12 md:px-16 md:py-20',
  xl: 'px-12 py-16 md:px-24 md:py-28',
} as const;

export const sectionIntent = intentContainer;

export const sectionLayout = {
  col: 'flex flex-col gap-4 md:gap-6 lg:gap-8',
  grid: 'grid gap-4 md:gap-6 lg:gap-8 grid-cols-1 md:grid-cols-2 ',
  center: 'flex flex-col items-center justify-center gap-4 md:gap-6 lg:gap-8',
} as const;

// --- Config
export const sectionVariantConfig = {
  variant: sectionVariant,
  size: sectionSize,
  intent: sectionIntent,
  layout: sectionLayout,
} as const;

// --- Default Variants
export const DEFAULT_SECTION_VARIANTS = {
  variant: 'default',
  size: 'lg',
  intent: 'default',
  layout: 'col',
} as const;

// --- cva
export const sectionVariants = cva('w-full', {
  variants: sectionVariantConfig,
  defaultVariants: DEFAULT_SECTION_VARIANTS,
});

// --- Alias
export const Section = createAlias('section');

// --- Meta générée dynamiquement pour Playground/Doc/devtools
export const sectionVariantsMeta = Object.fromEntries(
  Object.entries(sectionVariantConfig).map(([variantName, variantValues]) => [
    variantName,
    Object.keys(variantValues),
  ])
) as {
  variant: string[];
  size: string[];
  intent: string[];
  layout: string[];
};
