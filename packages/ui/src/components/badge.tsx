import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { fontSize, paddingX, paddingY } from '../lib/design-system/tokens'
import { badgeVariantConfig } from '../lib/design-system/variants'
import { cn } from '../lib/utils'

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

const badgeVariants = cva(
  'inline-flex items-center font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-full',
  {
    variants: {
      variant: {
        ...badgeVariantConfig.variant,
        primary: 'border-transparent bg-primary text-primary-foreground', // Alias for default
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        success: 'border-transparent bg-success/20 text-success dark:bg-success/10',
        warning: 'border-transparent bg-warning/20 text-warning dark:bg-warning/10',
        info: 'border-transparent bg-info/20 text-info dark:bg-info/10',
        purple: 'border-transparent bg-purple-500/15 text-purple-700 dark:text-purple-300',
        cyan: 'border-transparent bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
        indigo: 'border-transparent bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
        pink: 'border-transparent bg-pink-500/15 text-pink-700 dark:text-pink-300',
      },
      size: {
        none: '', // No size classes - used for circle variant
        default: [paddingX.sm, paddingY.xs, fontSize.sm].join(' '),
        sm: [paddingX.xs, paddingY.xs, fontSize.xs].join(' '),
        lg: [paddingX.default, paddingY.sm, fontSize.base].join(' '),
      },
      circle: {
        true: 'aspect-square justify-center p-0',
      },
      circleSize: {
        sm: 'w-8 h-8 text-sm',
        md: 'w-10 h-10 text-base',
        lg: 'w-12 h-12 text-xl',
        xl: 'w-16 h-16 text-2xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

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
