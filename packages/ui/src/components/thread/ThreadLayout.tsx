'use client'

import React, { ReactNode, useCallback, useRef, useState } from 'react'
import { cn } from '../../lib/utils'
import { Button } from '../button'
import { Icon } from '../icon'
import { Sheet, SheetContent, SheetTitle } from '../overlay/sheet'
import { ThreadLayoutProvider } from './ThreadLayoutContext'

/**
 * Container height strategy for ThreadLayout.
 * - 'viewport': full viewport height (h-dvh) — for full-page chat
 * - 'fill': fill parent container (h-full) — for modals, panels, embedded chat
 * - string: custom Tailwind class (e.g., 'h-[500px]', 'h-96') — for fixed height
 */
type ThreadHeight = 'viewport' | 'fill' | (string & {})

type ThreadLayoutProps = {
  /**
   * Container height. Required for correct layout.
   * - 'viewport': full page (h-dvh)
   * - 'fill': fill parent (h-full) — use in modals/panels
   * - custom: a Tailwind height class (e.g., 'h-[500px]')
   */
  height: ThreadHeight
  /** @slot Thread, ThreadComposer, ThreadMessages */
  children: ReactNode
  /** @slot ThreadSidebar content */
  sidebar?: ReactNode
  /** @slot Custom toggle button (replaces default burger) */
  sidebarToggle?: ReactNode
  showSidebar?: boolean
  sidebarWidth?: string
  headerOffset?: string
  mobileHeaderOffset?: string
  mobileFooterOffset?: string
  className?: string
  onSidebarToggle?: (isOpen: boolean) => void
  /** Show × close button inside the sidebar Sheet (Radix). Default: false (use burger/overlay to close) */
  showSidebarCloseButton?: boolean
}

function resolveHeight(height: ThreadHeight): { heightClass: string; positionClass: string } {
  if (height === 'viewport') return { heightClass: 'h-dvh', positionClass: 'fixed inset-0 z-50' }
  if (height === 'fill') return { heightClass: 'h-full', positionClass: 'relative w-full' }
  return { heightClass: height, positionClass: 'relative w-full' }
}

const ThreadLayoutInner = React.memo(function ThreadLayoutInner({
  height = 'viewport',
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
  showSidebarCloseButton = false,
}: ThreadLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const isFill = height !== 'viewport'

  const toggleSidebar = useCallback(() => {
    const newState = !isSidebarOpen
    setIsSidebarOpen(newState)
    onSidebarToggle?.(newState)
  }, [isSidebarOpen, onSidebarToggle])

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false)
    onSidebarToggle?.(false)
  }, [onSidebarToggle])

  const { heightClass, positionClass } = resolveHeight(height)

  // No sidebar — simple layout
  if (!showSidebar || !sidebar) {
    return (
      <div
        className={cn(
          'flex flex-col',
          positionClass,
          heightClass,
          'bg-background',
          mobileHeaderOffset && `lg:pt-0 ${mobileHeaderOffset}`,
          mobileFooterOffset && `lg:pb-0 ${mobileFooterOffset}`,
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
        ref={containerRef}
        className={cn(
          'relative flex overflow-hidden',
          positionClass,
          heightClass,
          'bg-background',
          mobileHeaderOffset && `lg:pt-0 ${mobileHeaderOffset}`,
          className
        )}
      >
        {/* Viewport: desktop sidebar as permanent aside, hidden on mobile */}
        {!isFill && (
          <aside
            className={cn(
              'hidden lg:flex lg:flex-col lg:shrink-0',
              sidebarWidth,
              heightClass,
              'bg-background border-r'
            )}
          >
            {sidebar}
          </aside>
        )}

        {/* Burger toggle — absolute so it floats over content without pushing it */}
        {!isSidebarOpen && (
          <Button
            onClick={toggleSidebar}
            size="icon"
            variant="default"
            aria-label="Open sidebar"
            className={cn('absolute left-3 top-3 z-20 shadow-lg', !isFill && 'lg:hidden')}
          >
            <Icon name="lucide:Menu" size={20} ariaHidden />
          </Button>
        )}

        {/* Sheet sidebar */}
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen} modal={!isFill}>
          <SheetContent
            side="left"
            showCloseButton={showSidebarCloseButton}
            container={isFill ? containerRef.current : undefined}
            className={cn(sidebarWidth, 'p-0 gap-0', heightClass)}
          >
            <SheetTitle className="sr-only">Conversations</SheetTitle>
            {sidebar}
          </SheetContent>
        </Sheet>

        {/* Main content */}
        <main className={cn('flex-1 min-w-0 flex flex-col', heightClass)}>{children}</main>
      </div>
    </ThreadLayoutProvider>
  )
})

export function ThreadLayout(props: ThreadLayoutProps) {
  return <ThreadLayoutInner {...props} />
}
