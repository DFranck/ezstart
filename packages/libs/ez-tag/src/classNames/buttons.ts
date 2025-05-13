// packages/libs/ez-tag/src/classNames/buttons.ts
import { twJoin, twMerge } from 'tailwind-merge';
import { allClickableText } from './shared';

type Intent = (typeof intents)[number];
type Size = (typeof sizes)[number];
type ButtonKey = `button.${Intent}` | `button.${Intent}.${Size}`;

const intents = [
  'primary',
  'secondary',
  'neutral',
  'tertiary',
  'circular-primary',
  'circular-secondary',
  'circular-icon',
] as const;
const sizes = ['small', 'medium', 'large'] as const;

// base classes par intent (sans taille)
const baseByIntent: Record<Intent, string> = {
  primary: twJoin(
    allClickableText,
    'border-palette-green bg-palette-green text-palette-text'
  ),
  secondary: twJoin(
    allClickableText,
    'border-palette-green text-palette-green backdrop-blur-md'
  ),
  neutral: twJoin(allClickableText, 'border-white bg-white text-palette-text'),
  tertiary: twJoin(
    allClickableText,
    'border-palette-cyan bg-palette-cyan text-palette-text'
  ),
  'circular-primary': twMerge(allClickableText, '!size-10 rounded-full …'),
  'circular-secondary': twMerge(allClickableText, '!size-10 rounded-full …'),
  'circular-icon': twMerge(allClickableText, '!size-10 rounded-full …'),
};

export const buttonVariants = (() => {
  const out = {} as Record<ButtonKey, string>;
  for (const intent of intents) {
    // bouton sans taille
    out[`button.${intent}`] = baseByIntent[intent];
    // variantes avec taille
    for (const size of sizes) {
      out[`button.${intent}.${size}`] = twMerge(
        baseByIntent[intent],
        size === 'medium'
          ? ''
          : size === 'small'
            ? 'px-4 py-2 text-xs'
            : 'px-8 py-4 text-lg'
      );
    }
  }
  return out;
})() satisfies Record<ButtonKey, string>;
