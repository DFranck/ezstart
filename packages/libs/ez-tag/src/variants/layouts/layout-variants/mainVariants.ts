import { cva } from 'class-variance-authority';

export const mainVariants = cva('', {
  variants: {
    variant: {
      default: 'flex-1 flex flex-col',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});
