import { cva } from 'class-variance-authority';
import { textIntents } from '../../tokens/Intents';
import { textSizeVariants } from '../../tokens/size';
import { textVariants } from '../../tokens/variants';

/**
 * All heading tags (`h1` to `h6`) mapped to their variant configurations.
 * Each tag uses the same base style and supports a single `variant` (for now).
 * You can extend this later with more variants like `color`, `weight`, etc.
 */

export const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;

export const headingVariantsMeta = Object.fromEntries(
  headings.map((tag) => [
    tag,
    {
      variant: Object.keys(textVariants),
      intent: Object.keys(textIntents),
      size: Object.keys(textSizeVariants),
    },
  ])
) as Record<string, { variant: string[]; intent: string[]; size: string[] }>;

export const baseHeadingClasses = 'font-display font-bold !leading-[1.3]';

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
