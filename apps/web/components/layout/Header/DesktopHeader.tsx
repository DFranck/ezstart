'use client';

import { ThemeSwitcher } from '@/components/layout/Header/ThemeSwitcher';
import { EzTag } from '@ezstart/ez-tag';
import { Button } from '@workspace/ui/components/button';
import { EzStartSvg } from '@workspace/ui/icons/EzStartSvg';
import Link from 'next/link';
import { LocaleSwitcher } from './LocaleSwitcher';

export function DesktopHeader() {
  return (
    <header className='border-b px-6 py-4 flex items-center justify-between bg-background'>
      <Link href='/' className='flex items-center'>
        <EzStartSvg background='transparent' />
        <EzTag as='h2' className='flex items-center text-xl font-semibold my-0'>
          EzStart
        </EzTag>
      </Link>

      <EzTag as='nav' className='flex items-center gap-4'>
        <Link href='/about' className='text-sm hover:underline'>
          About
        </Link>
        <Link href='/contact' className='text-sm hover:underline'>
          Contact
        </Link>
        <Button size='sm' variant='outline'>
          Sign in
        </Button>
      </EzTag>
      <EzTag as='div' className='flex items-center gap-2'>
        <LocaleSwitcher />
        <ThemeSwitcher />
      </EzTag>
    </header>
  );
}
