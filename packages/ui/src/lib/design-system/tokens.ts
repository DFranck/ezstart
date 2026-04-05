import { cn } from '../utils'

/**
 * Design System Tokens - @ezstart/ui
 *
 * Tokens centralisés pour tous les composants UI.
 * Pattern responsive mobile-first (sm: 640px breakpoint)
 *
 * Inspiré de la structure tag/tokens.ts mais optimisé et étendu.
 */

// ============================================================================
// TOUCH TARGETS (Hauteurs Responsive - WCAG 44px minimum)
// ============================================================================

/**
 * Touch targets pour éléments interactifs (buttons, inputs, etc.)
 * Mobile: 44px minimum (WCAG AAA)
 * Desktop: Tailles réduites pour densité
 */
export const touchHeight = {
  sm: 'h-10 sm:h-8',      // Mobile 40px → Desktop 32px (petits boutons)
  default: 'h-11 sm:h-9', // Mobile 44px → Desktop 36px (STANDARD)
  lg: 'h-12 sm:h-10',     // Mobile 48px → Desktop 40px (grands boutons)
  xl: 'h-14 sm:h-12',     // Mobile 56px → Desktop 48px (très grands)
} as const

/**
 * Touch targets carrés (icon buttons, checkbox, etc.)
 */
export const touchSize = {
  sm: 'size-10 sm:size-8',    // Mobile 40px → Desktop 32px
  default: 'size-11 sm:size-9', // Mobile 44px → Desktop 36px
  lg: 'size-12 sm:size-10',    // Mobile 48px → Desktop 40px
} as const

/**
 * Touch targets pour éléments très petits (checkbox, radio, etc.)
 * Ajoute padding invisible pour agrandir la zone de clic
 */
export const touchSmall = {
  checkbox: cn('size-5 sm:size-4'), // Mobile 20px → Desktop 16px (élément)
  checkboxHitArea: cn('p-2 -m-2 sm:p-0 sm:m-0'), // Agrandit la zone de clic mobile
} as const

// ============================================================================
// PADDING (Spacing Interne - Responsive)
// ============================================================================

/**
 * Padding horizontal responsive
 * Mobile: Réduit pour écrans étroits
 * Desktop: Standard/élargi
 */
export const paddingX = {
  xs: 'px-2 sm:px-1',       // Mobile 8px → Desktop 4px
  sm: 'px-3 sm:px-2',       // Mobile 12px → Desktop 8px
  default: 'px-4 sm:px-3',  // Mobile 16px → Desktop 12px
  md: 'px-4 sm:px-4',       // Mobile 16px → Desktop 16px (stable)
  lg: 'px-4 sm:px-6',       // Mobile 16px → Desktop 24px ⭐ CARD/DIALOG
  xl: 'px-6 sm:px-8',       // Mobile 24px → Desktop 32px
} as const

/**
 * Padding vertical responsive
 */
export const paddingY = {
  xs: 'py-1 sm:py-0.5',     // Mobile 4px → Desktop 2px
  sm: 'py-2 sm:py-1',       // Mobile 8px → Desktop 4px
  default: 'py-2 sm:py-2',  // Mobile 8px → Desktop 8px (stable)
  md: 'py-3 sm:py-2',       // Mobile 12px → Desktop 8px
  lg: 'py-4 sm:py-3',       // Mobile 16px → Desktop 12px
  xl: 'py-6 sm:py-4',       // Mobile 24px → Desktop 16px
} as const

/**
 * Padding complet (shorthand)
 */
export const padding = {
  xs: cn(paddingX.xs, paddingY.xs),       // p-2/1 sm:p-1/0.5
  sm: cn(paddingX.sm, paddingY.sm),       // p-3/2 sm:p-2/1
  default: cn(paddingX.default, paddingY.default), // p-4/2 sm:p-3/2
  md: cn(paddingX.md, paddingY.md),       // p-4/3 sm:p-4/2
  lg: cn(paddingX.lg, paddingY.lg),       // p-4/4 sm:p-6/3 ⭐
  xl: cn(paddingX.xl, paddingY.xl),       // p-6/6 sm:p-8/4
} as const

