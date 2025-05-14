import { cva } from 'class-variance-authority';

export const listLayoutsVariants = {
  ul: cva('', {
    variants: {
      variant: {
        default: '',
        menu: 'rounded-md border p-1 shadow-lg transition-all duration-500 ease-in-out',
      },
      layout: {
        default: 'list-disc flex flex-col ',
        inline: 'list-disc flex flex-wrap gap-4',
        grid: 'grid grid-cols-1 md:grid-cols-2 gap-4',
        none: '',
      },
    },
    defaultVariants: {
      layout: 'default',
      variant: 'default',
    },
  }),
  ol: cva('', {
    variants: {
      layout: {
        default: 'list-decimal pl-5 space-y-2',
        inline: 'list-decimal pl-0 flex gap-4',
        none: '',
      },
    },
    defaultVariants: {
      layout: 'default',
    },
  }),
  dl: cva('', {
    variants: {
      layout: {
        default: 'space-y-2',
        grid: 'grid grid-cols-[auto,1fr] gap-x-2 gap-y-1',
        none: '',
      },
    },
    defaultVariants: {
      layout: 'default',
    },
  }),
};
