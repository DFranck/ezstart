import { cva } from 'class-variance-authority';
import { intentContainer } from '../../tokens/tokens';
import { createAlias } from '../../utils/create-alias';

// --- Variants

// NONE

// --- Config
export const mainVariantConfig = {
  intent: intentContainer,
  withHeaderOffset: {
    true: 'pt-[71px]',
    false: '',
  },
} as const;

// --- Default Variants
export const DEFAULT_MAIN_VARIANTS = {
  intent: 'default',
  withHeaderOffset: false,
} as const;

// --- cva
export const mainVariants = cva(
  'w-full flex-1 flex flex-col items-center justify-center',
  {
    variants: mainVariantConfig,
    defaultVariants: DEFAULT_MAIN_VARIANTS,
  }
);

// --- Alias
export const Main = createAlias('main');

// --- Meta générée dynamiquement pour Playground/Doc/devtools
export const mainVariantsMeta = Object.fromEntries(
  Object.entries(mainVariantConfig).map(([variantName, variantValues]) => [
    variantName,
    Object.keys(variantValues),
  ])
) as {
  intent: string[];
  withHeaderOffset: string[];
};
