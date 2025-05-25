// packages/libs/ez-tag/src/config/sizeVariants.ts

// 🟩 Size variations for Layout components (section, main, container...)
export const containerSizeVariants = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-5xl',
  xl: 'max-w-6xl',
  default: 'max-w-3xl',
} as const;

// 🟦 Size variations for Text components (span, p, h6...)
export const textSizeVariants = {
  h1: 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl',
  h2: 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl',
  h3: 'text-2xl sm:text-3xl md:text-4xl',
  h4: 'text-xl sm:text-2xl md:text-3xl',
  h5: 'text-lg sm:text-xl md:text-2xl',
  h6: 'text-base sm:text-lg md:text-xl',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg',
  default: 'text-base',
} as const;

// 🟧 Size variations for controls (Button/input/icon...) components
export const controlSizeVariants = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-9 px-4 text-sm',
  lg: 'h-10 px-6 text-base',
  icon: 'size-9',
  default: 'h-9 px-4 text-sm',
} as const;

// Headings (déjà responsive)
export const headingVisualSizeVariants = {
  h1: 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl',
  h2: 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl',
  h3: 'text-2xl sm:text-3xl md:text-4xl',
  h4: 'text-xl sm:text-2xl md:text-3xl',
  h5: 'text-lg sm:text-xl md:text-2xl',
  h6: 'text-base sm:text-lg md:text-xl',
} as const;
