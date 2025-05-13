// packages/libs/ez-tag/src/classNames/index.ts
import { twJoin, twMerge } from 'tailwind-merge';

import { buttonVariants } from './buttons';
import { headingVariants } from './headings';
import { inputVariants } from './inputs';
import { linkVariants } from './links';

// Tu peux aussi ajouter d’autres groupes au même pattern…

// Exemples de classes isolées
export const footnote = twJoin('text-sm leading-relaxed text-white/60');
export const superHeading = twMerge(
  twJoin('font-display', 'font-bold'),
  'uppercase tracking-wide text-palette-beige'
);

export const classNames = {
  // groupes
  ...linkVariants,
  ...buttonVariants,
  ...inputVariants,
  ...headingVariants,

  // isolés
  footnote,
  superHeading,

  // icônes, mathSymbol, progressBar… tu peux les garder ici
  'icon.huge': twJoin('text-8xl'),
  'mathSymbol.container': twJoin('inline-flex items-center gap-0.5'),
  mathSymbol: twJoin('text-sm font-bold opacity-80'),

  'progressBar.container': twJoin(
    'flex items-center h-4 w-full overflow-hidden rounded-full border-2 border-palette-beige'
  ),
  progressBar: twJoin(
    'h-full w-fit px-2 flex items-center bg-palette-beige font-bold text-palette-text'
  ),
};
