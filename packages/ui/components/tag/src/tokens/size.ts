// packages/libs/ez-tag/src/config/sizeVariants.ts

// 🟩 Size variations for Layout components (section, main, container...)
export const containerSizeVariants = {
  xs: 'max-w-2xl px-4 py-4 gap-2',
  sm: 'max-w-3xl px-4 md:px-6 py-6 md:py-10 gap-2 md:gap-4',
  xl: 'max-w-5xl px-4 md:px-10 py-10 md:py-24 gap-4 md:gap-8',
  full: 'max-w-none px-4 md:px-10 py-10 gap-6 md:gap-8',
  default: 'max-w-4xl px-4 md:px-8 py-8 gap-4 ',
} as const;

// 🟦 Size variations for Text components (span, p, h6...)
export const textSizeVariants = {
  xs: 'text-xs',
  sm: 'text-sm',
  xl: 'text-lg',
  default: 'text-base',
} as const;

// Headings (déjà responsive)

export const headingSizeVariants = {
  h1: 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl',
  h2: 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl',
  h3: 'text-2xl sm:text-3xl md:text-4xl',
  h4: 'text-xl sm:text-2xl md:text-3xl',
  h5: 'text-lg sm:text-xl md:text-2xl',
  h6: 'text-base sm:text-lg md:text-xl',
} as const;