// ============================================================================
// GAP (Spacing Entre Éléments - Responsive)
// ============================================================================

/**
 * Gap/spacing entre éléments enfants
 * Mobile: Réduit pour économiser l'espace
 * Desktop: Standard
 */
export const gap = {
  xs: 'gap-1 sm:gap-0.5',       // Mobile 4px → Desktop 2px
  tight: 'gap-1.5 sm:gap-1',    // Mobile 6px → Desktop 4px (compact)
  sm: 'gap-2 sm:gap-1',         // Mobile 8px → Desktop 4px
  default: 'gap-2 sm:gap-2',    // Mobile 8px → Desktop 8px (stable)
  normal: 'gap-3 sm:gap-2',     // Mobile 12px → Desktop 8px
  relaxed: 'gap-4 sm:gap-3',    // Mobile 16px → Desktop 12px ⭐ CARD/DIALOG
  spacious: 'gap-6 sm:gap-4',   // Mobile 24px → Desktop 16px
  loose: 'gap-8 sm:gap-6',      // Mobile 32px → Desktop 24px
} as const

// ============================================================================
// FONT SIZE (Typography - Responsive)
// ============================================================================

/**
 * Font sizes responsive (mobile-first)
 * Mobile: Tailles plus grandes pour lisibilité
 * Desktop: Tailles réduites pour densité
 */
export const fontSize = {
  // Corps de texte
  xs: 'text-xs sm:text-[10px]',        // Mobile 12px → Desktop 10px
  sm: 'text-sm sm:text-xs',            // Mobile 14px → Desktop 12px
  base: 'text-base sm:text-sm',        // Mobile 16px → Desktop 14px ⭐ INPUT
  default: 'text-base sm:text-sm',     // Alias de base
  lg: 'text-lg sm:text-base',          // Mobile 18px → Desktop 16px
  xl: 'text-xl sm:text-lg',            // Mobile 20px → Desktop 18px

  // Headings (inspiré de tag/tokens.ts)
  h1: 'text-3xl sm:text-4xl md:text-5xl',     // 30px → 36px → 48px
  h2: 'text-2xl sm:text-3xl md:text-4xl',     // 24px → 30px → 36px
  h3: 'text-xl sm:text-2xl md:text-3xl',      // 20px → 24px → 30px
  h4: 'text-lg sm:text-xl md:text-2xl',       // 18px → 20px → 24px
  h5: 'text-base sm:text-lg md:text-xl',      // 16px → 18px → 20px
  h6: 'text-sm sm:text-base md:text-lg',      // 14px → 16px → 18px

  // Display (très grands)
  giant: 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl',
} as const

/**
 * Font weights
 */
export const fontWeight = {
  light: 'font-light',
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
} as const

/**
 * Line heights
 */
export const lineHeight = {
  tight: 'leading-tight',
  snug: 'leading-snug',
  normal: 'leading-normal',
  relaxed: 'leading-relaxed',
  loose: 'leading-loose',
} as const

// ============================================================================
// BORDER RADIUS (Arrondis)
// ============================================================================

export const radius = {
  none: 'rounded-none',
  sm: 'rounded-sm',         // 2px (petits éléments)
  default: 'rounded-md',    // 6px (input, select, button) ⭐
  md: 'rounded-md',         // Alias
  lg: 'rounded-lg',         // 8px (dialog)
  xl: 'rounded-xl',         // 12px (card) ⭐
  '2xl': 'rounded-2xl',     // 16px
  '3xl': 'rounded-3xl',     // 24px
  full: 'rounded-full',     // 9999px (badge, avatar)
} as const

// ============================================================================
// SHADOW (Ombres)
// ============================================================================

export const shadow = {
  none: 'shadow-none',
  xs: 'shadow-xs',          // Subtile (button, input)
  sm: 'shadow-sm',          // Petite (card, badge) ⭐
  default: 'shadow',        // Standard
  md: 'shadow-md',          // Moyenne
  lg: 'shadow-lg',          // Grande (modal, dialog) ⭐
  xl: 'shadow-xl',          // Très grande
  '2xl': 'shadow-2xl',      // Massive (card elevated)
} as const

