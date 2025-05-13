import { ComponentProps, ElementType, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';
import { classNames } from '../classNames';

export type EzTagVariant = keyof typeof classNames;
export type EzTagProps<T extends ElementType = 'span'> = Omit<
  ComponentProps<T>,
  'variant'
> & {
  as?: T;
  variant?: EzTagVariant | EzTagVariant[];
  tooltip?: ReactNode;
};

export function EzTag<T extends ElementType = 'span'>({
  as,
  variant,
  className,
  children,
  ...otherProps
}: EzTagProps<T>) {
  // 1️⃣ Le tag sémantique
  const tag = (as ?? 'span') as EzTagVariant;

  // 2️⃣ On détermine la(les) clé(s) de variant à utiliser :
  //    - si array, c'est plusieurs clés
  //    - sinon, soit variant fourni, soit on retombe sur le tag
  const variantKeys = Array.isArray(variant) ? variant : [variant ?? tag];

  // 3️⃣ On récupère les classes pour chaque clé, puis on fusionne
  const variantClasses = twMerge(
    ...variantKeys.map((key) => classNames[key] || '')
  );

  // 4️⃣ On fusionne enfin avec le className passé en prop
  const merged = twMerge(variantClasses, className);

  const Component = (as || 'span') as ElementType;

  return (
    <Component className={merged} {...otherProps}>
      {children}
    </Component>
  );
}
