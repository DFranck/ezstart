'use client';

import { Burger, Div, H2, Icon, P, Tag } from '@ezstart/ui/components';
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
          ' pt-4 pr-2 pl-4 md:px-6 flex items-center justify-between transition-all duration-300 bg-background',
          {
            // 'bg-transparent': isTop,
            // 'bg-background border-b-2': !isTop && !isOpen,
            'pt-2': !isTop && isDesktop,
            'py-2': !isDesktop,
          }
        )}
      >
        <Link href='/' className='flex items-center gap-2'>
          <Icon name='custom:Ezstart' size={60} />
          <Div size={'default'} className='gap-0'>
            <H2 size={'h5'} className='font-light font-mono'>
              ASC
            </H2>
            <P size={'xs'} variant={'description'}>
              Pour nous, pour eux, construisons la ville de demain… durable !
            </P>
          </Div>
        </Link>

        <div className='flex items-center gap-2'>
          <HeaderControls />
          {isTablet && <Burger setIsOpen={setIsOpen} isOpen={isOpen} />}
        </div>
      </div>
      {isDesktop && (
        <NavMenu
          className={cn(
            'flex items-center justify-center gap-2 bg-background transition-all duration-300',
            isDesktop && isTop ? 'pb-4' : 'pb-2 border-b-2'
          )}
        />
      )}
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
