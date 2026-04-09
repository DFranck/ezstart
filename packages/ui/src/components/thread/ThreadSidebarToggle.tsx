'use client'

import { logger } from '@ezstart/logger'
import { cn } from '../../lib/utils'
import { useDesignTokens } from '../../lib/design-system/DesignTokenContext'
import { Button } from '../button'
import { Icon } from '../icon'
import { useThreadLayout } from './ThreadLayoutContext'

type ThreadSidebarToggleProps = {
  className?: string
  size?: 'sm' | 'default' | 'lg' | 'icon'
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary'
  iconSize?: number
}

/**
 * Reusable sidebar toggle button for Thread components.
 * Uses ThreadLayoutContext to control sidebar state.
 *
 * @example
 * // In app header
 * <ThreadSidebarToggle className="mr-4" />
 *
 * // Floating button (default ThreadLayout position)
 * <ThreadSidebarToggle
 *   className="fixed left-4 top-4 z-50 md:hidden"
 *   variant="outline"
 * />
 */
export function ThreadSidebarToggle({
  className,
  size: sizeProp,
  variant = 'outline',
  iconSize = 20,
}: ThreadSidebarToggleProps) {
  const inherited = useDesignTokens()
  const size = (sizeProp ?? inherited.size ?? 'icon') as NonNullable<
    ThreadSidebarToggleProps['size']
  >
  const layoutContext = useThreadLayout()

  if (!layoutContext) {
    logger.warn('ThreadSidebarToggle must be used within ThreadLayout')
    return null
  }

  const { toggleSidebar, isSidebarOpen } = layoutContext

  return (
    <Button
      onClick={toggleSidebar}
      size={size}
      variant={variant}
      className={cn(className)}
      aria-label={isSidebarOpen ? 'Close conversations' : 'Open conversations'}
    >
      <Icon
        name="lucide:Menu"
        size={iconSize}
        className={cn(
          'transition-transform duration-300 ease-in-out',
          isSidebarOpen && 'rotate-90 opacity-0 scale-0'
        )}
      />
      <Icon
        name="lucide:X"
        size={iconSize}
        className={cn(
          'absolute transition-transform duration-300 ease-in-out',
          isSidebarOpen ? 'rotate-0 opacity-100 scale-100' : '-rotate-90 opacity-0 scale-0'
        )}
      />
    </Button>
  )
}
