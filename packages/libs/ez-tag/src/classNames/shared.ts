import { twJoin } from 'tailwind-merge';

export const allClickableText = twJoin(
  'relative z-10 inline-flex grow-0 cursor-pointer items-center justify-center gap-1.5 transition-all hover:scale-105 disabled:pointer-events-none disabled:opacity-40'
);
