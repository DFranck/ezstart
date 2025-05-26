import { cva } from 'class-variance-authority';
import { containerIntents } from '../../tokens/Intents';

export const mainVariants = cva(
  'relative flex-1 flex flex-col items-center justify-center',
  {
    variants: {
      intent: containerIntents,
      withFixedHeader: {
        true: 'pt-16',
        false: '',
      },
    },
    defaultVariants: {
      intent: 'default',
      withFixedHeader: false,
    },
  }
);
