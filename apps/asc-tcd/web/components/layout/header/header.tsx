'use client';

import { Burger, Div, H2, P, Tag } from '@ezstart/ui/components';
import { useClickOutside, useDevice, useOnScroll } from '@ezstart/ui/hooks';
import { cn } from '@ezstart/ui/lib';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { MobileNavMenu } from '../mobile-nav-menu';
import { NavMenu } from '../nav-menu';

export default function Header() {
  const { isDesktop, isTablet, isMobile } = useDevice();
  const [isOpen, setIsOpen] = useState(false);
  const scrollY = useOnScroll();
  const isTop = scrollY === 0;
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  useClickOutside(mobileMenuRef, () => {
    if (isTablet && isOpen) {
      console.log('isTablet && isOpen');
      setIsOpen(false);
    }
  });

  useEffect(() => {
    if (!isTablet && isOpen) {
      console.log('!isTablet && isOpen');
      setIsOpen(false);
    }
  }, [isTablet, isOpen]);

  return (
    <Tag as='header' layout={'spaced'} position={'fixed'} className='flex-col'>
      <div
        className={cn(
          ' py-4 pr-2 pl-4 md:px-6 flex items-center justify-between transition-all duration-300',
          {
            'bg-background/80': isTop,
            'bg-background border-b-2': !isTop && !isOpen,
            'py-2': !isTop && isDesktop,
          }
        )}
      >
        <Link href='/' className='flex items-center gap-2'>
          <Image
            src='/images/logo.png'
            alt='ASC Logo'
            width={60}
            height={60}
            className='mx-auto'
          />
          <Div size={'default'} className='gap-0'>
            <H2
              size={'h5'}
              className='font-light font-mono text-left md:text-2xl'
              style={{ fontFamily: `'Cambria', Georgia, serif` }}
            >
              ASC
            </H2>
            <P size={'xs'} className='italic'>
              Pour nous, pour eux, construisons la ville de demain… durable !
            </P>
          </Div>
        </Link>

        <div className='flex items-center gap-2'>
          {isDesktop && (
            <NavMenu
              className={cn(
                'sticky top-14 flex items-center justify-center gap-2 w-full z-20'
              )}
            />
          )}
          {/* <HeaderControls /> */}
          {isTablet && <Burger setIsOpen={setIsOpen} isOpen={isOpen} />}
        </div>
      </div>
      {isTablet && (
        <div
          // ref={mobileMenuRef}
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
