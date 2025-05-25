'use client';

import Burger from '@/components/ui/burger';
import { useDevice } from '@/hooks/useDevice';
import { useOnScroll } from '@/hooks/useOnScroll';
import { cn, EzTag, Icon } from '@ezstart/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { NavMenu } from '../NavMenu';
import { HeaderControls } from './HeaderControls';

export default function Header() {
  const { isDesktop, isTablet } = useDevice();
  const [isOpen, setIsOpen] = useState(false);
  const scrollY = useOnScroll();
  const isTop = scrollY === 0;

  useEffect(() => {
    if (!isTablet && isOpen) {
      setIsOpen(false);
    }
  }, [isTablet, isOpen]);

  return (
    <header className='fixed top-0 left-0 right-0 z-50'>
      <div
        className={cn(
          ' py-4 px-6 flex items-center justify-between transition-all duration-300',
          {
            'bg-transparent': isTop,
            'bg-background border-b-2': !isTop || isOpen,
            'py-2': !isTop,
          }
        )}
      >
        <Link href='/' className='flex items-center gap-2'>
          <Icon name='custom:Ezstart' size={24} />
          <EzTag as='h2' size={'h4'}>
            EzStart
          </EzTag>
        </Link>

        {isDesktop && (
          <div className='flex items-center gap-4'>
            <NavMenu />
          </div>
        )}

        <div className='flex items-center gap-2'>
          <HeaderControls />
          {isTablet && <Burger setIsOpen={setIsOpen} isOpen={isOpen} />}
        </div>
      </div>

      {isTablet && (
        <div
          className={cn(
            'transition-all duration-500 ease-in-out overflow-hidden px-6 ',
            isOpen ? 'max-h-[400px] py-4 bg-background' : 'max-h-0'
          )}
        >
          <div
            className={cn(
              'flex flex-col items-start gap-4 p-4 transition-all duration-500 ease-in-out ',
              isOpen ? 'bg-muted ' : ''
            )}
          >
            <NavMenu />
          </div>
        </div>
      )}
    </header>
  );
}
