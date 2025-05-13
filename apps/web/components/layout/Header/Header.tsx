'use client';

import Burger from '@/components/burger';
import { useDevice } from '@/hooks/useDevice';
import { useNavLinks } from '@/hooks/useNavLinks';
import { useOnScroll } from '@/hooks/useOnScroll';
import { EzTag } from '@ezstart/ez-tag';
import { EzStartSvg } from '@workspace/ui/icons/EzStartSvg';
import { cn } from '@workspace/ui/lib/utils';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { HeaderControls } from './HeaderControls';

export default function Header() {
  const { isDesktop, isTablet } = useDevice();
  const [isOpen, setIsOpen] = useState(false);
  const scrollY = useOnScroll();
  const links = useNavLinks();
  const isTop = scrollY === 0;

  useEffect(() => {
    if (!isTablet && isOpen) {
      setIsOpen(false);
    }
  }, [isTablet, isOpen]);

  return (
    <header className=' fixed top-0 left-0 right-0 z-50'>
      <div
        className={cn(
          ' py-4 px-6 flex items-center justify-between transition-all duration-300',
          {
            'bg-transparent': isTop,
            'bg-background ': !isTop || isOpen,
            'py-2': !isTop,
          }
        )}
      >
        <Link href='/' className='flex items-center gap-2'>
          <EzStartSvg background='transparent' />
          <EzTag as='h2'>EzStart</EzTag>
        </Link>

        {isDesktop && (
          <div className='flex items-center gap-4'>
            {links.map(({ href, label }) => (
              <Link key={href} href={href} className='text-sm hover:underline'>
                {label}
              </Link>
            ))}
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
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className='text-sm hover:underline'
                onClick={() => setIsOpen(false)}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
