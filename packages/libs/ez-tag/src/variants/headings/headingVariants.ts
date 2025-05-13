// packages/libs/ez-tag/src/variants/layouts.ts
import { cva } from 'class-variance-authority';

/**
 * All heading tags (`h1` to `h6`) mapped to their variant configurations.
 * Each tag uses the same base style and supports a single `variant` (for now).
 * You can extend this later with more variants like `color`, `weight`, etc.
 */

export const baseHeadingClasses = 'font-display font-bold !leading-[1.3]';

export const headingVariants = {
  h1: cva(baseHeadingClasses, {
    variants: {
      variant: {
        default: 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }),
  h2: cva(baseHeadingClasses, {
    variants: {
      variant: {
        default: 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }),
  h3: cva(baseHeadingClasses, {
    variants: {
      variant: {
        default: 'text-2xl sm:text-3xl md:text-4xl',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }),
  h4: cva(baseHeadingClasses, {
    variants: {
      variant: {
        default: 'text-xl sm:text-2xl md:text-3xl',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }),
  h5: cva(baseHeadingClasses, {
    variants: {
      variant: {
        default: 'text-lg sm:text-xl md:text-2xl',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }),
  h6: cva(baseHeadingClasses, {
    variants: {
      variant: {
        default: 'text-base sm:text-lg md:text-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }),
};

/**
 * Extracts heading tag keys (`h1` to `h6`) for typing purposes.
 * Used by EzTag to determine valid variant props for each heading.
 */

export type HeadingTag = keyof typeof headingVariants;
