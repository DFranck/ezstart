'use client';

import { Button } from '@workspace/ui/components/button';
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
    <Button
      onClick={toggleTheme}
      aria-label='Toggle theme'
      variant='ghost'
      className='cursor-pointer'
      size={'sm'}
    >
      {theme === 'light' ? (
        <Sun className='w-4 h-4' />
      ) : (
        <Moon className='w-4 h-4' />
      )}
    </Button>
  );
}
