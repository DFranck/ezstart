import { Slot } from '@radix-ui/react-slot';
import type { VariantProps } from 'class-variance-authority';
import { ComponentProps, ElementType } from 'react';
import { cn } from '../lib/utils';
import { tagVariants } from '../variants';
import type { TagVariantsMap } from '../variants/variantTypes';

/**
 * Utility type to check if a cva() function has a `variant` prop
 */
type HasVariant<T extends (...args: any) => any> =
  keyof VariantProps<T> extends never ? false : true;

/**
 * Utility type to filter out cva() functions that don't have a `variant` prop
 */
type FilterSupportedAs<T extends Record<string, (...args: any) => any>> = {
  [K in keyof T]: HasVariant<T[K]> extends true ? K : never;
}[keyof T];
/**
 * List of supported HTML tags for EzTag, including generic span and div.
 */
export type SupportedAs =
  | FilterSupportedAs<typeof tagVariants>
  | 'span'
  | 'div';

/**
 * Dynamically extracts the variant props (like `layout`, `size`, `variant`)
 * for the given `as` tag, if it's defined in `TagVariantsMap`.
 */
export type CustomVariants<T extends SupportedAs> =
  T extends keyof TagVariantsMap ? TagVariantsMap[T] : {};

/**
 * Props definition for the EzTag component.
 * - Uses the underlying native props of the tag (`ComponentProps<T>`)
 * - Adds support for the `as` prop to choose the tag to render
 * - Extends with tag-specific variant props dynamically
 */
export type EzTagProps<T extends SupportedAs = 'span'> = Omit<
  ComponentProps<T>,
  never
> & {
  as?: T;
  asChild?: boolean;
  CustomVariants?: CustomVariants<T>;
} & CustomVariants<T>;

/**
 * EzTag: a polymorphic, styled tag component with variant support.
 * It looks up the corresponding `cva()` config from `tagVariants`
 * and applies the appropriate classNames based on the props.
 */
export function EzTag<T extends SupportedAs = 'span'>({
  as,
  asChild,
  className,
  children,
  ...props
}: EzTagProps<T> & { asChild?: boolean }) {
  const tag = (as ?? 'span') as string;

  const variantFn = tagVariants[tag as keyof typeof tagVariants];
  const variantClass =
    typeof variantFn === 'function'
      ? variantFn(props as VariantProps<typeof variantFn>)
      : '';

  const merged = cn(variantClass, className);
  const Component: ElementType = asChild ? Slot : as || 'span';

  const domSafeProps = Object.fromEntries(
    Object.entries(props).filter(
      ([_, value]) =>
        typeof value === 'string' ||
        typeof value === 'undefined' ||
        typeof value === 'function' ||
        (typeof value === 'object' && value !== null && !Array.isArray(value))
    )
  );

  return (
    <Component className={merged} {...domSafeProps}>
      {children}
    </Component>
  );
}