// ============================================================================
// INTENT (Couleurs Sémantiques - Inspiré de tag/tokens.ts)
// ============================================================================

/**
 * Intent pour conteneurs (backgrounds + borders)
 */
export const intentContainer = {
  default: '',
  primary: 'bg-primary text-primary-foreground shadow-sm',
  success: 'border border-success bg-success/20 text-success-foreground',
  warning: 'border border-warning bg-warning/20 text-warning-foreground',
  destructive: 'border border-destructive bg-destructive/20 text-destructive-foreground',
  danger: 'border border-destructive bg-destructive/20 text-destructive-foreground', // Alias
  info: 'border border-info bg-info/50 text-info-foreground',
  skeleton: 'skeleton-shimmer opacity-50 bg-muted text-transparent pointer-events-none',
  disabled: 'bg-muted text-muted-foreground opacity-50 pointer-events-none',
} as const

/**
 * Intent pour texte seul
 */
export const intentText = {
  default: '',
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
  danger: 'text-destructive', // Alias
  info: 'text-info',
  muted: 'text-muted-foreground',
  disabled: 'text-muted opacity-50 pointer-events-none',
} as const

// ============================================================================
// VARIANT (Styles Visuels - Inspiré de tag/tokens.ts)
// ============================================================================

export const containerCommonClasses = ''

/**
 * Variants pour conteneurs (cards, sections, etc.)
 */
export const variantContainer = {
  default: '',
  primary: cn(containerCommonClasses, 'bg-primary text-primary-foreground shadow-sm'),
  outline: cn(containerCommonClasses, 'border shadow-sm rounded'),
  filled: cn(containerCommonClasses, 'bg-muted'),
  ghost: cn(containerCommonClasses, ''),
  card: cn(containerCommonClasses, 'bg-card border shadow-sm text-card-foreground rounded'),
  floating: cn(containerCommonClasses, 'bg-card border shadow-lg rounded'),
} as const

export const textCommonClasses = ''

/**
 * Variants pour texte/typography
 */
export const variantText = {
  default: '',
  link: cn(textCommonClasses, 'inline-block text-cyan-600 hover:underline cursor-pointer'),
  description: cn(textCommonClasses, 'italic text-muted-foreground font-light'),
  muted: cn(textCommonClasses, 'text-muted-foreground'),
} as const

// ============================================================================
// LAYOUT (Positionnement - Inspiré de tag/tokens.ts)
// ============================================================================

export const layoutContainerCommon = 'gap-2 mx-auto'

/**
 * Layouts pour conteneurs
 */
export const layoutContainer = {
  inline: cn(layoutContainerCommon, 'flex flex-row flex-wrap items-center'),
  block: cn(layoutContainerCommon, 'flex'),
  col: cn(layoutContainerCommon, 'flex flex-col'),
  row: cn(layoutContainerCommon, 'flex flex-row'),
  grid: cn(
    layoutContainerCommon,
    'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'
  ),
  center: cn(layoutContainerCommon, 'flex flex-col items-center justify-center'),
} as const

export const layoutTextCommon = 'gap-2'

/**
 * Layouts pour texte
 */
export const layoutText = {
  default: '',
  inline: cn(layoutTextCommon, 'flex flex-row items-center'),
  center: cn(layoutTextCommon, 'text-center'),
  left: cn(layoutTextCommon, 'text-left'),
  right: cn(layoutTextCommon, 'text-right'),
} as const

// ============================================================================
// ALIGN (Alignement)
// ============================================================================

/**
 * Alignements (inspiré de tag/tokens.ts)
 */
export const align = {
  center: 'items-center justify-center text-center',
  left: 'items-start justify-start text-left',
  right: 'items-end justify-end text-right',
  between: 'items-center justify-between',
  around: 'items-center justify-around',
  evenly: 'items-center justify-evenly',
} as const

// ============================================================================
// SIZE (Tailles Conteneurs - Inspiré de tag/tokens.ts)
// ============================================================================

export const sizeContainerCommon = 'w-full'

