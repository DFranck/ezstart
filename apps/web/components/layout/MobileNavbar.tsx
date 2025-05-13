'use client';

import Burger from '@/components/burger';
import { useDevice } from '@/hooks/useDevice';
import { useNavLinks } from '@/hooks/useNavLinks';
import EzTag from '@ezstart/ez-tag';
import { cn } from '@workspace/ui/lib/utils';
import { Home, User } from 'lucide-react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function MobileNavbar() {
  const { isMobile } = useDevice();
  const locale = useLocale();
  const links = useNavLinks();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isMobile && isOpen) {
      setIsOpen(false);
    }
  }, [isMobile, isOpen]);

  if (!isMobile) return null;

  return (
    <div className='fixed bottom-0 left-0 right-0 z-50 bg-background'>
      <div
        className={cn(
          'transition-all duration-500 ease-in-out overflow-hidden px-4',
          isOpen ? 'max-h-[400px] pt-4 pb-2 ' : 'max-h-0'
        )}
      >
        <EzTag
          as='nav'
          className={cn(
            'flex flex-col gap-4 p-4 transition-all duration-500 ease-in-out ',
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
        </EzTag>
      </div>

      <EzTag as='nav' className=' shadow-md'>
        <div className='grid grid-cols-3 items-center w-full '>
          <Link href={`/${locale}`} className='w-full flex justify-center py-2'>
            <Home className='w-7 h-7' strokeWidth={1.5} />
          </Link>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className='w-full flex justify-center py-2'
          >
            <Burger isOpen={isOpen} />
          </button>

          <Link href='/profile' className='w-full flex justify-center py-2'>
            <User className='w-7 h-7' strokeWidth={1.5} />
          </Link>
        </div>
      </EzTag>
    </div>
  );
}
