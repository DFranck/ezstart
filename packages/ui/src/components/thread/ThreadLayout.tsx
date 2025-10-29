'use client'

import React, { ReactNode, useState, useCallback } from 'react'
import { cn } from '../../lib/utils'
import { Button } from '../button'
import { Icon } from '../icon'
import { ThreadLayoutProvider } from './ThreadLayoutContext'
import { ThreadThemeProvider, useThreadTheme } from './ThreadThemeContext'
import { ColorScheme, ThreadTheme } from './types'

type ThreadLayoutProps = {
  children: ReactNode
  sidebar?: ReactNode
  sidebarToggle?: ReactNode // Custom toggle button. If provided, default button is hidden.
  showSidebar?: boolean
  sidebarWidth?: string
  headerOffset?: string // Offset for fixed header (e.g., 'top-16', 'top-20')
  mobileHeaderOffset?: string // Mobile-only header offset (e.g., 'pt-16', 'mt-16')
  mobileFooterOffset?: string // Mobile-only footer offset (e.g., 'pb-16', 'mb-16')
  className?: string
  onSidebarToggle?: (isOpen: boolean) => void
  colorScheme?: ColorScheme
  customTheme?: Partial<ThreadTheme>
}

const ThreadLayoutInner = React.memo(function ThreadLayoutInner({
  children,
  sidebar,
  sidebarToggle,
  showSidebar = true,
  sidebarWidth = 'w-80',
  headerOffset = 'top-0',
  mobileHeaderOffset,
  mobileFooterOffset,
  className,
  onSidebarToggle,
}: Omit<ThreadLayoutProps, 'colorScheme' | 'customTheme'>) {
  const { theme } = useThreadTheme()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const toggleSidebar = useCallback(() => {
    const newState = !isSidebarOpen
    setIsSidebarOpen(newState)
    onSidebarToggle?.(newState)
  }, [isSidebarOpen, onSidebarToggle])

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false)
    onSidebarToggle?.(false)
  }, [onSidebarToggle])

  if (!showSidebar || !sidebar) {
    return (
      <div
        className={cn(
          'w-full h-screen flex flex-col',
          theme.background,
          mobileHeaderOffset && `md:pt-0 ${mobileHeaderOffset}`,
          mobileFooterOffset && `md:pb-0 ${mobileFooterOffset}`,
          className
        )}
      >
        {children}
      </div>
    )
  }

  return (
    <ThreadLayoutProvider
      value={{ closeSidebar, toggleSidebar, isSidebarOpen, mobileFooterOffset }}
    >
      <div
        className={cn(
          'relative flex w-full h-screen',
          theme.background,
          // Add padding-top based on headerOffset to prevent overlap
          headerOffset === 'top-16'
            ? 'pt-16'
            : headerOffset === 'top-20'
              ? 'pt-20'
              : headerOffset === 'top-0'
                ? ''
                : headerOffset.startsWith('top-')
                  ? headerOffset.replace('top-', 'pt-')
                  : '',
          mobileHeaderOffset && `md:pt-0 ${mobileHeaderOffset}`,
          className
        )}
      >
        {/* Mobile Toggle Button - Default or Custom */}
        {sidebarToggle ? (
          sidebarToggle
        ) : (
          <Button
            onClick={toggleSidebar}
            size="icon"
            variant="outline"
            aria-expanded={isSidebarOpen}
            aria-controls="thread-sidebar"
            aria-label={isSidebarOpen ? 'Close conversations sidebar' : 'Open conversations sidebar'}
            className={cn(
              'fixed left-4 z-50 md:hidden',
              'shadow-lg backdrop-blur-sm bg-background/80',
              headerOffset,
              mobileHeaderOffset && mobileHeaderOffset.replace('pt-', 'top-').replace('mt-', 'top-')
            )}
          >
            <Icon name={isSidebarOpen ? 'lucide:X' : 'lucide:Menu'} size={20} ariaHidden />
          </Button>
        )}

        {/* Sidebar - Desktop: always visible, Mobile: overlay */}
        <aside
          id="thread-sidebar"
          role="complementary"
          aria-label="Conversations sidebar"
          aria-hidden={!isSidebarOpen}
          className={cn(
            'fixed md:sticky left-0 z-40',
            'transition-transform duration-300 ease-in-out',
            theme.sidebar?.background || 'bg-background',
            theme.sidebar?.border || 'border-r',
            'flex flex-col',
            sidebarWidth,
            headerOffset,
            // Calculate height based on header offset
            headerOffset === 'top-0'
              ? 'h-screen'
              : headerOffset === 'top-16'
                ? 'h-[calc(100vh-4rem)]'
                : headerOffset === 'top-20'
                  ? 'h-[calc(100vh-5rem)]'
                  : 'h-[calc(100vh-4rem)]', // default to top-16
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
            role="button"
            aria-label="Close sidebar"
          />
        )}

        {/* Main Content - Thread */}
        <main
          className={cn(
            'flex-1 w-full flex flex-col',
            headerOffset === 'top-0'
              ? 'h-screen'
              : headerOffset === 'top-16'
                ? 'h-[calc(100vh-4rem)]'
                : headerOffset === 'top-20'
                  ? 'h-[calc(100vh-5rem)]'
                  : 'h-[calc(100vh-4rem)]', // default to top-16
            'md:ml-0' // No margin on desktop, sidebar is sticky
          )}
        >
          {children}
        </main>
      </div>
    </ThreadLayoutProvider>
  )
})

export function ThreadLayout(props: ThreadLayoutProps) {
  const { colorScheme = 'neutral', customTheme, ...layoutProps } = props

  return (
    <ThreadThemeProvider colorScheme={colorScheme} customTheme={customTheme}>
      <ThreadLayoutInner {...layoutProps} />
    </ThreadThemeProvider>
  )
}
