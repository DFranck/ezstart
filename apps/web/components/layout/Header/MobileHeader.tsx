'use client';

import { EzTag } from '@ezstart/ez-tag';
import { LocaleSwitcher } from './LocaleSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';

export default function TabletHeader() {
  return (
    <header className='border-b px-4 py-3 flex items-center justify-between bg-background'>
      <EzTag as='h2' className='text-lg font-semibold'>
        EzStart
      </EzTag>

      <EzTag as='div' className='flex items-center gap-2'>
        <LocaleSwitcher />
        <ThemeSwitcher />
      </EzTag>
    </header>
  );
}
