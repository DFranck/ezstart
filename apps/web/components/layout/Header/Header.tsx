'use client';

import { useDevice } from '@/hooks/useDevice';
import { DesktopHeader } from './DesktopHeader';
import MobileHeader from './MobileHeader';
import TabletHeader from './TabletHeader';

export default function Header() {
  const { isMobile, isTablet } = useDevice();

  if (isMobile) return <MobileHeader />;
  if (isTablet) return <TabletHeader />;

  return <DesktopHeader />;
}
