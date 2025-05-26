// 🟩 Visual variations for layouts (section, main, etc.)
export const containerVariants = {
  default: '',
  primary: 'bg-primary/10',
  secondary: 'bg-secondary/10',
  ghost: '',
  outline: 'border border-border',
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
export type ContainerVariant = keyof typeof containerVariants;
