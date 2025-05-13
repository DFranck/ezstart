// packages/libs/ez-tag/src/classNames/headings.ts
import { twJoin, twMerge } from 'tailwind-merge';

const base = twJoin('font-display', 'font-bold', '!leading-[1.3]');

const sizeMap = {
  h1: 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl',
  h2: 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl',
  h3: 'text-2xl sm:text-3xl md:text-4xl',
  h4: 'text-xl sm:text-2xl md:text-3xl',
} as const;

type HeadingLevel = keyof typeof sizeMap;
type HeadingKey = HeadingLevel;

export const headingVariants = ((): Record<HeadingKey, string> => {
  const out = {} as Record<HeadingKey, string>;
  (Object.keys(sizeMap) as Array<HeadingLevel>).forEach((lvl) => {
    out[lvl] = twMerge(base, sizeMap[lvl]);
  });
  return out;
})() satisfies Record<HeadingKey, string>;
