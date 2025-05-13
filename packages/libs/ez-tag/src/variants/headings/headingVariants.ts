// packages/libs/ez-tag/src/variants/layouts.ts
import { cva } from 'class-variance-authority';

/**
 * All heading tags (`h1` to `h6`) mapped to their variant configurations.
 * Each tag uses the same base style and supports a single `variant` (for now).
 * You can extend this later with more variants like `color`, `weight`, etc.
 */

export const baseHeadingClasses = 'font-display font-bold !leading-[1.3]';

const visualSizes = {
  h1: 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl',
  h2: 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl',
  h3: 'text-2xl sm:text-3xl md:text-4xl',
  h4: 'text-xl sm:text-2xl md:text-3xl',
  h5: 'text-lg sm:text-xl md:text-2xl',
  h6: 'text-base sm:text-lg md:text-xl',
};

export const headingVariants = {
  h1: cva(baseHeadingClasses, {
    variants: {
      visual: visualSizes,
    },
    defaultVariants: {
      visual: 'h1',
    },
  }),
  h2: cva(baseHeadingClasses, {
    variants: {
      visual: visualSizes,
    },
    defaultVariants: {
      visual: 'h2',
    },
  }),
  h3: cva(baseHeadingClasses, {
    variants: {
      visual: visualSizes,
    },
    defaultVariants: {
      visual: 'h3',
    },
  }),
  h4: cva(baseHeadingClasses, {
    variants: {
      visual: visualSizes,
    },
    defaultVariants: {
      visual: 'h4',
    },
  }),
  h5: cva(baseHeadingClasses, {
    variants: {
      visual: visualSizes,
    },
    defaultVariants: {
      visual: 'h5',
    },
  }),
  h6: cva(baseHeadingClasses, {
    variants: {
      visual: visualSizes,
    },
    defaultVariants: {
      visual: 'h6',
    },
  }),
};

/**
 * Extracts heading tag keys (`h1` to `h6`) for typing purposes.
 * Used by EzTag to determine valid variant props for each heading.
 */

export type HeadingTag = keyof typeof headingVariants;
