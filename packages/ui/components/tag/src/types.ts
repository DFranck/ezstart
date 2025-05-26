import type { VariantProps } from 'class-variance-authority';
import { tagVariants } from './variants';

type HasVariant<T extends (...args: any) => any> =
  keyof VariantProps<T> extends never ? false : true;

type FilterSupportedAs<T extends Record<string, (...args: any) => any>> = {
  [K in keyof T]: HasVariant<T[K]> extends true ? K : never;
}[keyof T];

// Typage des tags supportés par le design system
export type SupportedAs =
  | FilterSupportedAs<typeof tagVariants>
  | 'span'
  | 'div';

// Récupère dynamiquement les variants pour un tag donné
export type CustomVariants<T extends SupportedAs> =
  T extends keyof TagVariantsMap ? TagVariantsMap[T] : {};

// Extrait les variants si “variant” existe dans la config
export type ExtractVariantIfPresent<T extends (...args: any) => any> =
  'variant' extends keyof VariantProps<T>
    ? { variant?: VariantProps<T>['variant'] }
    : {};

export type TagVariantsMap = {
  [K in keyof typeof tagVariants]: VariantProps<(typeof tagVariants)[K]> &
    ExtractVariantIfPresent<(typeof tagVariants)[K]>;
};
