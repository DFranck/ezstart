import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '../lib/utils'

/**
 * Skeleton Component - Loading State Placeholders
 *
 * Versatile skeleton loader for different content types.
 * Provides smooth pulse animation while content is loading.
 *
 * @example
 * // Basic skeleton
 * <Skeleton className="h-12 w-12" />
 *
 * @example
 * // Skeleton card
 * <SkeletonCard />
 *
 * @example
 * // Skeleton text
 * <SkeletonText lines={3} />
 *
 * @example
 * // Skeleton table
 * <SkeletonTable rows={5} cols={4} />
 */

const skeletonVariants = cva('animate-pulse rounded-md bg-muted', {
  variants: {
    variant: {
      default: 'bg-muted',
      lighter: 'bg-muted/50',
      darker: 'bg-muted/70',
      shimmer:
        'bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] animate-shimmer',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

interface SkeletonProps
  extends React.ComponentProps<'div'>,
    VariantProps<typeof skeletonVariants> {}

/**
 * Base Skeleton component
 * Use for custom skeleton shapes
 */
function Skeleton({ className, variant, ...props }: SkeletonProps) {
  return <div className={cn(skeletonVariants({ variant }), className)} {...props} />
}

/**
 * SkeletonText - Text loading placeholder
 * Simulates multiple lines of text
 */
interface SkeletonTextProps {
  /** Number of lines to display */
  lines?: number
  /** Custom className */
  className?: string
  /** Variant style */
  variant?: 'default' | 'lighter' | 'darker' | 'shimmer'
  /** Line spacing */
  spacing?: 'tight' | 'normal' | 'loose'
}

function SkeletonText({
  lines = 3,
  className,
  variant = 'default',
  spacing = 'normal',
}: SkeletonTextProps) {
  const spacingClasses = {
    tight: 'gap-1.5',
    normal: 'gap-2',
    loose: 'gap-3',
  }

  return (
    <div className={cn('flex flex-col', spacingClasses[spacing], className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant={variant}
          className={cn('h-4', i === lines - 1 && 'w-[80%]')}
        />
      ))}
    </div>
  )
}

/**
 * SkeletonAvatar - Avatar loading placeholder
 * Circular skeleton for profile pictures
 */
interface SkeletonAvatarProps {
  /** Size of the avatar */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Custom className */
  className?: string
  /** Variant style */
  variant?: 'default' | 'lighter' | 'darker' | 'shimmer'
}

function SkeletonAvatar({ size = 'md', className, variant = 'default' }: SkeletonAvatarProps) {
  const sizeClasses = {
    xs: 'h-6 w-6',
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  }

  return <Skeleton variant={variant} className={cn('rounded-full', sizeClasses[size], className)} />
}

/**
 * SkeletonCard - Card loading placeholder
 * Simulates a card with header, content, and footer
 */
interface SkeletonCardProps {
  /** Show card header */
  showHeader?: boolean
  /** Show card footer */
  showFooter?: boolean
  /** Number of content lines */
  lines?: number
  /** Custom className */
  className?: string
  /** Variant style */
  variant?: 'default' | 'lighter' | 'darker' | 'shimmer'
  /** Size of the card */
  size?: 'sm' | 'default' | 'lg'
}

function SkeletonCard({
  showHeader = true,
  showFooter = false,
  lines = 3,
  className,
  variant = 'default',
  size = 'default',
}: SkeletonCardProps) {
  const sizeClasses = {
    sm: 'p-4 gap-3',
    default: 'p-6 gap-4',
    lg: 'p-8 gap-6',
  }

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border border-border bg-card',
        sizeClasses[size],
        className
      )}
    >
      {showHeader && (
        <div className="flex flex-col gap-2">
          <Skeleton variant={variant} className="h-6 w-2/3" />
          <Skeleton variant={variant} className="h-4 w-1/2" />
        </div>
      )}
      <SkeletonText lines={lines} variant={variant} />
      {showFooter && (
        <div className="flex gap-2">
          <Skeleton variant={variant} className="h-9 w-20" />
          <Skeleton variant={variant} className="h-9 w-20" />
        </div>
      )}
    </div>
  )
}

/**
 * SkeletonTable - Table loading placeholder
 * Simulates a table with rows and columns
 */
interface SkeletonTableProps {
  /** Number of rows */
  rows?: number
  /** Number of columns */
  cols?: number
  /** Show table header */
  showHeader?: boolean
  /** Custom className */
  className?: string
  /** Variant style */
  variant?: 'default' | 'lighter' | 'darker' | 'shimmer'
}

function SkeletonTable({
  rows = 5,
  cols = 4,
  showHeader = true,
  className,
  variant = 'default',
}: SkeletonTableProps) {
  return (
    <div className={cn('w-full overflow-hidden rounded-lg border border-border', className)}>
      <div className="w-full">
        {showHeader && (
          <div className="grid gap-4 border-b border-border bg-muted/50 p-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {Array.from({ length: cols }).map((_, i) => (
              <Skeleton key={i} variant={variant} className="h-4" />
            ))}
          </div>
        )}
        <div className="divide-y divide-border">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div
              key={rowIndex}
              className="grid gap-4 p-4"
              style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
            >
              {Array.from({ length: cols }).map((_, colIndex) => (
                <Skeleton key={colIndex} variant={variant} className="h-4" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * SkeletonList - List loading placeholder
 * Simulates a list of items
 */
interface SkeletonListProps {
  /** Number of items */
  items?: number
  /** Show avatar in each item */
  showAvatar?: boolean
  /** Custom className */
  className?: string
  /** Variant style */
  variant?: 'default' | 'lighter' | 'darker' | 'shimmer'
}

function SkeletonList({
  items = 5,
  showAvatar = true,
  className,
  variant = 'default',
}: SkeletonListProps) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
          {showAvatar && <SkeletonAvatar size="md" variant={variant} />}
          <div className="flex-1 space-y-2">
            <Skeleton variant={variant} className="h-4 w-1/3" />
            <Skeleton variant={variant} className="h-3 w-full" />
            <Skeleton variant={variant} className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * SkeletonForm - Form loading placeholder
 * Simulates a form with input fields
 */
interface SkeletonFormProps {
  /** Number of fields */
  fields?: number
  /** Show submit button */
  showButton?: boolean
  /** Custom className */
  className?: string
  /** Variant style */
  variant?: 'default' | 'lighter' | 'darker' | 'shimmer'
}

function SkeletonForm({
  fields = 4,
  showButton = true,
  className,
  variant = 'default',
}: SkeletonFormProps) {
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton variant={variant} className="h-4 w-24" />
          <Skeleton variant={variant} className="h-10 w-full" />
        </div>
      ))}
      {showButton && <Skeleton variant={variant} className="h-10 w-32" />}
    </div>
  )
}

export {
  Skeleton,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonForm,
  SkeletonList,
  SkeletonTable,
  SkeletonText,
}
