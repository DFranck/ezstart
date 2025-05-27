// @/components/Footer/footer.variants.ts
// Footer Variants Config (cva)

import { cva } from 'class-variance-authority';
import { containerIntents } from '../../tokens/Intents';
import { containerVariants } from '../../tokens/variants';
import { createAlias } from '../../utils/create-alias';

// Footer variant config, typée
export const footerVariantConfig = {
  variant: containerVariants,
  size: {
    xs: 'max-w-2xl px-4 gap-2',
    sm: 'max-w-3xl px-4 md:px-6 gap-2 md:gap-4',
    xl: 'max-w-5xl px-4 md:px-10 gap-4 md:gap-8',
    full: 'max-w-none px-4 md:px-10 py-10 md:py-24 gap-6 md:gap-8',
    default: '',
  },
  intent: containerIntents,
  layout: {
    default:
      'flex flex-col md:flex-row md:items-center md:justify-between gap-4',
    centered: 'flex flex-col items-center justify-center gap-4',
    spaced: 'flex flex-row justify-between items-center gap-4',
  },
  withFixedMobilebar: {
    true: 'pb-16',
    false: '',
  },
} as const;

export const footerVariants = cva(
  'container mx-auto w-full border-t border-border pt-4 pb-4 bg-background',
  {
    variants: footerVariantConfig,
    defaultVariants: {
      variant: 'default',
      size: 'full',
      intent: 'default',
      layout: 'default',
      withFixedMobilebar: false,
    },
  }
);

// Footer alias (optionnel si besoin)
export const FooterTag = createAlias('footer');

// Footer meta pour Playground/Docs/devtools
export const footerVariantsMeta = Object.fromEntries(
  Object.entries(footerVariantConfig).map(([variantName, variantValues]) => [
    variantName,
    Object.keys(variantValues),
  ])
) as {
  variant: string[];
  size: string[];
  intent: string[];
  layout: string[];
  withFixedMobilebar: string[];
};
