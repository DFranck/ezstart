import { VariantProps } from 'class-variance-authority';
import { mainVariants } from '../tags/main';
import { sectionVariants } from '../tags/section';
import { ExtractVariantIfPresent } from '../types';

export const layoutVariants = {
  section: sectionVariants,
  main: mainVariants,
};

export type LayoutTagVariantsMap = {
  [K in keyof typeof layoutVariants]: VariantProps<(typeof layoutVariants)[K]> &
    ExtractVariantIfPresent<(typeof layoutVariants)[K]>;
};

export type LayoutTag = keyof typeof layoutVariants;
