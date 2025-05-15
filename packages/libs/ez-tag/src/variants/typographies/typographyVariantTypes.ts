import type { VariantProps } from 'class-variance-authority';
import { typographyVariants } from './typographyVariants';

type ExtractVariantIfPresent<T extends (...args: any) => any> =
  'variant' extends keyof VariantProps<T>
    ? { variant?: VariantProps<T>['variant'] }
    : {};

export type TypographyTagVariantsMap = {
  [K in keyof typeof typographyVariants]: VariantProps<
    (typeof typographyVariants)[K]
  > &
    ExtractVariantIfPresent<(typeof typographyVariants)[K]>;
};

export type TypographyTag = keyof typeof typographyVariants;
