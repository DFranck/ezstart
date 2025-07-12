'use client';

import { HelpCircle, type LucideProps } from 'lucide-react';
import React, { lazy, Suspense, useMemo } from 'react';
import { customIconMap } from '../custom-icons';
import type { IconProps } from '../types';

export function Icon({
  name,
  spin = false,
  rotate,
  className,
  style,
  size = 16,
  ...props
}: IconProps) {
  if (!name) {
    console.warn(`[Icon] name is falsy → rendering fallback`, {
      name,
      type: typeof name,
      isNull: name === null,
      isUndefined: typeof name === 'undefined',
      isEmptyString: name === '',
    });
    return <HelpCircle size={size} className='text-gray-400' />;
  }

  const [prefix, iconName] = name.includes(':')
    ? name.split(':')
    : ['lucide', name];

  if (!iconName) throw new Error('Icon: icon name is missing');

  const DynamicIcon = useMemo(() => {
    return lazy<React.ComponentType<LucideProps>>(async () => {
      switch (prefix) {
        case 'lucide': {
          const mod = await import('lucide-react');
          return {
            default: mod[
              iconName as keyof typeof mod
            ] as React.ComponentType<LucideProps>,
          };
        }
        case 'fa': {
          const mod = await import('react-icons/fa');
          return {
            default: mod[
              iconName as keyof typeof mod
            ] as React.ComponentType<LucideProps>,
          };
        }
        case 'custom': {
          const component =
            customIconMap[iconName as keyof typeof customIconMap];
          console.log('component', iconName);
          if (!component) {
            throw new Error(`Unknown custom icon: ${iconName}`);
          }
          return { default: component as React.ComponentType<LucideProps> };
        }

        default: {
          console.warn(
            `Unknown icon library: ${prefix}, falling back to Lucide 'HelpCircle'`
          );
          const mod = await import('lucide-react');
          return {
            default: mod.HelpCircle,
          };
        }
      }
    });
  }, [name]);

  const tailwindSize = `w-[${size}px] h-[${size}px] min-w-[${size}px] min-h-[${size}px]`;

  const finalStyle =
    rotate != null || size != null
      ? {
          ...style,
          ...(rotate != null && { transform: `rotate(${rotate}deg)` }),
          ...(size != null && {
            width: size,
            height: size,
            minWidth: size,
            minHeight: size,
          }),
        }
      : style;

  return (
    <Suspense
      fallback={
        <span
          style={{
            width: size,
            height: size,
            display: 'inline-block',
          }}
        />
      }
    >
      <DynamicIcon
        {...props}
        className={[tailwindSize, className, spin && 'animate-spin']
          .filter(Boolean)
          .join(' ')}
        style={finalStyle}
      />
    </Suspense>
  );
}
