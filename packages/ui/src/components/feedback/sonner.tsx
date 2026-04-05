'use client';

import { Toaster as Sonner, ToasterProps } from 'sonner';

interface ToasterPropsExtended extends ToasterProps {
  theme?: 'light' | 'dark' | 'system'
}

const Toaster = ({ theme = 'system', ...props }: ToasterPropsExtended) => {
  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      richColors
      className='toaster group'
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
