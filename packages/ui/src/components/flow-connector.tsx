import * as React from 'react'
import { cn } from '../lib/utils'

/**
 * FlowConnector Component - SVG path connecting two points
 *
 * Draws a smooth curve or angular path from one point to another, useful for process flows.
 *
 * @example
 * // Basic usage - smooth curve from bottom to left
 * <FlowConnector
 *   fromSide="bottom"
 *   toSide="left"
 *   className="text-primary"
 * />
 *
 * @example
 * // Angular path with rounded corners
 * <FlowConnector
 *   fromSide="right"
 *   toSide="top"
 *   style="angular"
 *   rounded
 *   className="text-emerald-500"
 * />
 */

export interface FlowConnectorProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Starting side of the connection
   * @default "right"
   */
  fromSide?: 'top' | 'right' | 'bottom' | 'left'

  /**
   * Ending side of the connection
   * @default "left"
   */
  toSide?: 'top' | 'right' | 'bottom' | 'left'

  /**
   * Path style
   * - "smooth": Smooth Bezier curve (default)
   * - "angular": Angular path with optional rounded corners
   * @default "smooth"
   */
  pathStyle?: 'smooth' | 'angular'

  /**
   * Add rounded corners to angular paths
   * Only works when pathStyle="angular"
   * @default false
   */
  rounded?: boolean

  /**
   * Corner radius for rounded angular paths (in SVG units)
   * @default 10
   */
  cornerRadius?: number

  /**
   * Stroke width of the path
   * @default 2
   */
  strokeWidth?: number

  /**
   * Show arrow at the end
   * @default true
   */
  arrow?: boolean

  /**
   * Curve intensity for smooth style (0-1, where 0 is straight line, 1 is very curved)
   * Only works when pathStyle="smooth"
   * @default 0.5
   */
  curvature?: number
}

/**
 * Calculate control points for cubic Bezier curve (smooth style)
 */
function getSmoothPath(
  fromSide: FlowConnectorProps['fromSide'],
  toSide: FlowConnectorProps['toSide'],
  curvature: number
) {
  // SVG viewBox coordinates (100x100)
  const points = {
    top: { x: 50, y: 0 },
    right: { x: 100, y: 50 },
    bottom: { x: 50, y: 100 },
    left: { x: 0, y: 50 },
  }

  const from = points[fromSide || 'right']
  const to = points[toSide || 'left']

  // Calculate control points based on sides
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  const offset = distance * curvature

  let cp1x = from.x
  let cp1y = from.y
  let cp2x = to.x
  let cp2y = to.y

  // Adjust control points based on direction
  if (fromSide === 'right') cp1x += offset
  if (fromSide === 'left') cp1x -= offset
  if (fromSide === 'bottom') cp1y += offset
  if (fromSide === 'top') cp1y -= offset

  if (toSide === 'right') cp2x += offset
  if (toSide === 'left') cp2x -= offset
  if (toSide === 'bottom') cp2y += offset
  if (toSide === 'top') cp2y -= offset

  return `M ${from.x} ${from.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${to.x} ${to.y}`
}

/**
 * Calculate angular path with optional rounded corners
 */
function getAngularPath(
  fromSide: FlowConnectorProps['fromSide'],
  toSide: FlowConnectorProps['toSide'],
  rounded: boolean,
  cornerRadius: number
) {
  // SVG viewBox coordinates (100x100)
  const points = {
    top: { x: 50, y: 0 },
    right: { x: 100, y: 50 },
    bottom: { x: 50, y: 100 },
    left: { x: 0, y: 50 },
  }

  const from = points[fromSide || 'right']
  const to = points[toSide || 'left']

  // Calculate midpoint for the corner
  const midX = from.x + (to.x - from.x) / 2
  const midY = from.y + (to.y - from.y) / 2

  // Determine corner point based on sides
  let cornerX = midX
  let cornerY = midY

  // Vertical then horizontal
  if (
    (fromSide === 'bottom' && toSide === 'left') ||
    (fromSide === 'top' && toSide === 'right')
  ) {
    cornerX = to.x
    cornerY = from.y
  }
  // Horizontal then vertical
  else if (
    (fromSide === 'right' && toSide === 'bottom') ||
    (fromSide === 'left' && toSide === 'top')
  ) {
    cornerX = from.x
    cornerY = to.y
  }
  // Bottom to right or top to left
  else if (
    (fromSide === 'bottom' && toSide === 'right') ||
    (fromSide === 'top' && toSide === 'left')
  ) {
    cornerX = to.x
    cornerY = from.y
  }
  // Right to top or left to bottom
  else if (
    (fromSide === 'right' && toSide === 'top') ||
    (fromSide === 'left' && toSide === 'bottom')
  ) {
    cornerX = from.x
    cornerY = to.y
  }

  if (!rounded) {
    // Sharp corner
    return `M ${from.x} ${from.y} L ${cornerX} ${cornerY} L ${to.x} ${to.y}`
  }

  // Rounded corner using quadratic Bezier curve
  const r = Math.min(cornerRadius, Math.abs(cornerX - from.x) / 2, Math.abs(cornerY - from.y) / 2)

  // Calculate points before and after corner
  const beforeCornerX = cornerX === from.x ? cornerX : cornerX > from.x ? cornerX - r : cornerX + r
  const beforeCornerY = cornerY === from.y ? cornerY : cornerY > from.y ? cornerY - r : cornerY + r

  const afterCornerX = cornerX === to.x ? cornerX : cornerX > to.x ? cornerX - r : cornerX + r
  const afterCornerY = cornerY === to.y ? cornerY : cornerY > to.y ? cornerY - r : cornerY + r

  return `M ${from.x} ${from.y} L ${beforeCornerX} ${beforeCornerY} Q ${cornerX} ${cornerY} ${afterCornerX} ${afterCornerY} L ${to.x} ${to.y}`
}

export const FlowConnector = React.forwardRef<HTMLDivElement, FlowConnectorProps>(
  (
    {
      className,
      fromSide = 'right',
      toSide = 'left',
      pathStyle = 'smooth',
      rounded = false,
      cornerRadius = 10,
      strokeWidth = 2,
      arrow = true,
      curvature = 0.5,
      ...props
    },
    ref
  ) => {
    // Generate path based on style
    const pathData =
      pathStyle === 'smooth'
        ? getSmoothPath(fromSide, toSide, curvature)
        : getAngularPath(fromSide, toSide, rounded, cornerRadius)

    return (
      <div
        ref={ref}
        className={cn('absolute inset-0 pointer-events-none', className)}
        {...props}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Define arrow marker */}
          {arrow && (
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path d="M0,0 L0,6 L9,3 z" fill="currentColor" />
              </marker>
            </defs>
          )}

          {/* Main path */}
          <path
            d={pathData}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            markerEnd={arrow ? 'url(#arrowhead)' : undefined}
          />
        </svg>
      </div>
    )
  }
)

FlowConnector.displayName = 'FlowConnector'
