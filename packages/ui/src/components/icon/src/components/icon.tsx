'use client';

import { HelpCircle, type LucideProps } from 'lucide-react';
import React, { lazy, Suspense, useMemo } from 'react';
import { customIconMap } from '../custom-icons';
import type { IconProps } from '../types';

// Global cache for loaded icons to avoid re-importing
const iconCache = new Map<string, React.ComponentType<LucideProps>>();

// Promise cache to avoid duplicate imports for the same icon
const loadingPromises = new Map<
  string,
  Promise<React.ComponentType<LucideProps>>
>();

async function loadIcon(
  prefix: string,
  iconName: string
): Promise<React.ComponentType<LucideProps>> {
  const cacheKey = `${prefix}:${iconName}`;

  // Return cached icon if available
  if (iconCache.has(cacheKey)) {
    return iconCache.get(cacheKey)!;
  }

  // Return existing loading promise if icon is already being loaded
  if (loadingPromises.has(cacheKey)) {
    return loadingPromises.get(cacheKey)!;
  }

  // Create new loading promise
  const loadPromise = (async () => {
    switch (prefix) {
      case 'lucide': {
        const mod = await import('lucide-react');
        const IconComponent =
          (mod[iconName as keyof typeof mod] as React.ComponentType<
            LucideProps
          >) || mod.HelpCircle;
        iconCache.set(cacheKey, IconComponent);
        return IconComponent;
      }
      case 'fa': {
        const mod = await import('react-icons/fa');
        const IconComponent =
          (mod[iconName as keyof typeof mod] as React.ComponentType<
            LucideProps
          >) || (mod.FaCircle as React.ComponentType<LucideProps>);
        iconCache.set(cacheKey, IconComponent);
        return IconComponent;
      }
      case 'custom': {
        const component =
          customIconMap[iconName as keyof typeof customIconMap];
        if (!component) {
          throw new Error(`Unknown custom icon: ${iconName}`);
        }
        const IconComponent = component as React.ComponentType<LucideProps>;
        iconCache.set(cacheKey, IconComponent);
        return IconComponent;
      }
      default: {
        console.warn(
          `Unknown icon library: ${prefix}, falling back to Lucide 'HelpCircle'`
        );
        const mod = await import('lucide-react');
        iconCache.set(cacheKey, mod.HelpCircle);
        return mod.HelpCircle;
      }
    }
  })();

  loadingPromises.set(cacheKey, loadPromise);

  try {
    const icon = await loadPromise;
    return icon;
  } finally {
    loadingPromises.delete(cacheKey);
  }
}

export function Icon({
  name,
  spin = false,
  rotate,
  className,
  style,
  size = 16,
  animate = true,
  animateDuration = 200,
  ariaLabel,
  ariaHidden,
  ariaRole,
  title,
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

  const [prefixRaw, iconNameRaw] = name.includes(':')
    ? name.split(':')
    : ['lucide', name];

  // Ensure we have valid strings
  const prefix = prefixRaw || 'lucide';
  const iconName = iconNameRaw;

  if (!iconName) throw new Error('Icon: icon name is missing');

  const DynamicIcon = useMemo(() => {
    return lazy<React.ComponentType<LucideProps>>(() =>
      loadIcon(prefix, iconName).then(icon => ({ default: icon }))
    );
  }, [prefix, iconName]);

  const tailwindSize = `w-[${size}px] h-[${size}px] min-w-[${size}px] min-h-[${size}px]`;

  const finalStyle =
    rotate != null || size != null || (animate && animateDuration)
      ? {
          ...style,
          ...(rotate != null && { transform: `rotate(${rotate}deg)` }),
          ...(size != null && {
            width: size,
            height: size,
            minWidth: size,
            minHeight: size,
          }),
          ...(animate && {
            animation: `icon-fade-in ${animateDuration}ms ease-out`,
          }),
        }
      : style;

  // Build ARIA attributes
  const ariaAttributes = useMemo(() => {
    const attrs: Record<string, any> = {};

    // If ariaHidden is explicitly set, hide from screen readers
    if (ariaHidden !== undefined) {
      attrs['aria-hidden'] = ariaHidden;
    }

    // If ariaLabel is provided, add it
    if (ariaLabel) {
      attrs['aria-label'] = ariaLabel;
    }

    // If ariaRole is provided, add it (otherwise default to 'img' if semantic)
    if (ariaRole) {
      attrs['role'] = ariaRole;
    } else if (ariaLabel && !ariaHidden) {
      // If we have a label and not hidden, it's semantic -> role="img"
      attrs['role'] = 'img';
    }

    return attrs;
  }, [ariaLabel, ariaHidden, ariaRole]);

  return (
    <Suspense
      fallback={
        <span
          style={{
            width: size,
            height: size,
            display: 'inline-block',
          }}
          aria-hidden="true"
        />
      }
    >
      <DynamicIcon
        {...(props as Omit<LucideProps, 'children'>)}
        {...ariaAttributes}
        className={[tailwindSize, className, spin && 'animate-spin']
          .filter(Boolean)
          .join(' ')}
        style={finalStyle}
      >
        {title && <title>{title}</title>}
      </DynamicIcon>
    </Suspense>
  );
}
