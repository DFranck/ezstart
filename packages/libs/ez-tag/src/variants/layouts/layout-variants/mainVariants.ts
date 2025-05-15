import { cva } from 'class-variance-authority';

export const mainVariants = cva('relative', {
  variants: {
    variant: {
      default: 'flex-1 flex flex-col items-center justify-center',
    },
    withHeader: {
      true: 'pt-16',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'default',
    withHeader: false,
  },
});
