'use client'

/**
 * CTA Component - Call-to-Action Section
 *
 * Various CTA variants for landing pages.
 * Supports different layouts and styles.
 */

import * as React from 'react'
import { warnDeprecation } from '@ezstart/logger'
import { toast } from 'sonner'
import { ctaVariantConfig } from '../../lib/design-system/variants'
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
  /** Primary button text (use primaryCTASlot to override with a custom ReactNode) */
  primaryText?: string
  /** Primary button href */
  primaryHref?: string
  /** Custom primary CTA ReactNode (overrides primaryText) */
  primaryCTASlot?: React.ReactNode
  /** Secondary button text (use secondaryCTASlot to override with a custom ReactNode) */
  secondaryText?: string
  /** Secondary button href */
  secondaryHref?: string
  /** Custom secondary CTA ReactNode (overrides secondaryText) */
  secondaryCTASlot?: React.ReactNode
  /** @deprecated Use intent instead */
  bgColor?: 'default' | 'primary' | 'muted'
  /** Standard intent token — maps to bgColor (default→default, primary→primary) */
  intent?: 'default' | 'primary'
}

// ========== CTA Component ==========

const intentToBgColor = {
  default: 'default',
  primary: 'primary',
} as const

export const CTA = React.forwardRef<HTMLDivElement, CTAProps>(
  (
    {
      variant = 'default',
      title,
      description,
      primaryText,
      primaryHref = '#',
      primaryCTASlot,
      secondaryText,
      secondaryHref = '#',
      secondaryCTASlot,
      bgColor,
      intent,
      className,
      ...props
    },
    ref
  ) => {
    // Surface deprecation warning when consumer passes the legacy `bgColor` prop.
    React.useEffect(() => {
      if (bgColor !== undefined) {
        warnDeprecation('CTA.bgColor', 'intent prop', {
          toast: msg => toast.warning(msg),
        })
      }
    }, [bgColor])

    const resolvedBgColor: 'default' | 'primary' | 'muted' =
      bgColor ?? (intent ? intentToBgColor[intent] : 'default')
    const containerClasses = cn(
      'relative overflow-hidden rounded-2xl',
      ctaVariantConfig.container[variant],
      variant !== 'gradient' && ctaVariantConfig.bgColor[resolvedBgColor],
      className
    )

    const contentClasses = cn(
      'container mx-auto px-6 py-12 sm:py-16 lg:py-20',
      ctaVariantConfig.content[variant]
    )

    const titleClasses = cn(
      'font-bold tracking-tight mb-4',
      ctaVariantConfig.title[variant === 'minimal' ? 'minimal' : 'default']
    )

    const buttonClasses = cn(
      'flex flex-wrap gap-4',
      ctaVariantConfig.buttons[
        variant === 'centered' ? 'centered' : variant === 'split' ? 'split' : 'default'
      ]
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
                  variant === 'gradient' || resolvedBgColor === 'primary'
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
                {primaryCTASlot
                  ? primaryCTASlot
                  : primaryText && (
                      <Button
                        asChild
                        size="lg"
                        variant={
                          variant === 'gradient' || resolvedBgColor === 'primary'
                            ? 'secondary'
                            : 'default'
                        }
                        className="text-base px-8 py-6"
                      >
                        <a href={primaryHref}>{primaryText}</a>
                      </Button>
                    )}
                {secondaryCTASlot
                  ? secondaryCTASlot
                  : secondaryText && (
                      <Button
                        asChild
                        size="lg"
                        variant="outline"
                        className={cn(
                          'text-base px-8 py-6',
                          (variant === 'gradient' || resolvedBgColor === 'primary') &&
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
              {primaryCTASlot
                ? primaryCTASlot
                : primaryText && (
                    <Button
                      asChild
                      size="lg"
                      variant={resolvedBgColor === 'primary' ? 'secondary' : 'default'}
                      className="text-base px-8 py-6 w-full sm:w-auto"
                    >
                      <a href={primaryHref}>{primaryText}</a>
                    </Button>
                  )}
              {secondaryCTASlot
                ? secondaryCTASlot
                : secondaryText && (
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
