/**
 * AnimatedCounter Component
 *
 * Animated number counter with smooth easing and customizable formatting.
 * Perfect for displaying statistics, metrics, and dynamic numbers.
 *
 * @example
 * // Simple counter
 * <AnimatedCounter value={1000} />
 *
 * @example
 * // Stats variant with formatting
 * <AnimatedCounter
 *   value={50000}
 *   variant="stats"
 *   prefix="$"
 *   separator=","
 * />
 *
 * @example
 * // Dashboard metric
 * <AnimatedCounter
 *   value={95.5}
 *   variant="metric"
 *   suffix="%"
 *   decimals={1}
 * />
 */

'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/utils'
import { fontSize } from '../lib/design-system/tokens'

// ========== Easing Functions ==========

const easingFunctions = {
  linear: (t: number) => t,
  easeOutQuart: (t: number) => 1 - Math.pow(1 - t, 4),
  easeInOutQuart: (t: number) =>
    t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,
}

// ========== Variants ==========

const animatedCounterVariants = cva(
  'tabular-nums inline-block transition-colors', // Base: monospace numbers + smooth color transitions
  {
    variants: {
      variant: {
        default: 'text-foreground',
        stats: 'text-primary font-bold', // Landing page stats
        metric: 'text-primary font-semibold', // Dashboard metrics
        subtle: 'text-muted-foreground font-normal', // Secondary info
        success: 'text-green-600 dark:text-green-400 font-semibold',
        warning: 'text-yellow-600 dark:text-yellow-400 font-semibold',
        destructive: 'text-red-600 dark:text-red-400 font-semibold',
      },
      size: {
        xs: fontSize.xs, // text-xs
        sm: fontSize.sm, // text-sm
        default: fontSize.base, // text-base sm:text-sm
        lg: fontSize.lg, // text-lg sm:text-base
        xl: fontSize.xl, // text-xl sm:text-lg
        '2xl': fontSize['2xl'], // text-2xl sm:text-xl
        '3xl': 'text-3xl sm:text-2xl',
        '4xl': 'text-4xl sm:text-3xl',
        '5xl': 'text-5xl sm:text-4xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

// ========== Types ==========

export interface AnimatedCounterProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof animatedCounterVariants> {
  /** Target value to count to */
  value: number
  /** Starting value (default: 0) */
  startValue?: number
  /** Animation duration in milliseconds (default: 2000) */
  duration?: number
  /** Enable animation (default: true) */
  animate?: boolean
  /** Number of decimal places (default: 0) */
  decimals?: number
  /** Thousand separator (default: none) */
  separator?: ',' | '.' | ' ' | ''
  /** Prefix to display before number (e.g., "$", "€") */
  prefix?: string
  /** Suffix to display after number (e.g., "+", "K", "M", "%") */
  suffix?: string
  /** Easing function (default: 'easeOutQuart') */
  easing?: 'linear' | 'easeOutQuart' | 'easeInOutQuart'
  /** Trigger animation when element is visible (default: true) */
  observeIntersection?: boolean
}

// ========== AnimatedCounter Component ==========

export const AnimatedCounter = React.forwardRef<HTMLSpanElement, AnimatedCounterProps>(
  (
    {
      value,
      startValue = 0,
      duration = 2000,
      animate = true,
      decimals = 0,
      separator = '',
      prefix = '',
      suffix = '',
      easing = 'easeOutQuart',
      observeIntersection = true,
      variant,
      size,
      className,
      ...props
    },
    ref
  ) => {
    const [count, setCount] = React.useState(startValue)
    const [isVisible, setIsVisible] = React.useState(!observeIntersection)
    const elementRef = React.useRef<HTMLSpanElement>(null)

    // Combine refs
    React.useImperativeHandle(ref, () => elementRef.current!)

    // Format number with separator
    const formatNumber = (num: number): string => {
      const fixed = num.toFixed(decimals)

      if (!separator) return fixed

      const parts = fixed.split('.')
      const integer = parts[0] || '0'
      const decimal = parts[1]
      const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, separator)

      return decimal ? `${formattedInteger}.${decimal}` : formattedInteger
    }

    // Animate counter
    React.useEffect(() => {
      if (!animate || !isVisible) {
        setCount(value)
        return
      }

      const startTime = Date.now()
      const startCount = count
      const diff = value - startCount
      const easeFn = easingFunctions[easing]

      const timer = setInterval(() => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)

        if (progress >= 1) {
          setCount(value)
          clearInterval(timer)
        } else {
          const easedProgress = easeFn(progress)
          setCount(startCount + diff * easedProgress)
        }
      }, 16) // ~60fps

      return () => clearInterval(timer)
    }, [isVisible, animate, value, duration, easing])

    // Intersection Observer
    React.useEffect(() => {
      if (!observeIntersection || !animate) return

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            setIsVisible(true)
          }
        },
        { threshold: 0.1 }
      )

      if (elementRef.current) {
        observer.observe(elementRef.current)
      }

      return () => observer.disconnect()
    }, [observeIntersection, animate])

    return (
      <span
        ref={elementRef}
        className={cn(animatedCounterVariants({ variant, size }), className)}
        {...props}
      >
        {prefix}
        {formatNumber(count)}
        {suffix}
      </span>
    )
  }
)

AnimatedCounter.displayName = 'AnimatedCounter'

export default AnimatedCounter
