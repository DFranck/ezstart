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
  intentText,
  variantContainer,
  variantText,
  layoutContainer,
  layoutText,
  densityContainer,
  densityText,
  sizeContainer,
  sizeText,
} from './tokens'
import { isDebug } from '../debug'

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
// CONFIG: SWITCH (Toggle Switches)
// ============================================================================

/**
 * Config de variants pour switches
 */
export const switchVariantConfig = {
  variant: {
    default:
      'data-[state=checked]:bg-primary data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-input/80',
    success:
      'data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-input/80',
    destructive:
      'data-[state=checked]:bg-destructive data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-input/80',
    outline:
      'data-[state=checked]:bg-background data-[state=checked]:border-primary data-[state=unchecked]:bg-background data-[state=unchecked]:border-input',
  },
  size: {
    sm: 'h-4 w-7',
    default: 'h-5 w-9',
    lg: 'h-6 w-11',
  },
} as const

export const switchThumbVariantConfig = {
  variant: {
    default:
      'dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground',
    success: 'dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-white',
    destructive: 'dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-white',
    outline: 'bg-primary data-[state=unchecked]:bg-muted-foreground',
  },
  size: {
    sm: 'h-3 w-3 data-[state=checked]:translate-x-3',
    default: 'h-4 w-4 data-[state=checked]:translate-x-4',
    lg: 'h-5 w-5 data-[state=checked]:translate-x-5',
  },
} as const

// ============================================================================
// CONFIG: TABLE (Data Tables)
// ============================================================================

/**
 * Config de variants pour tables
 */
export const tableVariantConfig = {
  variant: {
    default: 'border-collapse',
    striped: '[&_tbody_tr:nth-child(odd)]:bg-muted/50',
    bordered: 'border border-border',
    hoverable: '[&_tbody_tr]:hover:bg-muted/50 [&_tbody_tr]:transition-colors',
  },
  size: {
    compact:
      '[&_td]:py-1.5 [&_td]:px-3 [&_td]:sm:py-1 [&_td]:sm:px-2 [&_th]:py-1.5 [&_th]:px-3 [&_th]:sm:py-1 [&_th]:sm:px-2',
    default:
      '[&_td]:py-3 [&_td]:px-4 [&_td]:sm:py-2 [&_td]:sm:px-3 [&_th]:py-3 [&_th]:px-4 [&_th]:sm:py-2 [&_th]:sm:px-3',
    comfortable:
      '[&_td]:py-4 [&_td]:px-5 [&_td]:sm:py-3 [&_td]:sm:px-4 [&_th]:py-4 [&_th]:px-5 [&_th]:sm:py-3 [&_th]:sm:px-4',
  },
} as const

// ============================================================================
// CONFIG: SKELETON (Loading Placeholders)
// ============================================================================

/**
 * Config de variants pour skeletons
 */
export const skeletonVariantConfig = {
  variant: {
    default: 'bg-muted',
    lighter: 'bg-muted/50',
    darker: 'bg-muted/70',
    shimmer:
      'bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] animate-shimmer',
  },
} as const

/**
 * Config de tailles pour skeleton cards
 */
export const skeletonCardSizeConfig = {
  sm: 'p-4 gap-3 sm:p-3 sm:gap-2.5',
  default: 'p-4 gap-4 sm:p-6 sm:gap-4',
  lg: 'p-6 gap-5 sm:p-8 sm:gap-6',
} as const

// ============================================================================
// CONFIG: ANIMATED COUNTER (Number Animations)
// ============================================================================

/**
 * Config de variants pour animated counters
 */
export const animatedCounterVariantConfig = {
  variant: {
    default: 'text-foreground',
    stats: 'text-primary font-bold',
    metric: 'text-primary font-semibold',
    subtle: 'text-muted-foreground font-normal',
    success: 'text-green-600 dark:text-green-400 font-semibold',
    warning: 'text-yellow-600 dark:text-yellow-400 font-semibold',
    destructive: 'text-red-600 dark:text-red-400 font-semibold',
  },
  size: {
    xs: fontSize.xs,
    sm: fontSize.sm,
    default: fontSize.base,
    lg: fontSize.lg,
    xl: fontSize.xl,
    h6: fontSize.h6,
    h5: fontSize.h5,
    h4: fontSize.h4,
    h3: fontSize.h3,
    h2: fontSize.h2,
    h1: fontSize.h1,
    giant: fontSize.giant,
  },
} as const

