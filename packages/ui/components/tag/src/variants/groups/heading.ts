import { cva } from 'class-variance-authority';
import { textIntents } from '../../tokens/Intents';
import { textVariants } from '../../tokens/variants';
import { createAlias } from '../../utils/create-alias';

// supported
export const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;

// common
export const baseHeadingClasses = 'font-display font-bold !leading-[1.3]';
export const headingVariantConfig = {
  variant: textVariants,
  intent: textIntents,
  size: {
    h1: 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl',
    h2: 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl',
    h3: 'text-2xl sm:text-3xl md:text-4xl',
    h4: 'text-xl sm:text-2xl md:text-3xl',
    h5: 'text-lg sm:text-xl md:text-2xl',
    h6: 'text-base sm:text-lg md:text-xl',
  },
};
// variants
export const headingVariants = {
  h1: cva(baseHeadingClasses, {
    variants: headingVariantConfig,
    defaultVariants: {
      variant: 'default',
      intent: 'default',
      size: 'h1',
    },
  }),
  h2: cva(baseHeadingClasses, {
    variants: headingVariantConfig,
    defaultVariants: {
      variant: 'default',
      intent: 'default',
      size: 'h2',
    },
  }),
  h3: cva(baseHeadingClasses, {
    variants: headingVariantConfig,
    defaultVariants: {
      variant: 'default',
      intent: 'default',
      size: 'h3',
    },
  }),
  h4: cva(baseHeadingClasses, {
    variants: headingVariantConfig,
    defaultVariants: {
      variant: 'default',
      intent: 'default',
      size: 'h4',
    },
  }),
  h5: cva(baseHeadingClasses, {
    variants: headingVariantConfig,
    defaultVariants: {
      variant: 'default',
      intent: 'default',
      size: 'h5',
    },
  }),
  h6: cva(baseHeadingClasses, {
    variants: headingVariantConfig,
    defaultVariants: {
      variant: 'default',
      intent: 'default',
      size: 'h6',
    },
  }),
};
// alias
export const H1 = createAlias('h1');
export const H2 = createAlias('h2');
export const H3 = createAlias('h3');
export const H4 = createAlias('h4');
export const H5 = createAlias('h5');
export const H6 = createAlias('h6');

// meta
export const headingVariantsMeta = Object.fromEntries(
  headings.map((tag) => [
    tag,
    {
      variant: Object.keys(headingVariantConfig.variant),
      intent: Object.keys(headingVariantConfig.intent),
      size: Object.keys(headingVariantConfig.size),
    },
  ])
) as Record<
  keyof typeof headingVariants,
  { variant: string[]; intent: string[]; size: string[] }
>;
