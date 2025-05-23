// 🟩 Visual variations for layouts (section, main, etc.)
export const layoutVariants = {
  default:
    'px-4 md:px-10 lg:px-20 py-4 md:py-10 lg:py-20 gap-2 md:gap-4 lg:gap-6',
  primary:
    'bg-primary/10 px-4 md:px-10 lg:px-20 py-4 md:py-10 lg:py-20 gap-2 md:gap-4 lg:gap-6',
  ghost:
    'px-4 md:px-10 lg:px-20 py-4 md:py-10 lg:py-20 gap-2 md:gap-4 lg:gap-6',
  secondary:
    'bg-secondary/10 px-4 md:px-10 lg:px-20 py-4 md:py-10 lg:py-20 gap-2 md:gap-4 lg:gap-6',
  outline:
    'border border-border px-4 md:px-10 lg:px-20 py-4 md:py-10 lg:py-20 gap-2 md:gap-4 lg:gap-6',
} as const;

// 🟦 Visual variations for text (span, p, label, etc.)
export const textVariants = {
  default: '',
  primary: 'text-primary',
  secondary: 'text-secondary',
  ghost: 'text-muted-foreground',
  outline: 'underline text-primary',
} as const;

// 🟧 Visual variations for controls (buttons, input, select, etc.)
export const controlVariants = {
  default: 'bg-primary text-white hover:bg-primary/90',
  primary: 'bg-primary text-white hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  outline: 'border border-input bg-background hover:bg-accent',
} as const;

export type TextVariant = keyof typeof textVariants;
export type ControlVariant = keyof typeof controlVariants;

export type LayoutVariant = keyof typeof layoutVariants;