// ============================================================================
// CONFIG: STEPPER (Multi-Step Forms & Wizards)
// ============================================================================

/**
 * Config de variants pour stepper
 * Usage: Stepper, StepperHeader, StepperNavigation
 */
export const stepperVariantConfig = {
  size: {
    sm: {
      tab: [touchHeight.sm, paddingX.sm, fontSize.sm, gap.tight].join(' '),
      progressBar: 'h-0.5',
      navigation: [paddingX.sm, paddingY.sm, gap.sm].join(' '),
      icon: 'size-3.5 sm:size-3',
    },
    default: {
      tab: [touchHeight.default, paddingX.default, fontSize.base, gap.default].join(' '),
      progressBar: 'h-1',
      navigation: [paddingX.default, paddingY.default, gap.default].join(' '),
      icon: 'size-4 sm:size-3.5',
    },
    lg: {
      tab: [touchHeight.lg, paddingX.lg, fontSize.lg, gap.normal].join(' '),
      progressBar: 'h-1.5',
      navigation: [paddingX.lg, paddingY.lg, gap.normal].join(' '),
      icon: 'size-5 sm:size-4',
    },
  },
  variant: {
    default: {
      tab: {
        active: 'bg-primary text-primary-foreground',
        completed: 'bg-primary/20 text-primary',
        future: 'text-muted-foreground',
      },
      progressBar: 'bg-primary',
      navigation: 'bg-card/60 backdrop-blur border-t border-border',
    },
    minimal: {
      tab: {
        active: 'bg-accent text-accent-foreground font-medium',
        completed: 'text-foreground',
        future: 'text-muted-foreground',
      },
      progressBar: 'bg-foreground',
      navigation: 'bg-background/80 backdrop-blur border-t border-border',
    },
    pills: {
      tab: {
        active: 'bg-primary text-primary-foreground rounded-full',
        completed: 'bg-primary/15 text-primary rounded-full',
        future: 'bg-muted text-muted-foreground rounded-full',
      },
      progressBar: 'bg-primary',
      navigation: 'bg-card/60 backdrop-blur border-t border-border',
    },
  },
} as const

// ============================================================================
// CONFIG: COMMAND (Command Palette Groups)
// ============================================================================

/**
 * Config de variants pour command groups
 */
