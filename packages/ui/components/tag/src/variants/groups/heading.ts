import { cva } from 'class-variance-authority';
import { textIntents } from '../../tokens/Intents';
import { textSizeVariants } from '../../tokens/size';
import { textVariants } from '../../tokens/variants';
import { createAlias } from '../../utils/create-alias';

// supported
export const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;

// common
export const baseHeadingClasses = 'font-display font-bold !leading-[1.3]';

// variants
export const headingVariants = {
  h1: cva(baseHeadingClasses, {
    variants: {
      variant: textVariants,
      intent: textIntents,
      size: textSizeVariants,
    },
    defaultVariants: {
      variant: 'default',
      intent: 'default',
      size: 'h1',
    },
  }),
  h2: cva(baseHeadingClasses, {
    variants: {
      variant: textVariants,
      intent: textIntents,
      size: textSizeVariants,
    },
    defaultVariants: {
      variant: 'default',
      intent: 'default',
      size: 'h2',
    },
  }),
  h3: cva(baseHeadingClasses, {
    variants: {
      variant: textVariants,
      intent: textIntents,
      size: textSizeVariants,
    },
    defaultVariants: {
      variant: 'default',
      intent: 'default',
      size: 'h3',
    },
  }),
  h4: cva(baseHeadingClasses, {
    variants: {
      variant: textVariants,
      intent: textIntents,
      size: textSizeVariants,
    },
    defaultVariants: {
      variant: 'default',
      intent: 'default',
      size: 'h4',
    },
  }),
  h5: cva(baseHeadingClasses, {
    variants: {
      variant: textVariants,
      intent: textIntents,
      size: textSizeVariants,
    },
    defaultVariants: {
      variant: 'default',
      intent: 'default',
      size: 'h5',
    },
  }),
  h6: cva(baseHeadingClasses, {
    variants: {
      variant: textVariants,
      intent: textIntents,
      size: textSizeVariants,
    },
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
      variant: Object.keys(textVariants),
      intent: Object.keys(textIntents),
      size: Object.keys(textSizeVariants),
    },
  ])
) as Record<
  keyof typeof headingVariants,
  { variant: string[]; intent: string[]; size: string[] }
>;
