import { cva } from 'class-variance-authority';
import { containerIntents } from '../../tokens/Intents';
import { containerSizeVariants } from '../../tokens/size';
import { containerVariants } from '../../tokens/variants';

export const sectionVariants = cva('container mx-auto flex flex-col', {
  variants: {
    variant: containerVariants,
    size: containerSizeVariants,
    intent: containerIntents,
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
    intent: 'default',
  },
});