export const commandGroupVariantConfig = {
  headingVariant: {
    default: '[&_[cmdk-group-heading]]:text-muted-foreground',
    healthy:
      '[&_[cmdk-group-heading]]:bg-status-healthy/10 [&_[cmdk-group-heading]]:text-status-healthy [&_[cmdk-group-heading]]:font-semibold',
    'healthy-light':
      '[&_[cmdk-group-heading]]:bg-status-healthy/5 [&_[cmdk-group-heading]]:text-status-healthy [&_[cmdk-group-heading]]:font-semibold',
    degraded:
      '[&_[cmdk-group-heading]]:bg-status-degraded/10 [&_[cmdk-group-heading]]:text-status-degraded [&_[cmdk-group-heading]]:font-semibold',
    unhealthy:
      '[&_[cmdk-group-heading]]:bg-status-unhealthy/10 [&_[cmdk-group-heading]]:text-status-unhealthy [&_[cmdk-group-heading]]:font-semibold',
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

// ============================================================================
// TAG VARIANT MAP — CVA configs for all Tag/alias components
// ============================================================================

// --- Tag Constants ---

export const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const
export const LISTING_CONTAINERS = ['ul'] as const
export const LISTING_ITEMS = ['li'] as const
export const LISTING_TAGS = [...LISTING_CONTAINERS, ...LISTING_ITEMS] as const

// --- Shared variant configs per tag category ---

const containerBase = {
  variant: variantContainer,
  intent: intentContainer,
  density: densityContainer,
}

const textBase = {
  variant: variantText,
  intent: intentText,
}

// --- Tag-specific token definitions ---

// Heading
export const baseHeadingClasses = 'font-display font-bold !leading-[1.3] text-center'

export const tagHeadingVariantConfig = {
  variant: variantText,
  size: sizeText,
}

// Div
export const divSize = {
  default: '',
  xs: 'p-1 py-1 md:px-2 md:py-2',
  sm: 'px-2 py-2 md:px-4 md:py-4',
  md: 'px-3 py-3 md:px-6 md:py-6',
  lg: 'px-4 py-4 md:px-8 md:py-8',
  xl: 'px-6 py-6 md:px-12 md:py-12',
  full: 'h-full w-full',
} as const

export const divLayout = {
  default: '',
  col: 'flex flex-col gap-2 ',
  row: 'flex flex-row gap-2  items-center justify-between',
  grid: 'grid gap-2  grid-cols-1 lg:grid-cols-2 ',
  center: 'flex flex-col items-center justify-center gap-2 text-center',
  aside: 'flex flex-row',
} as const

export const divVariantConfig = {
  ...containerBase,
  size: divSize,
  layout: divLayout,
  withHeaderOffset: {
    true: 'mt-[71px]',
    false: '',
  },
} as const

export const DEFAULT_DIV_VARIANTS = {
  variant: 'default',
  intent: 'default',
  size: 'default',
  layout: 'default',
  density: 'default',
  withHeaderOffset: false,
} as const

// Section
export const sectionVariant = {
  default: variantContainer.default,
  primary: variantContainer.primary,
} as const

export const sectionSize = {
  default: '',
  narrow: 'max-w-4xl px-4 py-8 md:px-6 md:py-12',
  xs: 'max-w-2xl px-1 py-2 md:px-2 md:py-4',
  sm: 'max-w-3xl px-2 py-4 md:px-4 md:py-6',
  md: 'max-w-4xl px-4 py-6 md:px-6 md:py-8',
  lg: 'max-w-5xl px-4 py-8 md:px-8 md:py-12',
  xl: 'max-w-6xl px-4 py-12 md:px-12 md:py-16',
  full: 'min-h-screen  px-4 py-16 md:px-16 md:py-18',
} as const

export const sectionLayout = {
  col: 'flex flex-col justify-center items-center gap-4 md:gap-6 lg:gap-8',
  grid: 'grid gap-4 md:gap-6 lg:gap-8 grid-cols-1 lg:grid-cols-2 items-center',
  center: 'flex flex-col items-center justify-center gap-4 md:gap-6 lg:gap-8',
} as const

export const sectionVariantConfig = {
  variant: sectionVariant,
  size: sectionSize,
  intent: intentContainer,
  layout: sectionLayout,
  density: densityContainer,
} as const

export const DEFAULT_SECTION_VARIANTS = {
  variant: 'default',
  size: 'default',
  intent: 'default',
  layout: 'col',
  density: 'default',
} as const

// Aside
export const asideSize = {
  none: '',
  xs: 'px-2 py-4 md:px-4 md:py-6',
  sm: 'px-4 py-6 md:px-8 md:py-10',
  md: 'px-6 py-8 md:px-12 md:py-14',
  lg: 'px-8 py-12 md:px-16 md:py-20',
  xl: 'px-12 py-16 md:px-24 md:py-28',
  full: 'min-h-screen w-full',
} as const

export const asideLayout = {
  col: 'flex flex-col gap-4 ',
  grid: 'grid gap-4 md:gap-6 lg:gap-8 grid-cols-1 lg:grid-cols-2 ',
  center: 'flex flex-col items-center justify-center gap-4 md:gap-6 lg:gap-8',
} as const

export const asideVariantConfig = {
  ...containerBase,
  size: asideSize,
  layout: asideLayout,
} as const

export const DEFAULT_ASIDE_VARIANTS = {
  variant: 'default',
  intent: 'default',
  size: 'md',
  layout: 'center',
  density: 'default',
  withHeaderOffset: false,
} as const

// Main
export const mainVariantConfig = {
  intent: intentContainer,
  density: densityContainer,
  withHeaderOffset: {
    true: 'mt-[71px]',
    false: '',
  },
} as const

export const DEFAULT_MAIN_VARIANTS = {
  intent: 'default',
  density: 'default',
  withHeaderOffset: false,
} as const

// Nav
export const navSize = {
  none: '',
  xs: 'p-1',
  full: 'w-full',
} as const

export const navLayout = {
  col: 'flex flex-col gap-4 md:gap-6 lg:gap-8',
  row: 'flex flex-row gap-4 md:gap-6 lg:gap-8 items-center justify-between',
  center: 'flex flex-col items-center justify-center gap-4 md:gap-6 lg:gap-8',
} as const

export const navVariantConfig = {
  ...containerBase,
  size: navSize,
  layout: navLayout,
} as const

export const DEFAULT_NAV_VARIANTS = {
  variant: 'default',
  intent: 'default',
  size: 'full',
  layout: 'center',
  density: 'default',
  withHeaderOffset: false,
} as const

// Header
export const headerVariantConfig = {
  variant: variantContainer,
  size: {
    xs: 'max-w-2xl px-4 gap-2',
    sm: 'max-w-3xl px-4 md:px-6 gap-2 md:gap-4',
    xl: 'max-w-5xl px-4 md:px-10  gap-4 md:gap-8',
    full: 'max-w-none',
    default: '',
  },
  intent: intentContainer,
  layout: {
    default: 'flex items-center justify-between',
    centered: 'flex justify-center',
    spaced: 'flex justify-between',
  },
  position: {
    static: '',
    sticky: 'sticky top-0 left-0 right-0 ',
    fixed: 'fixed top-0 left-0 right-0 ',
    absolute: 'absolute top-0 left-0 right-0 ',
  },
} as const

// Footer
export const footerVariantConfig = {
  variant: variantContainer,
  size: {
    xs: 'max-w-2xl px-4 gap-2',
    sm: 'max-w-3xl px-4 md:px-6 gap-2 md:gap-4',
    xl: 'max-w-5xl px-4 md:px-10 gap-4 md:gap-8',
    full: 'max-w-none px-4 md:px-10 py-10 md:py-24 gap-6 md:gap-8',
    default: '',
  },
  intent: intentContainer,
  layout: {
    default: 'flex flex-col md:flex-row md:items-center md:justify-between gap-4',
    centered: 'flex flex-col items-center justify-center gap-4',
    spaced: 'flex flex-row justify-between items-center gap-4',
  },
  withFixedMobilebar: {
    true: 'pb-16',
    false: '',
  },
} as const

// Span
export const spanVariantConfig = {
  size: sizeText,
  intent: intentText,
  variant: variantText,
  layout: layoutText,
} as const

export const DEFAULT_SPAN_VARIANTS = {
  size: 'default',
  intent: 'default',
  variant: 'default',
  layout: 'default',
} as const

// P (paragraph)
export const pWeight = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
} as const

export const pVariantConfig = {
  variant: variantText,
  size: sizeText,
  intent: intentText,
  weight: pWeight,
} as const

// Listing (ul, li)
export const listingContainersSize = {
  default: '',
  xs: 'px-2 py-4 md:px-4 md:py-6',
  sm: 'px-4 py-6 md:px-8 md:py-10',
  md: 'px-6 py-8 md:px-12 md:py-14',
  lg: 'px-8 py-12 md:px-16 md:py-20',
  xl: 'px-12 py-16 md:px-24 md:py-28',
} as const

export const listingContainersLayout = {
  default: '',
  col: 'flex flex-col gap-2 ',
  row: 'flex flex-row flex-wrap gap-2 items-center',
  grid: 'grid gap-4 md:gap-6 lg:gap-8 grid-cols-1 lg:grid-cols-2',
  center: 'flex flex-col items-center justify-center gap-2',
  menu: 'flex flex-col py-1 px-1 gap-0.5',
} as const

export const listingContainersVariantConfig = {
  variant: variantContainer,
  intent: intentContainer,
  size: listingContainersSize,
  layout: listingContainersLayout,
} as const

export const listingItemsSize = {
  default: '',
  xs: 'px-2 py-1',
  sm: 'px-3 py-2',
} as const

export const listingItemsVariantConfig = {
  variant: { ...variantText, ...variantContainer },
  intent: intentText,
  size: listingItemsSize,
  layout: listingContainersLayout,
  button: {
    true: 'cursor-pointer hover:opacity-80 active:scale-95 transition-all duration-100',
    false: '',
  },
  marker: {
    default: '',
    check: 'before:content-["✅"] before:mr-2',
    arrow: 'before:content-["→"] before:mr-2',
    dash: 'before:content-["–"] before:mr-2',
  },
} as const

// ============================================================================
// CONFIG: SPINNER
// ============================================================================

export const spinnerVariantConfig = {
  size: {
    xs: 'w-3 h-3 border-2',
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
    xl: 'w-12 h-12 border-4',
  },
  variant: {
    default: 'border-border border-t-foreground',
    primary: 'border-primary/30 border-t-primary',
    secondary: 'border-secondary/30 border-t-secondary',
    accent: 'border-accent/30 border-t-accent',
    destructive: 'border-destructive/30 border-t-destructive',
    success: 'border-green-500/30 border-t-green-500',
    fancy: 'border-primary/20 border-t-primary',
  },
  speed: {
    slow: 'animate-spin-slow',
    normal: 'animate-spin',
    fast: 'animate-spin-fast',
  },
  fancyPulseSize: {
    xs: 'w-2 h-2 top-0.5 left-0.5',
    sm: 'w-2.5 h-2.5 top-0.5 left-0.5',
    md: 'w-4 h-4 top-1 left-1',
    lg: 'w-5 h-5 top-1.5 left-1.5',
    xl: 'w-8 h-8 top-2 left-2',
  },
  textSize: {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  },
} as const

// ============================================================================
// CONFIG: TOOLTIP
// ============================================================================

export const tooltipVariantConfig = {
  variant: {
    default: {
      bg: 'bg-primary',
      text: 'text-primary-foreground',
      arrow: 'bg-primary fill-primary',
    },
    info: {
      bg: 'bg-blue-600 dark:bg-blue-500',
      text: 'text-white',
      arrow: 'bg-blue-600 fill-blue-600 dark:bg-blue-500 dark:fill-blue-500',
    },
    success: {
      bg: 'bg-green-600 dark:bg-green-500',
      text: 'text-white',
      arrow: 'bg-green-600 fill-green-600 dark:bg-green-500 dark:fill-green-500',
    },
    warning: {
      bg: 'bg-yellow-600 dark:bg-yellow-500',
      text: 'text-white',
      arrow: 'bg-yellow-600 fill-yellow-600 dark:bg-yellow-500 dark:fill-yellow-500',
    },
    destructive: {
      bg: 'bg-destructive',
      text: 'text-destructive-foreground',
      arrow: 'bg-destructive fill-destructive',
    },
  },
} as const

// ============================================================================
// CONFIG: DROPDOWN POSITION
// ============================================================================

export const dropdownPositionConfig = {
  align: {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  },
  side: {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
  },
} as const

// ============================================================================
// CONFIG: ALERT DIALOG
// ============================================================================

export const alertDialogVariantConfig = {
  /** Maps alert dialog variant to the button variant for the action button */
  actionButtonVariant: {
    default: 'default' as const,
    destructive: 'destructive' as const,
    warning: 'default' as const,
    info: 'default' as const,
  },
} as const

// ============================================================================
// CONFIG: VERSION SWITCH
// ============================================================================

export const versionSwitchVariantConfig = {
  position: {
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
  },
} as const

// ============================================================================
// CONFIG: HERO
// ============================================================================

export const heroVariantConfig = {
  height: {
    sm: 'min-h-[40vh]',
    md: 'min-h-[60vh]',
    lg: 'min-h-[80vh]',
    viewport: 'min-h-[100vh]',
    auto: 'min-h-0',
  },
  alignment: {
    left: '[&_*]:text-left',
    center: '[&_*]:text-center',
    right: '[&_*]:text-right',
  },
} as const

// ============================================================================
// CONFIG: SPLIT SECTION
// ============================================================================

export const splitSectionVariantConfig = {
  layout: {
    horizontal: 'grid grid-cols-1 lg:grid-cols-2 gap-0',
    vertical: 'flex flex-col',
  },
  align: {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  },
  padding: {
    none: '',
    sm: 'py-8 px-4',
    md: 'py-12 px-6',
    lg: 'py-16 px-8',
    xl: 'py-24 px-12',
    '2xl': 'py-32 px-16',
  },
} as const

// ============================================================================
// CONFIG: FLOATING PANEL
// ============================================================================

export const floatingPanelVariantConfig = {
  size: {
    sm: 'w-80 max-h-96',
    md: 'w-96 max-h-[32rem]',
    lg: 'w-[28rem] max-h-[40rem]',
    xl: 'w-[32rem] max-h-[48rem]',
    full: 'w-[90vw] h-[90vh]',
  },
} as const

// ============================================================================
// CONFIG: TEXT GRADIENT
// ============================================================================

export const textGradientVariantConfig = {
  direction: {
    'to-r': '',
    'to-l': '',
    'to-t': '',
    'to-b': '',
    'to-tr': '',
    'to-tl': '',
    'to-br': '',
    'to-bl': '',
  },
} as const

// ============================================================================
// CONFIG: LANDING CTA
// ============================================================================

export const ctaVariantConfig = {
  container: {
    default: '',
    centered: '',
    split: '',
    minimal: '',
    gradient: 'bg-gradient-to-r from-primary via-purple-500 to-pink-500 text-primary-foreground',
    bordered: 'border-2 border-primary',
  },
  bgColor: {
    default: 'bg-card',
    primary: 'bg-primary text-primary-foreground',
    muted: 'bg-muted',
  },
  content: {
    default: '',
    centered: 'text-center',
    split: 'grid grid-cols-1 lg:grid-cols-2 gap-8 items-center',
    minimal: '',
    gradient: '',
    bordered: '',
  },
  title: {
    default: 'text-3xl sm:text-4xl lg:text-5xl',
    minimal: 'text-2xl sm:text-3xl',
  },
  buttons: {
    default: '',
    centered: 'justify-center',
    split: 'lg:justify-start',
  },
} as const

// ============================================================================
// CONFIG: LANDING HERO
// ============================================================================

export const landingHeroVariantConfig = {
  container: {
    default: 'py-20 sm:py-24 lg:py-32',
    withImage: 'py-20 sm:py-24 lg:py-32',
    withVideo: 'py-20 sm:py-24 lg:py-32',
    withGradient: 'py-20 sm:py-24 lg:py-32',
    split: 'py-20 sm:py-24 lg:py-32',
    minimal: 'py-20 sm:py-24 lg:py-32',
    centered: 'py-20 sm:py-24 lg:py-32',
    withStats: 'py-20 sm:py-24 lg:py-32',
    withSearch: 'py-20 sm:py-24 lg:py-32',
    full: 'min-h-screen px-4 py-16 md:px-16 md:py-18 flex flex-col items-center justify-center',
  },
  contentWrapper: {
    default: '',
    withImage: '',
    withVideo: '',
    withGradient: '',
    split: 'grid grid-cols-1 lg:grid-cols-2 gap-12 items-center',
    minimal: '',
    centered: 'text-center',
    withStats: '',
    withSearch: '',
    full: '',
  },
  title: {
    default: 'text-4xl sm:text-5xl lg:text-6xl xl:text-7xl',
    withImage: 'text-4xl sm:text-5xl lg:text-6xl xl:text-7xl',
    withVideo: 'text-4xl sm:text-5xl lg:text-6xl xl:text-7xl',
    withGradient:
      'text-4xl sm:text-5xl lg:text-6xl xl:text-7xl bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent',
    split: 'text-4xl sm:text-5xl lg:text-6xl xl:text-7xl',
    minimal: 'text-4xl sm:text-5xl lg:text-6xl',
    centered: 'text-5xl sm:text-6xl lg:text-7xl',
    withStats: 'text-4xl sm:text-5xl lg:text-6xl xl:text-7xl',
    withSearch: 'text-4xl sm:text-5xl lg:text-6xl xl:text-7xl',
    full: 'text-4xl sm:text-5xl lg:text-6xl xl:text-7xl',
  },
  description: {
    default: 'text-lg sm:text-xl lg:text-2xl max-w-3xl',
    withImage: 'text-lg sm:text-xl lg:text-2xl max-w-3xl',
    withVideo: 'text-lg sm:text-xl lg:text-2xl max-w-3xl',
    withGradient: 'text-lg sm:text-xl lg:text-2xl max-w-3xl',
    split: 'text-lg sm:text-xl lg:text-2xl max-w-3xl',
    minimal: 'text-lg sm:text-xl max-w-2xl',
    centered: 'text-xl sm:text-2xl max-w-3xl mx-auto',
    withStats: 'text-lg sm:text-xl lg:text-2xl max-w-3xl',
    withSearch: 'text-lg sm:text-xl lg:text-2xl max-w-3xl',
    full: 'text-lg sm:text-xl lg:text-2xl max-w-3xl',
  },
} as const

// ============================================================================
// CONFIG: LANDING STATS
// ============================================================================

export const statsVariantConfig = {
  container: {
    default: '',
    centered: 'text-center',
    grid: '',
    inline: '',
    cards: '',
  },
  statsWrapper: {
    default: 'flex flex-wrap justify-around gap-8',
    centered: 'flex flex-wrap justify-center gap-12',
    grid: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-8',
    inline: 'flex flex-wrap justify-center gap-x-12 gap-y-6',
    cards: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6',
  },
  item: {
    default: '',
    centered: 'flex flex-col items-center',
    grid: '',
    inline: '',
    cards: 'p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow',
  },
} as const

// ============================================================================
// CONFIG: LANDING FEATURE GRID
// ============================================================================

export const featureGridVariantConfig = {
  columns: {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  },
  cardVariant: {
    default: '',
    minimal: 'border-0 shadow-none bg-transparent',
    bordered: 'border-2',
    floating: 'shadow-lg hover:shadow-xl transition-shadow duration-300',
  },
} as const

// --- The tag variant map (CVA functions) ---

export const tagVariants = {
  // Layout containers
  div: cva(`${isDebug() ? 'bg-red-500/50' : ''}`, {
    variants: divVariantConfig,
    defaultVariants: DEFAULT_DIV_VARIANTS,
  }),
  section: cva('w-full', {
    variants: sectionVariantConfig,
    defaultVariants: DEFAULT_SECTION_VARIANTS,
  }),
  aside: cva('h-full', {
    variants: asideVariantConfig,
    defaultVariants: DEFAULT_ASIDE_VARIANTS,
  }),
  main: cva('w-full flex-1 flex flex-col items-center pb-12 md:pb-16', {
    variants: mainVariantConfig,
    defaultVariants: DEFAULT_MAIN_VARIANTS,
  }),
  nav: cva('w-full', {
    variants: navVariantConfig,
    defaultVariants: DEFAULT_NAV_VARIANTS,
  }),
  header: cva('flex container mx-auto w-full z-50', {
    variants: headerVariantConfig,
    defaultVariants: {
      variant: 'default',
      size: 'full',
      intent: 'default',
      layout: 'default',
      position: 'sticky',
    },
  }),
  footer: cva('container mx-auto w-full border-t border-border pt-4 pb-4', {
    variants: footerVariantConfig,
    defaultVariants: {
      variant: 'default',
      size: 'full',
      intent: 'default',
      layout: 'default',
      withFixedMobilebar: false,
    },
  }),

  // Typography
  span: cva('', {
    variants: spanVariantConfig,
    defaultVariants: DEFAULT_SPAN_VARIANTS,
  }),
  p: cva('', {
    variants: pVariantConfig,
    defaultVariants: {
      variant: 'default',
      size: 'default',
      intent: 'default',
    },
  }),

  // Headings
  h1: cva(baseHeadingClasses, {
    variants: tagHeadingVariantConfig,
    defaultVariants: { variant: 'default', size: 'h1' },
  }),
  h2: cva(baseHeadingClasses, {
    variants: tagHeadingVariantConfig,
    defaultVariants: { variant: 'default', size: 'h2' },
  }),
  h3: cva(baseHeadingClasses, {
    variants: tagHeadingVariantConfig,
    defaultVariants: { variant: 'default', size: 'h3' },
  }),
  h4: cva(baseHeadingClasses, {
    variants: tagHeadingVariantConfig,
    defaultVariants: { variant: 'default', size: 'h4' },
  }),
  h5: cva(baseHeadingClasses, {
    variants: tagHeadingVariantConfig,
    defaultVariants: { variant: 'default', size: 'h5' },
  }),
  h6: cva(baseHeadingClasses, {
    variants: tagHeadingVariantConfig,
    defaultVariants: { variant: 'default', size: 'h6' },
  }),

  // Listings
  ul: cva(`${isDebug() ? 'bg-yellow-500/50' : ''}`, {
    variants: listingContainersVariantConfig,
    defaultVariants: {
      variant: 'default',
      intent: 'default',
      size: 'default',
      layout: 'col',
    },
  }),
  li: cva(`${isDebug() ? 'bg-green-500/50' : ''}`, {
    variants: listingItemsVariantConfig,
    defaultVariants: {
      variant: 'default',
      intent: 'default',
      size: 'default',
      marker: 'default',
      button: false,
    },
  }),
}

export const tagVariantsKeys = Object.keys(tagVariants) as (keyof typeof tagVariants)[]

// Grouped variant subsets for backward compatibility
export const headingVariants = {
  h1: tagVariants.h1,
  h2: tagVariants.h2,
  h3: tagVariants.h3,
  h4: tagVariants.h4,
  h5: tagVariants.h5,
  h6: tagVariants.h6,
}

export const listingVariants = {
  ul: tagVariants.ul,
  li: tagVariants.li,
}

export const layoutVariants = {
  section: tagVariants.section,
  main: tagVariants.main,
  header: tagVariants.header,
  footer: tagVariants.footer,
  div: tagVariants.div,
  aside: tagVariants.aside,
  nav: tagVariants.nav,
}

export const typographyVariants = {
  p: tagVariants.p,
  span: tagVariants.span,
}

// --- Tag Variants Meta (for playground/devtools) ---

function extractMetaKeys<T extends Record<string, unknown>>(config: T): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(config).map(([key, val]) => [key, Object.keys(val as Record<string, unknown>)])
  )
}

