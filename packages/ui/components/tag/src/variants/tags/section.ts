import { cva } from 'class-variance-authority';
import { containerIntents } from '../../tokens/Intents';
import { containerSizeVariants } from '../../tokens/size';
import { containerVariants } from '../../tokens/variants';
import { createAlias } from '../../utils/create-alias';

// 👇 Config unique et typée pour variants de section
export const sectionVariantConfig = {
  variant: containerVariants,
  size: containerSizeVariants,
  intent: containerIntents,
  layout: {
    default: 'flex flex-col',
    grid: 'grid grid-cols-1 md:grid-cols-2 ',
    row: 'flex flex-row',
  },
} as const;

// 👇 cva utilise la config
export const sectionVariants = cva('container mx-auto flex flex-col', {
  variants: sectionVariantConfig,
  defaultVariants: {
    variant: 'default',
    size: 'default',
    intent: 'default',
    layout: 'default',
  },
});

// 👇 Alias
export const Section = createAlias('section');

// 👇 Meta générée dynamiquement pour Playground/Doc/devtools
export const sectionVariantsMeta = Object.fromEntries(
  Object.entries(sectionVariantConfig).map(([variantName, variantValues]) => [
    variantName,
    Object.keys(variantValues),
  ])
) as {
  variant: string[];
  size: string[];
  intent: string[];
  layout: string[];
};
