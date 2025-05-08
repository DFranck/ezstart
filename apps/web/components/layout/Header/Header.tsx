'use client';
import { useDevice } from '@/hooks/useDevice';
import { DesktopHeader } from './DesktopHeader';

const Header = () => {
  const { isDesktop, isMobile, isTablet } = useDevice();
  return <>{isDesktop && <DesktopHeader />}</>;
};

export default Header;