type TagVariantsMetaMap = {
  [K in keyof typeof tagVariants]: Record<string, string[]>
}

export const tagVariantsMeta: TagVariantsMetaMap = {
  // Layout
  div: extractMetaKeys(divVariantConfig),
  section: extractMetaKeys(sectionVariantConfig),
  aside: extractMetaKeys(asideVariantConfig),
  main: extractMetaKeys(mainVariantConfig),
  nav: extractMetaKeys(navVariantConfig),
  header: extractMetaKeys(headerVariantConfig),
  footer: extractMetaKeys(footerVariantConfig),

  // Typography
  span: extractMetaKeys(spanVariantConfig),
  p: extractMetaKeys(pVariantConfig),

  // Headings
  h1: {
    variant: Object.keys(tagHeadingVariantConfig.variant),
    size: Object.keys(tagHeadingVariantConfig.size),
  },
  h2: {
    variant: Object.keys(tagHeadingVariantConfig.variant),
    size: Object.keys(tagHeadingVariantConfig.size),
  },
  h3: {
    variant: Object.keys(tagHeadingVariantConfig.variant),
    size: Object.keys(tagHeadingVariantConfig.size),
  },
  h4: {
    variant: Object.keys(tagHeadingVariantConfig.variant),
    size: Object.keys(tagHeadingVariantConfig.size),
  },
  h5: {
    variant: Object.keys(tagHeadingVariantConfig.variant),
    size: Object.keys(tagHeadingVariantConfig.size),
  },
  h6: {
    variant: Object.keys(tagHeadingVariantConfig.variant),
    size: Object.keys(tagHeadingVariantConfig.size),
  },

  // Listings
  ul: extractMetaKeys(listingContainersVariantConfig),
  li: extractMetaKeys(listingItemsVariantConfig),
}

