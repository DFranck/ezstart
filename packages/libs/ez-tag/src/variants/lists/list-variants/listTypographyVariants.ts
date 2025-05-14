import { cva } from 'class-variance-authority';

export const listTypographyVariants = {
  li: cva('flex gap-2', {
    variants: {
      variant: {
        default: 'text-sm text-foreground',
        muted: 'text-sm text-muted-foreground',
        card: 'rounded-lg bg-muted p-4 shadow text-sm items-center justify-center gap-2',
        check: 'text-sm before:content-["✅"] before:mr-2',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }),
  dt: cva('', {
    variants: {
      variant: {
        default: 'font-medium',
        bold: 'font-bold text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }),
  dd: cva('', {
    variants: {
      variant: {
        default: 'ml-4 text-muted-foreground',
        highlight: 'ml-4 text-foreground font-semibold',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }),
};
