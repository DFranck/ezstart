import { cva } from 'class-variance-authority';
import { containerIntents } from '../../tokens/Intents';
import { createAlias } from '../../utils/create-alias';

export const mainVariantConfig = {
  intent: containerIntents,
  padding: {
    true: 'py-8 md:py-16 lg:py-24',
    false: '',
  },
} as const;

export const mainVariants = cva(
  'relative flex-1 flex flex-col items-center justify-center',
  {
    variants: mainVariantConfig,
    defaultVariants: {
      intent: 'default',
      padding: false,
    },
  }
);

export const Main = createAlias('main');

export const mainVariantsMeta = Object.fromEntries(
  Object.entries(mainVariantConfig).map(([variantName, variantValues]) => [
    variantName,
    Object.keys(variantValues),
  ])
) as {
  intent: string[];
  padding: string[];
};