// Individual meta exports for backward compatibility
export const divVariantsMeta = tagVariantsMeta['div']!
export const sectionVariantsMeta = tagVariantsMeta['section']!
export const asideVariantsMeta = tagVariantsMeta['aside']!
export const mainVariantsMeta = tagVariantsMeta['main']!
export const navVariantsMeta = tagVariantsMeta['nav']!
export const headerVariantsMeta = tagVariantsMeta['header']!
export const footerVariantsMeta = tagVariantsMeta['footer']!
export const spanVariantsMeta = tagVariantsMeta['span']!
export const pVariantsMeta = tagVariantsMeta['p']!
export const headingVariantsMeta = Object.fromEntries(
  HEADING_TAGS.map(tag => [
    tag,
    {
      variant: Object.keys(tagHeadingVariantConfig.variant),
      size: Object.keys(tagHeadingVariantConfig.size),
    },
  ])
) as Record<(typeof HEADING_TAGS)[number], { variant: string[]; size: string[] }>
export const listingVariantsMeta = Object.fromEntries(
  LISTING_TAGS.map(tag => {
    const isContainer = (LISTING_CONTAINERS as readonly string[]).includes(tag)
    const base = isContainer ? listingContainersVariantConfig : listingItemsVariantConfig
    return [tag, extractMetaKeys(base)]
  })
) as Record<string, Record<string, string[]>>
