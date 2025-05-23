import { cva } from 'class-variance-authority';
import { containerIntents } from '../../tokens/Intents';
import { containerSizeVariants } from '../../tokens/size';

export const sectionVariants = cva('container mx-auto flex flex-col', {
  variants: {
    variant: {
      default:
        'px-4 md:px-10 lg:px-20 py-4 md:py-10 lg:py-20 gap-2 md:gap-4 lg:gap-6',
      primary:
        'bg-primary/10 px-4 md:px-10 lg:px-20 py-4 md:py-10 lg:py-20 gap-2 md:gap-4 lg:gap-6',
      ghost:
        'px-4 md:px-10 lg:px-20 py-4 md:py-10 lg:py-20 gap-2 md:gap-4 lg:gap-6',
      secondary:
        'bg-secondary/10 px-4 md:px-10 lg:px-20 py-4 md:py-10 lg:py-20 gap-2 md:gap-4 lg:gap-6',
      outline:
        'px-4 md:px-10 lg:px-20 py-4 md:py-10 lg:py-20 gap-2 md:gap-4 lg:gap-6',
    },
    size: containerSizeVariants,
    intent: containerIntents,
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
    intent: 'default',
  },
});
