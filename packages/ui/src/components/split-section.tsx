import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '../lib'

// ============================================================================
// SplitSection Variants
// ============================================================================

const splitSectionVariants = cva('relative w-full', {
  variants: {
    /**
     * Layout direction
     */
    layout: {
      horizontal: 'grid grid-cols-1 lg:grid-cols-2 gap-0',
      vertical: 'flex flex-col',
    },
    /**
     * Alignment of items
     */
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
    },
    /**
     * Padding around the section
     */
    padding: {
      none: '',
      sm: 'py-8 px-4',
      md: 'py-12 px-6',
      lg: 'py-16 px-8',
      xl: 'py-24 px-12',
      '2xl': 'py-32 px-16',
    },
  },
  defaultVariants: {
    layout: 'horizontal',
    align: 'stretch',
    padding: 'lg',
  },
})

// ============================================================================
// SplitSection Props
// ============================================================================

export interface SplitSectionProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof splitSectionVariants> {
  /**
   * Enable diagonal separator between items (only works with 2+ children)
   * @default false
   */
  diagonal?: boolean

  /**
   * Diagonal cut angle in percentage (0-50)
   * @default 15
   * @example diagonalAngle={20} // More pronounced angle
   */
  diagonalAngle?: number

  /**
   * Diagonal direction
   * - 'left': Cut from top-left (default, like slide)
   * - 'right': Cut from top-right
   */
  diagonalDirection?: 'left' | 'right'

  /**
   * Invert the diagonal (cut from bottom instead of top)
   * @default false
   */
  inverted?: boolean

  /**
   * Apply diagonal only to specific item (1-based index)
   * If undefined, applies to all items after the first
   * @example diagonalOn={2} // Only second item has diagonal
   */
  diagonalOn?: number

  /**
   * Background color for the section
   */
  bgClass?: string

  /**
   * Children elements (minimum 2 for diagonal to work)
   */
  children: React.ReactNode

  /**
   * Use as semantic HTML section element
   * @default true
   */
  asSection?: boolean
}

// ============================================================================
// Helper: Generate clip-path
// ============================================================================

function getClipPath(
  angle: number,
  direction: 'left' | 'right',
  inverted: boolean = false
): string {
  if (inverted) {
    // Inverted: Cut from bottom
    if (direction === 'left') {
      // Cut from bottom-left: more content at top
      return `polygon(0% 0%, 100% 0%, 100% 100%, ${angle}% 100%)`
    } else {
      // Cut from bottom-right: more content at top
      return `polygon(0% 0%, 100% 0%, ${100 - angle}% 100%, 0% 100%)`
    }
  } else {
    // Normal: Cut from top
    if (direction === 'left') {
      // Cut from top-left: more content at bottom
      return `polygon(${angle}% 0%, 100% 0%, 100% 100%, 0% 100%)`
    } else {
      // Cut from top-right: more content at bottom
      return `polygon(0% 0%, ${100 - angle}% 0%, 100% 100%, 0% 100%)`
    }
  }
}

// ============================================================================
// SplitSection Component
// ============================================================================

const SplitSection = React.forwardRef<HTMLElement, SplitSectionProps>(
  (
    {
      className,
      layout,
      align,
      padding,
      diagonal = false,
      diagonalAngle = 15,
      diagonalDirection = 'left',
      inverted = false,
      diagonalOn,
      bgClass,
      children,
      asSection = true,
      style,
      ...props
    },
    ref
  ) => {
    const Component = asSection ? 'section' : 'div'

    // Convert children to array
    const childrenArray = React.Children.toArray(children)
    const hasMultipleChildren = childrenArray.length >= 2

    // Only apply diagonal if enabled AND has 2+ children
    const shouldApplyDiagonal = diagonal && hasMultipleChildren

    // Generate clip-path with inverted support
    const clipPathValue = shouldApplyDiagonal
      ? getClipPath(Math.abs(diagonalAngle), diagonalDirection, inverted)
      : undefined

    return (
      <Component
        ref={ref as any}
        className={cn(
          splitSectionVariants({ layout, align, padding }),
          bgClass,
          shouldApplyDiagonal && 'overflow-hidden',
          className
        )}
        style={style}
        {...props}
      >
        {childrenArray.map((child, index) => {
          const isFirstItem = index === 0
          const shouldClip =
            shouldApplyDiagonal &&
            (diagonalOn !== undefined ? index + 1 === diagonalOn : !isFirstItem)

          // If no diagonal needed, return child as-is
          if (!shouldClip) {
            return (
              <div
                key={index}
                className={cn(
                  isFirstItem &&
                    shouldApplyDiagonal &&
                    layout === 'horizontal' &&
                    'pr-0 lg:pr-16 z-10'
                )}
              >
                {child}
              </div>
            )
          }

          // Apply diagonal to this item
          return (
            <div key={index} className={cn('relative', layout === 'horizontal' && 'lg:-ml-16')}>
              <div
                className="relative h-full"
                style={{
                  clipPath: clipPathValue,
                }}
              >
                {child}
              </div>
            </div>
          )
        })}
      </Component>
    )
  }
)

SplitSection.displayName = 'SplitSection'

// ============================================================================
// SplitSectionItem - Optional wrapper for items (provides semantic context)
// ============================================================================

export interface SplitSectionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Content to display
   */
  children: React.ReactNode
}

const SplitSectionItem = React.forwardRef<HTMLDivElement, SplitSectionItemProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        {children}
      </div>
    )
  }
)

SplitSectionItem.displayName = 'SplitSectionItem'

// ============================================================================
// Exports
// ============================================================================

export { SplitSection, SplitSectionItem, splitSectionVariants }
