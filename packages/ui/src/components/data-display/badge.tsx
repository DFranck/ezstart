import { type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '../../lib/utils'
import { badgeVariants } from '../../lib/design-system/variants'

/**
 * Badge Component - Display status, count, or label
 *
 * 100% configurable with variants, sizes, shapes, dot indicator, and pulse animation.
 * Built for accessibility and visual clarity.
 *
 * @example
 * // Basic usage
 * <Badge>Default</Badge>
 *
 * @example
 * // With variant and size
 * <Badge variant="success" size="lg">Active</Badge>
 *
 * @example
 * // Circle badge for step numbers
 * <Badge circle circleSize="lg">1</Badge>
 *
 * @example
 * // Circle badge with custom variant
 * <Badge circle circleSize="xl" variant="secondary">2</Badge>
 *
 * @example
 * // With dot indicator
 * <Badge variant="destructive" dot>3 errors</Badge>
 *
 * @example
 * // With pulse animation (for real-time status)
 * <Badge variant="success" pulse>Live</Badge>
 */

const dotVariantClasses: Record<string, string> = {
  default: 'bg-primary',
  secondary: 'bg-secondary-foreground',
  destructive: 'bg-destructive',
  outline: 'bg-foreground',
  success: 'bg-success',
  warning: 'bg-warning',
  info: 'bg-info',
  purple: 'bg-purple-600 dark:bg-purple-400',
  cyan: 'bg-cyan-600 dark:bg-cyan-400',
  indigo: 'bg-indigo-600 dark:bg-indigo-400',
  pink: 'bg-pink-600 dark:bg-pink-400',
}

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  /** Show a dot indicator before the text */
  dot?: boolean
  /** Pulse animation for real-time status */
  pulse?: boolean
}

function Badge({
  className,
  variant,
  size,
  circle,
  circleSize,
  dot,
  pulse,
  children,
  ...props
}: BadgeProps) {
  const dotColor = variant ? dotVariantClasses[variant] : dotVariantClasses.default

  // When circle=true, use circleSize instead of size
  const effectiveSize = circle ? undefined : size
  const effectiveCircleSize = circle ? circleSize : undefined

  return (
    <div
      className={cn(
        badgeVariants({ variant, size: effectiveSize, circle, circleSize: effectiveCircleSize }),
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'inline-block size-2 rounded-full mr-1.5',
            dotColor,
            pulse && 'animate-pulse'
          )}
          aria-hidden="true"
        />
      )}
      {children}
    </div>
  )
}

export { Badge, badgeVariants }

/**
 * Legacy export for backward compatibility
 * @deprecated Use named export Badge instead
 */
export default Badge
