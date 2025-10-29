/**
 * EzTag v2 - Variants Configuration
 *
 * Centralized variant definitions using class-variance-authority
 */

import { cva } from 'class-variance-authority'
import { cn } from '../../../../lib/utils'

/**
 * Layout variants - Controls flexbox/grid arrangement
 */
export const layoutVariants = {
  default: '',
  col: 'flex flex-col',
  row: 'flex flex-row items-center',
  grid: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  inline: 'inline-flex flex-row flex-wrap items-center',
  center: 'flex flex-col items-center justify-center text-center',
} as const

/**
 * Variant styles - Visual appearance
 */
export const variantStyles = {
  default: '',
  primary: 'bg-primary text-primary-foreground shadow-sm',
  card: 'bg-card text-card-foreground border border-border shadow-sm rounded-lg',
  outline: 'border border-border shadow-sm rounded-lg',
} as const

/**
 * Size variants - Padding, gap, dimensions
 */
export const sizeVariants = {
  default: '',
  xs: 'p-1 gap-1',
  sm: 'p-2 gap-2',
  md: 'p-4 gap-4',
  lg: 'p-6 gap-6',
  xl: 'p-8 gap-8',
  full: 'w-full h-full',
  // Typography sizes
  h1: 'text-3xl sm:text-4xl md:text-5xl font-bold',
  h2: 'text-2xl sm:text-3xl md:text-4xl font-bold',
  h3: 'text-xl sm:text-2xl md:text-3xl font-bold',
  h4: 'text-lg sm:text-xl md:text-2xl font-semibold',
  h5: 'text-base sm:text-lg md:text-xl font-semibold',
  h6: 'text-sm sm:text-base md:text-lg font-semibold',
  giant: 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold',
} as const

/**
 * Intent variants - Semantic colors for status
 */
export const intentVariants = {
  default: '',
  success: cn(
    'border border-success bg-success/10 text-success-foreground',
    'dark:bg-success/20'
  ),
  warning: cn(
    'border border-warning bg-warning/10 text-warning-foreground',
    'dark:bg-warning/20'
  ),
  danger: cn(
    'border border-destructive bg-destructive/10 text-destructive-foreground',
    'dark:bg-destructive/20'
  ),
  info: cn(
    'border border-info bg-info/10 text-info-foreground',
    'dark:bg-info/20'
  ),
  disabled: 'bg-muted text-muted-foreground opacity-50 pointer-events-none cursor-not-allowed',
  skeleton: 'animate-pulse bg-muted text-transparent pointer-events-none select-none',
} as const

/**
 * Alignment variants - Text and flex alignment
 */
export const alignVariants = {
  center: 'items-center justify-center text-center',
  left: 'items-start justify-start text-left',
  right: 'items-end justify-end text-right',
  between: 'items-center justify-between',
} as const

/**
 * Base EzTag variants using CVA
 */
export const ezTagVariants = cva(
  // Base classes
  cn(
    'transition-colors duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
  ),
  {
    variants: {
      layout: layoutVariants,
      variant: variantStyles,
      size: sizeVariants,
      intent: intentVariants,
      align: alignVariants,
      debug: {
        true: 'outline outline-2 outline-red-500 outline-dashed',
        false: '',
      },
    },
    defaultVariants: {
      layout: 'default',
      variant: 'default',
      size: 'default',
      intent: 'default',
      debug: false,
    },
  }
)

/**
 * Specialized variants for specific tags
 */

/**
 * Heading variants (h1-h6)
 */
export const headingVariants = cva(
  cn(
    'font-display leading-tight tracking-tight',
    'focus-visible:outline-none'
  ),
  {
    variants: {
      size: {
        h1: 'text-3xl sm:text-4xl md:text-5xl font-bold',
        h2: 'text-2xl sm:text-3xl md:text-4xl font-bold',
        h3: 'text-xl sm:text-2xl md:text-3xl font-bold',
        h4: 'text-lg sm:text-xl md:text-2xl font-semibold',
        h5: 'text-base sm:text-lg md:text-xl font-semibold',
        h6: 'text-sm sm:text-base md:text-lg font-semibold',
        default: '',
      },
      variant: {
        default: '',
        link: 'text-primary hover:underline cursor-pointer',
        muted: 'text-muted-foreground',
      },
      align: alignVariants,
    },
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
  }
)

/**
 * Paragraph variants
 */
export const paragraphVariants = cva(
  cn(
    'leading-relaxed',
    'focus-visible:outline-none'
  ),
  {
    variants: {
      size: {
        sm: 'text-sm',
        default: 'text-base',
        lg: 'text-lg',
      },
      variant: {
        default: '',
        muted: 'text-muted-foreground',
        lead: 'text-lg font-light text-muted-foreground',
      },
      align: alignVariants,
    },
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
  }
)

/**
 * Section variants
 */
export const sectionVariants = cva(
  cn(
    'w-full',
    'focus-visible:outline-none'
  ),
  {
    variants: {
      layout: layoutVariants,
      variant: variantStyles,
      size: {
        default: 'py-8',
        sm: 'py-4',
        md: 'py-12',
        lg: 'py-16',
        xl: 'py-24',
        full: 'min-h-screen',
      },
      intent: intentVariants,
    },
    defaultVariants: {
      layout: 'default',
      variant: 'default',
      size: 'default',
    },
  }
)
