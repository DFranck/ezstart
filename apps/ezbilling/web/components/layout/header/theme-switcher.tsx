'use client';

import { Button, Icon } from '@ezstart/ui/components';
import { cn } from '@ezstart/ui/lib';
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
    <Button
      onClick={toggleTheme}
      aria-label='Toggle theme'
      variant='ghost'
      className={cn('cursor-pointer', className)}
      size={'sm'}
    >
      {theme === 'light' ? (
        <Icon name='lucide:Moon' className='w-4 h-4' />
      ) : (
        <Icon name='lucide:Sun' className='w-4 h-4' />
      )}
    </Button>
  );
}
