'use client';

import { useDevice } from '@/hooks/useDevice';
import { cn } from '@workspace/ui/lib/utils';

export function Footer() {
  const { isMobile } = useDevice();
  return (
    <footer
      className={cn(
        'border-t px-6 py-4 text-center text-xs text-muted-foreground bg-background',
        { 'mb-20': isMobile }
      )}
    >
      © {new Date().getFullYear()} ezStart. All rights reserved.
    </footer>
  );
}
