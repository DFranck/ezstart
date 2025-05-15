'use client';

import type { LucideProps } from 'lucide-react';
import React, { lazy, Suspense } from 'react';
import type { EzIconProps } from '../types/icon';

export function EzIcon({
  name,
  spin = false,
  rotate,
  className,
  style,
  ...props
}: EzIconProps) {
  const [prefix, iconName] = name.includes(':')
    ? name.split(':')
    : ['lucide', name];

  if (!iconName) throw new Error('EzIcon: icon name is missing');

  const DynamicIcon = lazy<React.ComponentType<LucideProps>>(async () => {
    switch (prefix) {
      case 'lucide': {
        const mod = await import('lucide-react');
        return { default: mod[iconName as keyof typeof mod] };
      }

      case 'fa': {
        const mod = await import('react-icons/fa');
        return { default: mod[iconName as keyof typeof mod] };
      }

      case 'custom': {
        const mod = await import(`../icons/${iconName}`);
        return { default: mod.default };
      }

      default: {
        throw new Error(`Unknown icon library: ${prefix}`);
      }
    }
  });

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
