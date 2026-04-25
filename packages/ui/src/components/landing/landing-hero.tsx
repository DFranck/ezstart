'use client'

/**
 * Hero Component - Landing Page Hero Section
 *
 * 10 variants for different landing page styles:
 * - default: Simple centered text
 * - withImage: Hero with side image
 * - withVideo: Hero with background video
 * - withGradient: Hero with animated gradient background
 * - split: Split layout (text left, visual right)
 * - minimal: Minimal design with focus on CTA
 * - centered: Centered with large text
 * - withStats: Includes social proof stats
 * - withSearch: Includes search input
 * - full: Full viewport width + height hero
 */

import * as React from 'react'
import { cn } from '../../lib/utils'
import { landingHeroVariantConfig } from '../../lib/design-system/variants'
import { Button } from '../button'
import { Badge } from '../data-display/badge'
import { Section, Div, H1, P } from '../tag'

// ========== Base Types ==========

export interface HeroProps extends React.HTMLAttributes<HTMLElement> {
  /** Hero variant */
  variant?:
    | 'default'
    | 'withImage'
    | 'withVideo'
    | 'withGradient'
    | 'split'
    | 'minimal'
    | 'centered'
    | 'withStats'
    | 'withSearch'
    | 'full'
  /** Hero title */
  title: string
  /** Hero description */
  description: string
  /** Primary CTA text (string-based — use primaryCTASlot for custom ReactNode) */
  primaryCTA?: string
  /** Primary CTA link */
  primaryCTAHref?: string
  /** Custom primary CTA ReactNode (overrides primaryCTA when provided) */
  primaryCTASlot?: React.ReactNode
  /** Secondary CTA text (string-based — use secondaryCTASlot for custom ReactNode) */
  secondaryCTA?: string
  /** Secondary CTA link */
  secondaryCTAHref?: string
  /** Custom secondary CTA ReactNode (overrides secondaryCTA when provided) */
  secondaryCTASlot?: React.ReactNode
  /** Badge text (appears above title) */
  badge?: string
  /** Text alignment override (independent of variant). Defaults derived from variant. */
  align?: 'left' | 'center'
  /** Image URL (for withImage variant) */
  image?: string
  /** Video URL (for withVideo variant) */
  video?: string
  /** Stats array (for withStats variant) */
  stats?: { label: string; value: string }[]
  /** Background scroll behavior */
  bgMode?: 'scroll' | 'fixed'
  /** Custom content below description */
  children?: React.ReactNode
}

// ========== Hero Component ==========

export const Hero = React.forwardRef<HTMLElement, HeroProps>(
  (
    {
      variant = 'default',
      title,
      description,
      primaryCTA,
      primaryCTAHref = '#',
      primaryCTASlot,
      secondaryCTA,
      secondaryCTAHref = '#',
      secondaryCTASlot,
      badge,
      align,
      image,
      video,
      stats,
      bgMode = 'scroll',
      className,
      children,
      style,
      ...props
    },
    ref
  ) => {
    const [isVideoLoaded, setIsVideoLoaded] = React.useState(false)

    // Resolve alignment: explicit prop wins, else 'centered' variant defaults to center
    const isCentered = align === 'center' || (align === undefined && variant === 'centered')

    // Merge background-attachment into style when bgMode is fixed
    const mergedStyle =
      bgMode === 'fixed' ? { ...style, backgroundAttachment: 'fixed' as const } : style

    // Variant-specific container classes
    const containerClasses = cn(
      'relative w-full overflow-hidden',
      landingHeroVariantConfig.container[variant],
      className
    )

    // Content wrapper classes
    const contentWrapperClasses = cn(
      'container mx-auto px-4 sm:px-6 lg:px-8',
      landingHeroVariantConfig.contentWrapper[variant],
      isCentered && variant !== 'split' && 'text-center'
    )

    // Title classes
    const titleClasses = cn('font-bold tracking-tight', landingHeroVariantConfig.title[variant])

    // Description classes
    const descriptionClasses = cn(
      'text-muted-foreground',
      landingHeroVariantConfig.description[variant],
      isCentered && 'mx-auto'
    )

    const hasBackgroundImage = mergedStyle?.backgroundImage

    return (
      <Section ref={ref} className={containerClasses} {...props} style={mergedStyle}>
        {/* Dark overlay for background images */}
        {hasBackgroundImage && <Div className="absolute inset-0 bg-black/50 z-0" />}

        {/* Background Video */}
        {variant === 'withVideo' && video && (
          <Div className="absolute inset-0 -z-10">
            <video
              autoPlay
              loop
              muted
              playsInline
              onLoadedData={() => setIsVideoLoaded(true)}
              className={cn(
                'h-full w-full object-cover transition-opacity duration-1000',
                isVideoLoaded ? 'opacity-20' : 'opacity-0'
              )}
            >
              <source src={video} type="video/mp4" />
            </video>
            <Div className="absolute inset-0 bg-gradient-to-b from-background/80 to-background" />
          </Div>
        )}

        {/* Gradient Background */}
        {variant === 'withGradient' && (
          <Div className="absolute inset-0 -z-10">
            <Div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 animate-gradient" />
            <Div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
          </Div>
        )}

        <Div className={cn(contentWrapperClasses, 'relative z-10')}>
          {/* Text Content */}
          <Div className={variant === 'split' ? 'order-1' : ''}>
            {/* Badge */}
            {badge && (
              <Div className={cn('mb-6', isCentered && 'flex justify-center')}>
                <Badge variant="secondary" className="px-4 py-2 text-sm font-medium">
                  {badge}
                </Badge>
              </Div>
            )}

            {/* Title */}
            <H1 className={cn(titleClasses, 'mb-6')}>{title}</H1>

            {/* Description */}
            <P className={cn(descriptionClasses, 'mb-8')}>{description}</P>

            {/* CTAs */}
            <Div className={cn('flex flex-wrap gap-4', isCentered && 'justify-center')}>
              {primaryCTASlot
                ? primaryCTASlot
                : primaryCTA && (
                    <Button asChild size="lg" className="text-base px-8 py-6">
                      <a href={primaryCTAHref}>{primaryCTA}</a>
                    </Button>
                  )}
              {secondaryCTASlot
                ? secondaryCTASlot
                : secondaryCTA && (
                    <Button asChild size="lg" variant="outline" className="text-base px-8 py-6">
                      <a href={secondaryCTAHref}>{secondaryCTA}</a>
                    </Button>
                  )}
            </Div>

            {/* Stats (for withStats variant) */}
            {variant === 'withStats' && stats && stats.length > 0 && (
              <Div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                  <Div key={index} className="text-center sm:text-left">
                    <Div className="text-3xl sm:text-4xl font-bold text-primary">{stat.value}</Div>
                    <Div className="text-sm text-muted-foreground mt-1">{stat.label}</Div>
                  </Div>
                ))}
              </Div>
            )}

            {/* Custom Children */}
            {children && <Div className="mt-8">{children}</Div>}
          </Div>

          {/* Image/Visual Content (for split/withImage variants) */}
          {(variant === 'split' || variant === 'withImage') && image && (
            <Div className={cn('order-2', variant === 'withImage' && 'mt-12 lg:mt-0')}>
              <Div className="relative aspect-video lg:aspect-square rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src={image}
                  alt={title}
                  className="h-full w-full object-cover"
                  loading="eager"
                />
              </Div>
            </Div>
          )}
        </Div>
      </Section>
    )
  }
)

Hero.displayName = 'Hero'

// ========== Export ==========

export default Hero
