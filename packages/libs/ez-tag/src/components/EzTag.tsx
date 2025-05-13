import { cn } from '@workspace/ui/lib/utils';
import type { VariantProps } from 'class-variance-authority';
import { ComponentProps, ElementType } from 'react';
import { tagVariants } from '../variants';
import type { TagVariantsMap } from '../variants/variantTypes';

type HasVariant<T extends (...args: any) => any> =
  'variant' extends keyof VariantProps<T> ? true : false;

// Keep only the keys of tagVariants whose cva has a `variant` key
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
} & CustomVariants<T>;

/**
 * EzTag: a polymorphic, styled tag component with variant support.
 * It looks up the corresponding `cva()` config from `tagVariants`
 * and applies the appropriate classNames based on the props.
 */
export function EzTag<T extends SupportedAs = 'span'>({
  as,
  className,
  children,
  ...props
}: EzTagProps<T>) {
  const tag = (as ?? 'span') as string;
  const Component = tag as ElementType;

  // Lookup the corresponding cva() function from tagVariants
  const variantFn = tagVariants[tag as keyof typeof tagVariants];

  // Compute the class string from the cva factory using passed variant props
  const variantClass =
    typeof variantFn === 'function'
      ? variantFn(props as VariantProps<typeof variantFn>)
      : '';

  // Merge with custom className
  const merged = cn(variantClass, className);

  return (
    <Component className={merged} {...props}>
      {children}
    </Component>
  );
}
