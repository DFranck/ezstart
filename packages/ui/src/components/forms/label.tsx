'use client';

import * as LabelPrimitive from '@radix-ui/react-label';
import * as React from 'react';
import { cn } from '../../lib/utils';
import { fontSize, gap } from '../../lib/design-system/tokens';
import { useDesignTokens } from '../../lib/design-system/DesignTokenContext';

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  const inherited = useDesignTokens();
  const sizeClass = {
    sm: fontSize.sm,
    default: fontSize.base,
    lg: fontSize.lg,
  }[(inherited.size ?? 'default') as 'sm' | 'default' | 'lg'] ?? fontSize.base;

  return (
    <LabelPrimitive.Root
      data-slot='label'
      className={cn(
        'flex items-center leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        sizeClass,
        gap.default, // gap-2 sm:gap-2
        className
      )}
      {...props}
    />
  );
}

export { Label };
