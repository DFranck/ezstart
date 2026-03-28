import { cva, type VariantProps } from 'class-variance-authority'
import {
  touchHeight,
  touchSize,
  padding,
  paddingX,
  paddingY,
  gap,
  fontSize,
  radius,
  shadow,
  intentContainer,
  variantContainer,
  layoutContainer,
} from './tokens'

/**
 * Variants Réutilisables - @ezstart/ui
 *
 * Configurations CVA réutilisables pour composants communs.
 * Chaque composant peut importer et étendre ces configs.
 */

// ============================================================================
// CONFIG: FORM INPUT (Input, Select, TextArea, etc.)
// ============================================================================

/**
 * Config de variants pour form inputs
 * Usage: Input, Select, TextArea, PasswordInput
 */
export const formInputVariantConfig = {
  size: {
    sm: [touchHeight.sm, paddingX.sm, fontSize.sm].join(' '),
    default: [touchHeight.default, paddingX.default, fontSize.base].join(' '),
    lg: [touchHeight.lg, paddingX.lg, fontSize.lg].join(' '),
  },
  variant: {
    default: variantContainer.outline,
    filled: variantContainer.filled,
    ghost: variantContainer.ghost,
  },
  intent: {
    default: 'focus-visible:ring-ring focus-visible:ring-[3px] sm:focus-visible:ring-[2px]',
    destructive:
      'border-destructive focus-visible:ring-destructive focus-visible:ring-[3px] sm:focus-visible:ring-[2px]',
    success:
      'border-success focus-visible:ring-success focus-visible:ring-[3px] sm:focus-visible:ring-[2px]',
  },
} as const

/**
 * Default variants pour form inputs
 */
export const formInputDefaultVariants = {
  size: 'default',
  variant: 'default',
  intent: 'default',
} as const

// ============================================================================
// CONFIG: BUTTON (Boutons, Icon Buttons, etc.)
// ============================================================================

/**
 * Config de variants pour buttons
 * Déjà implémenté dans button.tsx mais exporté ici pour référence
 */
export const buttonVariantConfig = {
  size: {
    sm: [touchHeight.sm, 'px-3 gap-1.5'].join(' '),
    default: [touchHeight.default, 'px-4 py-2 gap-2'].join(' '),
    lg: [touchHeight.lg, 'px-6 gap-2'].join(' '),
    icon: [touchSize.default].join(' '),
  },
  variant: {
    default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
    destructive: 'bg-destructive text-white shadow-xs hover:bg-destructive/90',
    outline: 'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground',
    secondary: 'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    link: 'text-primary underline-offset-4 hover:underline',
  },
} as const

// ============================================================================
// CONFIG: CARD (Cards, Sections, Containers)
// ============================================================================

/**
 * Config de variants pour cards/containers
 */
export const cardVariantConfig = {
  size: {
    xs: [gap.xs, paddingY.xs].join(' '),
    sm: [gap.sm, paddingY.sm].join(' '),
    default: [gap.relaxed, paddingY.lg].join(' '),
    lg: [gap.spacious, paddingY.lg].join(' '),
    xl: [gap.loose, paddingY.xl].join(' '),
  },
  variant: {
    default: variantContainer.card,
    outline: variantContainer.outline,
    filled: variantContainer.filled,
    floating: variantContainer.floating,
    ghost: variantContainer.ghost,
  },
  intent: intentContainer,
} as const

export const cardHeaderVariantConfig = {
  size: {
    xs: [paddingX.sm, gap.xs].join(' '),
    sm: [paddingX.default, gap.tight].join(' '),
    default: [paddingX.lg, gap.tight].join(' '), // px-4 sm:px-6, gap-1.5
    lg: [paddingX.lg, gap.default].join(' '),
    xl: [paddingX.xl, gap.normal].join(' '),
  },
} as const

export const cardContentVariantConfig = {
  size: {
    xs: [paddingX.xs].join(' '),
    sm: [paddingX.default].join(' '),
    default: [paddingX.lg].join(' '), // px-4 sm:px-6
    lg: [paddingX.lg].join(' '),
    xl: [paddingX.xl].join(' '),
  },
} as const

// ============================================================================
// CONFIG: DIALOG / MODAL (Dialogs, Modals, AlertDialogs)
// ============================================================================

/**
 * Config de variants pour dialogs/modals
 */
export const dialogVariantConfig = {
  size: {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    full: 'max-w-[95vw]',
  },
} as const

export const dialogContentPadding = {
  default: [paddingX.lg, paddingY.lg, gap.relaxed].join(' '), // p-4 sm:p-6, gap-4 sm:gap-3
} as const

// ============================================================================
// CONFIG: BADGE (Badges, Tags, Chips)
// ============================================================================

/**
 * Config de variants pour badges
 */
export const badgeVariantConfig = {
  size: {
    sm: 'px-2 py-0.5 text-xs',
    default: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
  },
  variant: {
    default: 'border-transparent bg-primary text-primary-foreground shadow',
    secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
    destructive: 'border-transparent bg-destructive text-white shadow',
    outline: 'text-foreground border',
    success: 'border-transparent bg-success text-success-foreground',
    warning: 'border-transparent bg-warning text-warning-foreground',
    info: 'border-transparent bg-info text-info-foreground',
  },
} as const

// ============================================================================
// CONFIG: TYPOGRAPHY (Headings, Paragraphs, etc.)
// ============================================================================

/**
 * Config pour headings (h1-h6)
 */
export const headingVariantConfig = {
  size: {
    h1: fontSize.h1,
    h2: fontSize.h2,
    h3: fontSize.h3,
    h4: fontSize.h4,
    h5: fontSize.h5,
    h6: fontSize.h6,
    giant: fontSize.giant,
  },
  variant: {
    default: '',
    muted: 'text-muted-foreground',
    primary: 'text-primary',
  },
} as const

/**
 * Config pour paragraphes
 */
export const paragraphVariantConfig = {
  size: {
    sm: fontSize.sm,
    default: fontSize.base,
    lg: fontSize.lg,
  },
  variant: {
    default: '',
    muted: 'text-muted-foreground',
    description: 'italic text-muted-foreground font-light',
  },
} as const

// ============================================================================
// HELPERS: Créer CVA rapidement
// ============================================================================

/**
 * Helper pour créer un variant CVA standard pour inputs
 */
export function createFormInputVariant(baseClasses: string) {
  return cva(baseClasses, {
    variants: formInputVariantConfig,
    defaultVariants: formInputDefaultVariants,
  })
}

/**
 * Helper pour créer un variant CVA standard pour buttons
 */
export function createButtonVariant(baseClasses: string) {
  return cva(baseClasses, {
    variants: buttonVariantConfig,
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  })
}

/**
 * Helper pour créer un variant CVA standard pour cards
 */
export function createCardVariant(baseClasses: string) {
  return cva(baseClasses, {
    variants: cardVariantConfig,
    defaultVariants: {
      size: 'default',
      variant: 'default',
      intent: 'default',
    },
  })
}

/**
 * Helper pour créer un variant CVA standard pour dialogs
 */
export function createDialogVariant(baseClasses: string) {
  return cva(baseClasses, {
    variants: dialogVariantConfig,
    defaultVariants: {
      size: 'lg',
    },
  })
}

// ============================================================================
// TYPES
// ============================================================================

export type FormInputVariants = VariantProps<ReturnType<typeof createFormInputVariant>>
export type ButtonVariants = VariantProps<ReturnType<typeof createButtonVariant>>
export type CardVariants = VariantProps<ReturnType<typeof createCardVariant>>
export type DialogVariants = VariantProps<ReturnType<typeof createDialogVariant>>
