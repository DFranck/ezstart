// packages/libs/ez-tag/src/classNames/links.ts
import { twMerge } from 'tailwind-merge';
import { allClickableText } from './shared';

const linkStyles = {
  default: twMerge(
    allClickableText,
    'inline text-palette-green underline underline-offset-4'
  ),
  subtle: twMerge(allClickableText, 'inline text-white/80 hover:underline'),
} as const;

type LinkVariant = keyof typeof linkStyles;
// ici LinkVariant = 'default' | 'subtle'

// on calcule explicitement le type des clés
type LinkKey = 'link' | `link.${Exclude<LinkVariant, 'default'>}`;

// => équivalent de 'link' | 'link.subtle'

export const linkVariants = ((): Record<LinkKey, string> => {
  const out = {} as Record<LinkKey, string>;

  (Object.keys(linkStyles) as Array<LinkVariant>).forEach((v) => {
    const key: LinkKey =
      v === 'default'
        ? 'link'
        : (`link.${v}` as `link.${Exclude<LinkVariant, 'default'>}`);

    out[key] = linkStyles[v];
  });

  return out;
})() satisfies Record<LinkKey, string>;
