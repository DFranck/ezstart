'use client';

import { ThemeSwitcher } from '@/components/layout/Header/ThemeSwitcher';
import { useNavLinks } from '@/hooks/useNavLinks';
import { EzTag } from '@ezstart/ez-tag';
import { EzStartSvg } from '@workspace/ui/icons/EzStartSvg';
import Link from 'next/link';
import { LocaleSwitcher } from './LocaleSwitcher';

export function DesktopHeader() {
  const links = useNavLinks();
  return (
    <header className='border-b px-6 py-4 flex items-center justify-between bg-background'>
      <Link href='/' className='flex items-center'>
        <EzStartSvg background='transparent' />
        <EzTag as='h2' className='flex items-center text-xl font-semibold my-0'>
          EzStart
        </EzTag>
      </Link>

      <EzTag as='nav' className='flex items-center gap-4'>
        {links.map(({ href, label }) => (
          <Link key={href} href={href} className='text-sm hover:underline'>
            {label}
          </Link>
        ))}
      </EzTag>
      <EzTag as='div' className='flex items-center gap-2'>
        <LocaleSwitcher />
        <ThemeSwitcher />
      </EzTag>
    </header>
  );
}
