import type { VariantProps } from 'class-variance-authority';
import { listVariants } from './listVariants';

type ExtractVariantIfPresent<T extends (...args: any) => any> =
  'variant' extends keyof VariantProps<T>
    ? { variant?: VariantProps<T>['variant'] }
    : {};

export type LayoutTagVariantsMap = {
  [K in keyof typeof listVariants]: VariantProps<(typeof listVariants)[K]> &
    ExtractVariantIfPresent<(typeof listVariants)[K]>;
};

export type ListTag = keyof typeof listVariants;
