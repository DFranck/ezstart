'use client';

import { Burger, Icon } from '@ezstart/ui/components';
import { useClickOutside, useDevice } from '@ezstart/ui/hooks';
import { cn } from '@ezstart/ui/lib';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { MobileNavMenu } from './mobile-nav-menu';

export default function MobileNavbar() {
  const { isMobile } = useDevice();
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useClickOutside(mobileMenuRef, () => {
    if (isMobile && isOpen) {
      setIsOpen(false);
    }
  });

  useEffect(() => {
    if (!isMobile && isOpen) {
      setIsOpen(false);
    }
  }, [isMobile, isOpen]);

  if (!isMobile) return null;

  return (
    <div className='fixed bottom-0 left-0 right-0 z-50 bg-background'>
      <div
        ref={mobileMenuRef}
        className={cn(
          'transition-all duration-500 border-t-2 ease-in-out overflow-hidden px-2',
          isOpen ? 'max-h-[400px] py-2 ' : 'max-h-0'
        )}
      >
        <MobileNavMenu variant={'secondary'} setIsOpen={setIsOpen} />
      </div>

      <div className=' shadow-md'>
        <div className='grid grid-cols-3 items-center w-full '>
          <Link href={`/${locale}`} className='w-full flex justify-center py-2'>
            <Icon name='custom:Ezstart' />
          </Link>

          <Burger isOpen={isOpen} onClick={() => setIsOpen(!isOpen)} />

          <Link
            href='/profile'
            className='w-full flex justify-center py-2'
            aria-disabled
          >
            <Icon name='fa:FaUser' />
          </Link>
        </div>
      </div>
    </div>
  );
}
