'use client';

import type { LucideProps } from 'lucide-react';
import React, { Suspense, lazy } from 'react';
import type { EzIconProps } from '../types/icon';

export function EzIcon({
  name,
  spin = false,
  rotate,
  className,
  style,
  ...props
}: EzIconProps) {
  // Dynamic icon typed en LucideProps
  const DynamicIcon = lazy<React.ComponentType<LucideProps>>(async () => {
    const mod = await import('lucide-react');
    return {
      default: mod[name] as React.ComponentType<LucideProps>,
    };
  });

  // Taille fallback basée sur props.size (inclus dans LucideProps)
  const fallbackSize = props.size ?? 24;

  return (
    <Suspense
      fallback={
        <span
          style={{
            width: fallbackSize,
            height: fallbackSize,
            display: 'inline-block',
          }}
        />
      }
    >
      <DynamicIcon
        {...props}
        className={[className, spin && 'animate-spin']
          .filter(Boolean)
          .join(' ')}
        style={
          rotate != null
            ? { ...style, transform: `rotate(${rotate}deg)` }
            : style
        }
      />
    </Suspense>
  );
}
