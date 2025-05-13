// ezstart/packages/libs/ez-tag/src/component/EzTag.tsx

import { cn } from '@workspace/ui/lib/utils';
import { EzTagRuntimeChecks } from '../runtime-checks';
import { EzTagVariants } from '../styles';
import { EzTagProps } from '../types/props';
import { LayoutTag } from '../types/supported-tags';

export default function EzTag<T extends LayoutTag>(props: EzTagProps<T>) {
  if (!props || typeof props !== 'object') {
    console.error('[EzTag] ❌ Invalid props:', props);
    return null;
  }

  const {
    as,
    variant = 'default',
    className,
    style,
    id,
    children,
    ...restProps
  } = props;

  const tag = as ?? 'div';
  const Component = tag as React.ElementType;

  // Runtime checks
  EzTagRuntimeChecks[tag]?.(restProps);

  return (
    <Component
      data-ez-tag={tag}
      className={cn(EzTagVariants[tag]?.[variant], className)}
      style={style}
      id={id}
      {...filterRestProps(restProps)}
    >
      {children}
    </Component>
  );
}

function filterRestProps(obj: Record<string, any>): Record<string, any> {
  if (!obj || typeof obj !== 'object') return {};

  const safe: Record<string, any> = {};

  Object.keys(obj).forEach((key) => {
    if (typeof key === 'string') {
      safe[key] = obj[key];
    }
  });

  return safe;
}
