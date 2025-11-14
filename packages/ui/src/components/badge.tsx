import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { fontSize, paddingX, paddingY } from '../lib/design-system/tokens'
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
        default: 'border-transparent bg-primary text-primary-foreground',
        primary: 'border-transparent bg-primary text-primary-foreground', // Alias for default
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'text-foreground',
        success: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300',
        warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300',
        info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
        purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300',
        cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300',
        indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300',
        pink: 'bg-pink-100 text-pink-700 dark:bg-pink-900/20 dark:text-pink-300',
      },
      size: {
        none: '', // No size classes - used for circle variant
        default: [paddingX.sm, paddingY.xs, fontSize.sm].join(' '), // px-3 sm:px-2, py-1 sm:py-0.5, text-sm sm:text-xs
        sm: [paddingX.xs, paddingY.xs, fontSize.xs].join(' '), // px-2 sm:px-1, py-1 sm:py-0.5, text-xs sm:text-[10px]
        lg: [paddingX.default, paddingY.sm, fontSize.base].join(' '), // px-4 sm:px-3, py-2 sm:py-1, text-base sm:text-sm
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
  success: 'bg-green-600 dark:bg-green-400',
  warning: 'bg-yellow-600 dark:bg-yellow-400',
  info: 'bg-blue-600 dark:bg-blue-400',
  purple: 'bg-purple-600 dark:bg-purple-400',
  cyan: 'bg-cyan-600 dark:bg-cyan-400',
  indigo: 'bg-indigo-600 dark:bg-indigo-400',
  pink: 'bg-pink-600 dark:bg-pink-400',
}

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
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