/**
 * Tailles de conteneurs (sections, divs, etc.)
 * Responsive max-width + gap
 */
export const sizeContainer = {
  default: '',
  xs: cn(sizeContainerCommon, 'max-w-2xl gap-1 md:gap-2'),
  sm: cn(sizeContainerCommon, 'max-w-3xl gap-1 md:gap-2'),
  md: cn(sizeContainerCommon, 'max-w-4xl gap-2 md:gap-4'),
  lg: cn(sizeContainerCommon, 'max-w-5xl gap-2 md:gap-4'),
  xl: cn(sizeContainerCommon, 'max-w-6xl gap-4 md:gap-6'),
  '2xl': cn(sizeContainerCommon, 'max-w-7xl gap-4 md:gap-6'),
  full: cn(sizeContainerCommon, 'max-w-none gap-4 md:gap-8'),
} as const

/**
 * Tailles responsive (width + height combinés)
 */
export const size = {
  xs: 'text-xs px-2 py-1',
  sm: 'text-sm px-3 py-1.5',
  default: 'text-base px-4 py-2',
  lg: 'text-lg px-6 py-3',
  xl: 'text-xl px-8 py-4',
} as const

// ============================================================================
// DENSITY (Espacement Global - compact/default/relaxed)
// ============================================================================

export const densityContainer = {
  compact: 'gap-1 py-1 px-2',
  default: '',
  relaxed: 'gap-4 py-4 px-4',
} as const

export const densityText = {
  compact: 'leading-tight',
  default: '',
  relaxed: 'leading-relaxed',
} as const

// ============================================================================
// RESPONSIVE PATTERNS (Patterns Communs)
// ============================================================================

/**
 * Patterns responsive couramment utilisés
 */
export const responsive = {
  // Input/Form patterns
  formInput: cn(touchHeight.default, paddingX.default, fontSize.base),
  formLabel: cn(fontSize.base, fontWeight.medium, gap.default),

  // Container patterns
  cardPadding: cn(paddingX.lg, paddingY.lg),
  dialogPadding: cn(paddingX.lg, paddingY.lg),
  cardGap: gap.relaxed,

  // Modal widths
  modalWidth: {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    full: 'max-w-[95vw]',
  },

  // Safe areas (mobile)
  safeWidth: 'max-w-[calc(100%-1rem)] sm:max-w-[calc(100%-2rem)]',
  safeHeight: 'max-h-[90vh]',

  // Grid columns
  gridCols: {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
  },
} as const

// ============================================================================
// SIZE TEXT (Typography Sizing Scale - Headings, Spans, etc.)
// ============================================================================

/**
 * Text sizing scale used by heading, span, and p tag variants.
 * Separate from fontSize because it includes heading-level defaults.
 */
export const sizeText = {
  default: '',
  h1: 'text-3xl sm:text-4xl md:text-5xl',
  h2: 'text-2xl sm:text-3xl md:text-4xl',
  h3: 'text-xl sm:text-2xl md:text-3xl',
  h4: 'text-lg sm:text-xl md:text-2xl',
  h5: 'text-base sm:text-lg md:text-xl',
  h6: 'text-sm sm:text-base md:text-lg',
  giant: 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl',
  lg: 'text-lg sm:text-xl',
  sm: 'text-sm sm:text-base',
  xs: 'text-xs sm:text-sm',
} as const

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Export groupé pour faciliter l'import
 */
export const tokens = {
  // Touch & Sizing
  touchHeight,
  touchSize,
  touchSmall,

  // Spacing
  padding,
  paddingX,
  paddingY,
  gap,

  // Typography
  fontSize,
  fontWeight,
  lineHeight,

  // Visual
  radius,
  shadow,

  // Semantic
  intent: intentContainer,
  intentText,
  variant: variantContainer,
  variantText,

  // Layout
  layout: layoutContainer,
  layoutText,
  align,

  // Size
  size,
  sizeContainer,
  sizeText,

  // Density
  density: densityContainer,
  densityText,

  // Patterns
  responsive,
} as const

/**
 * Type helper pour les tokens
 */
export type Tokens = typeof tokens
export type TokenKey = keyof Tokens
