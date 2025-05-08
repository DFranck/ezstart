// apps/web/hooks/useDevice.ts
'use client';

import { useEffect, useState } from 'react';

type DeviceType = 'mobile' | 'tablet' | 'desktop';

export function useDevice(): {
  type: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number | null;
  isReady: boolean;
} {
  const [width, setWidth] = useState<number | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const update = () => {
      setWidth(window.innerWidth);
      setIsReady(true);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const type: DeviceType =
    width === null
      ? 'desktop'
      : width < 768
        ? 'mobile'
        : width < 1024
          ? 'tablet'
          : 'desktop';

  return {
    type,
    isMobile: type === 'mobile',
    isTablet: type === 'tablet',
    isDesktop: type === 'desktop',
    width,
    isReady,
  };
}
