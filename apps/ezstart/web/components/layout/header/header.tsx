'use client';

import { Burger, H2, Icon, Tag } from '@ezstart/ui/components';
import { useClickOutside, useDevice, useOnScroll } from '@ezstart/ui/hooks';
import { cn } from '@ezstart/ui/lib';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { MobileNavMenu } from '../mobile-nav-menu';
import { NavMenu } from '../nav-menu';
import { HeaderControls } from './header-controls';

export default function Header() {
  const { isDesktop, isTablet } = useDevice();
  const [isOpen, setIsOpen] = useState(false);
  const scrollY = useOnScroll();
  const isTop = scrollY === 0;
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  useClickOutside(mobileMenuRef, () => {
    if (isTablet && isOpen) {
      setIsOpen(false);
    }
  });

  useEffect(() => {
    if (!isTablet && isOpen) {
      setIsOpen(false);
    }
  }, [isTablet, isOpen]);

  return (
    <Tag as='header' layout={'spaced'} position={'fixed'} className='flex-col'>
      <div
        className={cn(
          ' py-4 pr-2 pl-4 md:px-6 flex items-center justify-between transition-all duration-300',
          {
            'bg-transparent': isTop,
            'bg-background border-b-2': !isTop && !isOpen,
            'py-2': !isTop,
          }
        )}
      >
        <Link href='/' className='flex items-center gap-2'>
          <Icon name='custom:Ezstart' size={24} />
          <H2 size={'h4'}>EzStart</H2>
        </Link>

        {isDesktop && <NavMenu className='flex items-center gap-2' />}

        <div className='flex items-center gap-2'>
          <HeaderControls />
          {isTablet && <Burger setIsOpen={setIsOpen} isOpen={isOpen} />}
        </div>
      </div>

      {isTablet && (
        <div
          ref={mobileMenuRef}
          className={cn(
            'transition-all duration-500 ease-in-out overflow-hidden px-6 ',
            isOpen ? 'max-h-[400px] py-4 bg-background border-b-2' : 'max-h-0'
          )}
        >
          <MobileNavMenu setIsOpen={setIsOpen} />
        </div>
      )}
    </Tag>
  );
}
