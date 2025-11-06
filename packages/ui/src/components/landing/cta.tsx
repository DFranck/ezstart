/**
 * CTA Component - Call-to-Action Section
 *
 * Various CTA variants for landing pages.
 * Supports different layouts and styles.
 */

import * as React from 'react'
import { cn } from '../../lib/utils'
import { Button } from '../button'

// ========== Types ==========

export interface CTAProps extends React.HTMLAttributes<HTMLDivElement> {
  /** CTA variant */
  variant?: 'default' | 'centered' | 'split' | 'minimal' | 'gradient' | 'bordered'
  /** Main title */
  title: string
  /** Description text */
  description?: string
  /** Primary button text */
  primaryText: string
  /** Primary button href */
  primaryHref?: string
  /** Secondary button text */
  secondaryText?: string
  /** Secondary button href */
  secondaryHref?: string
  /** Background color */
  bgColor?: 'default' | 'primary' | 'muted'
}

// ========== CTA Component ==========

export const CTA = React.forwardRef<HTMLDivElement, CTAProps>(
  (
    {
      variant = 'default',
      title,
      description,
      primaryText,
      primaryHref = '#',
      secondaryText,
      secondaryHref = '#',
      bgColor = 'default',
      className,
      ...props
    },
    ref
  ) => {
    const containerClasses = cn(
      'relative overflow-hidden rounded-2xl',
      variant === 'gradient' &&
        'bg-gradient-to-r from-primary via-purple-500 to-pink-500 text-primary-foreground',
      variant === 'bordered' && 'border-2 border-primary',
      bgColor === 'primary' && variant !== 'gradient' && 'bg-primary text-primary-foreground',
      bgColor === 'muted' && variant !== 'gradient' && 'bg-muted',
      bgColor === 'default' && variant !== 'gradient' && 'bg-card',
      className
    )

    const contentClasses = cn(
      'container mx-auto px-6 py-12 sm:py-16 lg:py-20',
      variant === 'centered' && 'text-center',
      variant === 'split' &&
        'grid grid-cols-1 lg:grid-cols-2 gap-8 items-center'
    )

    const titleClasses = cn(
      'font-bold tracking-tight mb-4',
      variant === 'minimal' ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl lg:text-5xl'
    )

    const buttonClasses = cn(
      'flex flex-wrap gap-4',
      variant === 'centered' && 'justify-center',
      variant === 'split' && 'lg:justify-start'
    )

    return (
      <div ref={ref} className={containerClasses} {...props}>
        {/* Background Pattern (gradient variant) */}
        {variant === 'gradient' && (
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.3),rgba(255,255,255,0))]" />
          </div>
        )}

        <div className={contentClasses}>
          {/* Text Content */}
          <div className={variant === 'split' ? 'lg:pr-8' : ''}>
            <h2 className={titleClasses}>{title}</h2>
            {description && (
              <p
                className={cn(
                  'text-lg sm:text-xl mb-8',
                  variant === 'gradient' || bgColor === 'primary'
                    ? 'text-primary-foreground/90'
                    : 'text-muted-foreground',
                  variant === 'centered' && 'max-w-2xl mx-auto'
                )}
              >
                {description}
              </p>
            )}

            {/* CTA Buttons */}
            {variant !== 'split' && (
              <div className={buttonClasses}>
                <Button
                  asChild
                  size="lg"
                  variant={
                    variant === 'gradient' || bgColor === 'primary'
                      ? 'secondary'
                      : 'default'
                  }
                  className="text-base px-8 py-6"
                >
                  <a href={primaryHref}>{primaryText}</a>
                </Button>
                {secondaryText && (
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className={cn(
                      'text-base px-8 py-6',
                      (variant === 'gradient' || bgColor === 'primary') &&
                        'border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10'
                    )}
                  >
                    <a href={secondaryHref}>{secondaryText}</a>
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Buttons for Split Layout */}
          {variant === 'split' && (
            <div className="flex flex-col gap-4">
              <Button
                asChild
                size="lg"
                variant={bgColor === 'primary' ? 'secondary' : 'default'}
                className="text-base px-8 py-6 w-full sm:w-auto"
              >
                <a href={primaryHref}>{primaryText}</a>
              </Button>
              {secondaryText && (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="text-base px-8 py-6 w-full sm:w-auto"
                >
                  <a href={secondaryHref}>{secondaryText}</a>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }
)

CTA.displayName = 'CTA'

export default CTA
