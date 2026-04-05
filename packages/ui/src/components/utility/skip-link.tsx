import { cn } from '../../lib/utils'

interface SkipLinkProps {
  href: string
  children: React.ReactNode
  className?: string
}

/**
 * SkipLink - Accessible skip-to-content link
 *
 * Invisible until focused (Tab key), allows keyboard users to skip navigation.
 * Essential for WCAG 2.1 Level AA compliance.
 *
 * @example
 * ```tsx
 * <SkipLink href="#main-content">Skip to main content</SkipLink>
 * ```
 */
export function SkipLink({ href, children, className }: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        // Hidden by default
        'sr-only',
        // Visible when focused (keyboard navigation)
        'focus:not-sr-only',
        'focus:absolute',
        'focus:top-4',
        'focus:left-4',
        'focus:z-50',
        'focus:px-4',
        'focus:py-2',
        'focus:bg-primary',
        'focus:text-primary-foreground',
        'focus:rounded-md',
        'focus:shadow-lg',
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-ring',
        'focus:ring-offset-2',
        'transition-all',
        className
      )}
    >
      {children}
    </a>
  )
}
