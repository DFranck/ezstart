/**
 * Stats Component - Social Proof Statistics
 *
 * Displays statistics from SEO config with optional animations.
 * Supports various layouts and counter animations.
 */

'use client'

import * as React from 'react'
import { cn } from '../../lib/utils'
import { statsVariantConfig } from '../../lib/design-system/variants'

// ========== Types ==========

export interface Stat {
  label: string
  value: string
}

export interface StatsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Stats array from SEO config */
  stats: Stat[]
  /** Layout variant */
  variant?: 'default' | 'centered' | 'grid' | 'inline' | 'cards'
  /** Animate numbers */
  animated?: boolean
  /** Section title */
  title?: string
  /** Section description */
  description?: string
}

// ========== Stats Component ==========

export const Stats = React.forwardRef<HTMLDivElement, StatsProps>(
  (
    {
      stats,
      variant = 'default',
      animated = false,
      title,
      description,
      className,
      ...props
    },
    ref
  ) => {
    const containerClasses = cn(
      'w-full',
      statsVariantConfig.container[variant || 'default'],
      className
    )

    const statsWrapperClasses = statsVariantConfig.statsWrapper[variant || 'default']

    return (
      <div ref={ref} className={containerClasses} {...props}>
        {/* Section Header */}
        {(title || description) && (
          <div className="text-center max-w-3xl mx-auto mb-12">
            {title && <h2 className="text-3xl sm:text-4xl font-bold mb-4">{title}</h2>}
            {description && (
              <p className="text-lg text-muted-foreground">{description}</p>
            )}
          </div>
        )}

        {/* Stats */}
        <div className={statsWrapperClasses}>
          {stats.map((stat, index) => (
            <StatItem
              key={index}
              stat={stat}
              animated={animated}
              variant={variant}
            />
          ))}
        </div>
      </div>
    )
  }
)

Stats.displayName = 'Stats'

// ========== StatItem Component ==========

const StatItem = ({
  stat,
  animated,
  variant,
}: {
  stat: Stat
  animated: boolean
  variant: StatsProps['variant']
}) => {
  const [isVisible, setIsVisible] = React.useState(false)
  const [count, setCount] = React.useState(0)
  const ref = React.useRef<HTMLDivElement>(null)

  // Extract number from value (e.g., "100+" -> 100, "$10K" -> 10)
  const extractNumber = (value: string): number => {
    const match = value.match(/[\d,]+/)
    if (match) {
      return parseInt(match[0].replace(/,/g, ''))
    }
    return 0
  }

  // Animate counter
  React.useEffect(() => {
    if (!animated || !isVisible) return

    const targetValue = extractNumber(stat.value)
    if (targetValue === 0) return

    const duration = 2000 // 2 seconds
    const steps = 60
    const increment = targetValue / steps
    let current = 0

    const timer = setInterval(() => {
      current += increment
      if (current >= targetValue) {
        setCount(targetValue)
        clearInterval(timer)
      } else {
        setCount(Math.floor(current))
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [isVisible, animated, stat.value])

  // Intersection Observer for animation trigger
  React.useEffect(() => {
    if (!animated) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [animated])

  // Format number with original suffix
  const getDisplayValue = () => {
    if (!animated || !isVisible) return stat.value

    const targetValue = extractNumber(stat.value)
    if (targetValue === 0) return stat.value

    // Keep original suffix (K, M, +, %, etc.)
    const suffix = stat.value.replace(/[\d,]+/, '')
    return `${count.toLocaleString()}${suffix}`
  }

  const itemClasses = statsVariantConfig.item[variant || 'default']

  return (
    <div ref={ref} className={itemClasses}>
      <div
        className={cn(
          'text-3xl sm:text-4xl lg:text-5xl font-bold text-primary mb-2',
          animated && 'transition-all duration-300'
        )}
      >
        {getDisplayValue()}
      </div>
      <div className="text-sm sm:text-base text-muted-foreground">{stat.label}</div>
    </div>
  )
}

export default Stats
