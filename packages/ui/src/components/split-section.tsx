import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '../lib'
import { size } from '../lib/design-system/tokens'
import { splitSectionVariantConfig } from '../lib/design-system/variants'
import { Div, Section } from './tag'

// ============================================================================
// SplitSection Variants
// ============================================================================

const splitSectionVariants = cva('relative w-full', {
  variants: splitSectionVariantConfig,
  defaultVariants: {
    layout: 'horizontal',
    align: 'stretch',
    padding: 'none',
  },
})

// ============================================================================
// SplitSection Props
// ============================================================================

export interface SplitSectionProps
  extends React.HTMLAttributes<HTMLElement>, VariantProps<typeof splitSectionVariants> {
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
   * Size of the section
   */
  size?: keyof typeof size | 'default'

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
      size,
      ...props
    },
    ref
  ) => {
    const Component = asSection ? Section : Div

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
        ref={ref as unknown as React.Ref<HTMLDivElement>}
        size={size}
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
                  'h-full',
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
            <div
              key={index}
              className={cn('relative h-full', layout === 'horizontal' && 'lg:-ml-16')}
            >
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
   * Size variant for padding and gap
   * Accepts EzTag size variants: xs, sm, md, lg, xl, full
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'default'
  children: React.ReactNode
}

const SplitSectionItem = React.forwardRef<HTMLDivElement, SplitSectionItemProps>(
  ({ className, size, children, ...props }, ref) => {
    return (
      <Div ref={ref} size={size} className={cn(className)} {...props}>
        {children}
      </Div>
    )
  }
)

SplitSectionItem.displayName = 'SplitSectionItem'

// ============================================================================
// Exports
// ============================================================================

export { SplitSection, SplitSectionItem, splitSectionVariants }
