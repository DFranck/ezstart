import { cva } from 'class-variance-authority';

export const paragraphVariants = cva('', {
  variants: {
    variant: {
      default: '',
      muted: 'text-muted-foreground',
      lead: 'text-muted-foreground font-medium',
    },
    size: {
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
      '2xl': 'text-2xl',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'base',
  },
});
