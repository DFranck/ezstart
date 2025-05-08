'use client';

import { Button } from '@workspace/ui/components/button'; // adapte si pas encore en shared lib
import Link from 'next/link';
import { LocaleSwitcher } from './LocaleSwitcher';

export function Header() {
  return (
    <header className='border-b px-6 py-4 flex items-center justify-between bg-background'>
      <Link href='/' className='text-lg font-semibold'>
        ezStart
      </Link>

      <nav className='flex items-center gap-4'>
        <Link href='/about' className='text-sm hover:underline'>
          About
        </Link>
        <Link href='/contact' className='text-sm hover:underline'>
          Contact
        </Link>
        <Button size='sm' variant='outline'>
          Sign in
        </Button>
      </nav>
      <LocaleSwitcher />
    </header>
  );
}
