'use client';

import { EzTag } from '@ezstart/ez-tag';
import { cn } from '@ezstart/ui//lib/utils';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeSwitcher({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <EzTag
      as='button'
      onClick={toggleTheme}
      aria-label='Toggle theme'
      variant='ghost'
      className={cn('cursor-pointer', className)}
      size={'sm'}
    >
      {theme === 'light' ? (
        <Sun className='w-4 h-4' />
      ) : (
        <Moon className='w-4 h-4' />
      )}
    </EzTag>
  );
}
