import { Slot } from '@radix-ui/react-slot';
import type { VariantProps } from 'class-variance-authority';
import { ComponentProps, ElementType } from 'react';
import { cn } from '../../../../lib/utils';
import { CustomVariants, SupportedAs } from '../types';
import { tagVariants } from '../variants';

export type TagProps<T extends SupportedAs = 'span'> = Omit<
  ComponentProps<T>,
  never
> & {
  as?: T;
  asChild?: boolean;
  CustomVariants?: CustomVariants<T>;
} & CustomVariants<T>;

export function Tag<T extends SupportedAs = 'span'>({
  as,
  asChild,
  className,
  children,
  ...props
}: TagProps<T> & { asChild?: boolean }) {
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
