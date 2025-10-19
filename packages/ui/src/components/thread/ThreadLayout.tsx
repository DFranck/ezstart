'use client';

import { ReactNode, useState } from 'react';
import { cn } from '../../lib/utils';
import { Button } from '../button';
import { Icon } from '../icon';
import { ThreadThemeProvider, useThreadTheme } from './ThreadThemeContext';
import { ThreadLayoutProvider } from './ThreadLayoutContext';
import { ColorScheme, ThreadTheme } from './types';

type ThreadLayoutProps = {
  children: ReactNode;
  sidebar?: ReactNode;
  showSidebar?: boolean;
  sidebarWidth?: string;
  headerOffset?: string; // Offset for fixed header (e.g., 'top-16', 'top-20')
  className?: string;
  onSidebarToggle?: (isOpen: boolean) => void;
  colorScheme?: ColorScheme;
  customTheme?: Partial<ThreadTheme>;
};

function ThreadLayoutInner({
  children,
  sidebar,
  showSidebar = true,
  sidebarWidth = 'w-80',
  headerOffset = 'top-0',
  className,
  onSidebarToggle,
}: Omit<ThreadLayoutProps, 'colorScheme' | 'customTheme'>) {
  const { theme } = useThreadTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    const newState = !isSidebarOpen;
    setIsSidebarOpen(newState);
    onSidebarToggle?.(newState);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
    onSidebarToggle?.(false);
  };

  if (!showSidebar || !sidebar) {
    return (
      <div className={cn('w-full h-screen flex flex-col', theme.background, className)}>
        {children}
      </div>
    );
  }

  return (
    <ThreadLayoutProvider value={{ closeSidebar }}>
      <div className={cn('relative flex w-full h-screen', theme.background, className)}>
      {/* Mobile Toggle Button */}
      <Button
        onClick={toggleSidebar}
        size="icon"
        variant="outline"
        className={cn(
          'fixed left-4 z-50 md:hidden',
          'shadow-lg backdrop-blur-sm bg-background/80',
          headerOffset
        )}
        aria-label="Toggle conversations"
      >
        <Icon name={isSidebarOpen ? 'lucide:X' : 'lucide:Menu'} size={20} />
      </Button>

      {/* Sidebar - Desktop: always visible, Mobile: overlay */}
      <aside
        className={cn(
          'fixed md:sticky left-0 z-40',
          'transition-transform duration-300 ease-in-out',
          theme.sidebar?.background || 'bg-background',
          theme.sidebar?.border || 'border-r',
          'flex flex-col',
          sidebarWidth,
          headerOffset,
          // Calculate height based on header offset
          headerOffset === 'top-0' ? 'h-screen' :
          headerOffset === 'top-16' ? 'h-[calc(100vh-4rem)]' :
          headerOffset === 'top-20' ? 'h-[calc(100vh-5rem)]' :
          'h-[calc(100vh-4rem)]', // default to top-16
          // Mobile: translate based on state
          'md:translate-x-0',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebar}
      </aside>

      {/* Overlay - Mobile only */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Main Content - Thread */}
      <main
        className={cn(
          'flex-1 w-full flex flex-col',
          headerOffset === 'top-0' ? 'h-screen' :
          headerOffset === 'top-16' ? 'h-[calc(100vh-4rem)]' :
          headerOffset === 'top-20' ? 'h-[calc(100vh-5rem)]' :
          'h-[calc(100vh-4rem)]', // default to top-16
          'md:ml-0' // No margin on desktop, sidebar is sticky
        )}
      >
        {children}
      </main>
    </div>
    </ThreadLayoutProvider>
  );
}

export function ThreadLayout(props: ThreadLayoutProps) {
  const { colorScheme = 'neutral', customTheme, ...layoutProps } = props;

  return (
    <ThreadThemeProvider colorScheme={colorScheme} customTheme={customTheme}>
      <ThreadLayoutInner {...layoutProps} />
    </ThreadThemeProvider>
  );
}