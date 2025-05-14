import { cva } from 'class-variance-authority';

export const sectionVariants = cva('container mx-auto flex flex-col', {
  variants: {
    variant: {
      default:
        'px-4 md:px-10 lg:px-20 py-4 md:py-10 lg:py-20 gap-2 md:gap-4 lg:gap-6',
      loose: 'px-4 md:px-8 lg:px-16 py-16 gap-10',
      tight: 'px-2 py-2 gap-1',
      none: '',
    },
    size: {
      default: '',
      sm: 'max-w-2xl',
      md: 'max-w-4xl',
      lg: 'max-w-5xl',
      xl: 'max-w-6xl',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});
