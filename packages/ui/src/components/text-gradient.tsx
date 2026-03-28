import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/utils'

/**
 * TextGradient Component - Animated Color Gradients
 *
 * Apply beautiful gradients to text with optional animation.
 * Uses CSS custom properties for seamless theme integration.
 *
 * @example
 * // Basic gradient
 * <TextGradient from="primary" to="secondary">
 *   Beautiful Text
 * </TextGradient>
 *
 * @example
 * // Animated gradient with direction
 * <TextGradient
 *   from="primary"
 *   to="accent"
 *   direction="to-r"
 *   animate
 *   speed={3}
 * >
 *   Animated Gradient
 * </TextGradient>
 *
 * @example
 * // Chart colors for data visualization
 * <TextGradient from="chart-1" to="chart-3" direction="to-br">
 *   Chart Label
 * </TextGradient>
 */

export const gradientColors = [
  'primary',
  'secondary',
  'accent',
  'muted',
  'success',
  'warning',
  'info',
  'destructive',
  'ring',
  'ezstart',
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
] as const

export type GradientColor = (typeof gradientColors)[number]

const textGradientVariants = cva('', {
  variants: {
    direction: {
      'to-r': '',
      'to-l': '',
      'to-t': '',
      'to-b': '',
      'to-tr': '',
      'to-tl': '',
      'to-br': '',
      'to-bl': '',
    },
  },
  defaultVariants: {
    direction: 'to-r',
  },
})

export interface TextGradientProps extends VariantProps<typeof textGradientVariants> {
  /** Start color from design system */
  from?: GradientColor
  /** End color from design system */
  to?: GradientColor
  /** Middle via color for 3-color gradients */
  via?: GradientColor
  /** Animation speed in seconds (enables animation if > 0) */
  speed?: number
  /** Enable gradient animation (default: false) */
  animate?: boolean
  /** Additional CSS classes */
  className?: string
  /** Text content */
  children: React.ReactNode
}

export const TextGradient = ({
  from = 'primary',
  to = 'primary',
  via,
  children,
  className,
  speed = 0,
  animate = false,
  direction,
}: TextGradientProps) => {
  // Build gradient stops
  const gradientFrom = `var(--${from})`
  const gradientTo = `var(--${to})`
  // If no via is specified, use 'from' as via to create smooth 2-color gradient
  const gradientVia = via ? `var(--${via})` : gradientFrom

  // Animation enabled if speed > 0 or animate = true
  const shouldAnimate = animate || speed > 0
  const animationSpeed = speed > 0 ? speed : 3 // default 3s

  return (
    <span
      className={cn(
        'text-gradient',
        textGradientVariants({ direction }),
        shouldAnimate && 'animate-gradient',
        className
      )}
      style={
        {
          '--text-gradient-from': gradientFrom,
          '--text-gradient-via': gradientVia,
          '--text-gradient-to': gradientTo,
          ...(shouldAnimate && { '--gradient-speed': `${animationSpeed}s` }),
        } as React.CSSProperties
      }
    >
      {children}
    </span>
  )
}
