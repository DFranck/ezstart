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
 * - fullHeight: Full viewport height hero
 */

import * as React from 'react'
import { cn } from '../../lib/utils'
import { Button } from '../button'
import { Badge } from '../badge'

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
    | 'fullHeight'
  /** Hero title */
  title: string
  /** Hero description */
  description: string
  /** Primary CTA text */
  primaryCTA?: string
  /** Primary CTA link */
  primaryCTAHref?: string
  /** Secondary CTA text */
  secondaryCTA?: string
  /** Secondary CTA link */
  secondaryCTAHref?: string
  /** Badge text (appears above title) */
  badge?: string
  /** Image URL (for withImage variant) */
  image?: string
  /** Video URL (for withVideo variant) */
  video?: string
  /** Stats array (for withStats variant) */
  stats?: { label: string; value: string }[]
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
      secondaryCTA,
      secondaryCTAHref = '#',
      badge,
      image,
      video,
      stats,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const [isVideoLoaded, setIsVideoLoaded] = React.useState(false)

    // Variant-specific container classes
    const containerClasses = cn(
      'relative w-full overflow-hidden',
      variant === 'fullHeight' && 'min-h-screen',
      variant !== 'fullHeight' && 'py-20 sm:py-24 lg:py-32',
      className
    )

    // Content wrapper classes
    const contentWrapperClasses = cn(
      'container mx-auto px-4 sm:px-6 lg:px-8',
      variant === 'centered' && 'text-center',
      variant === 'split' && 'grid grid-cols-1 lg:grid-cols-2 gap-12 items-center'
    )

    // Title classes
    const titleClasses = cn(
      'font-bold tracking-tight',
      variant === 'minimal'
        ? 'text-4xl sm:text-5xl lg:text-6xl'
        : variant === 'centered'
          ? 'text-5xl sm:text-6xl lg:text-7xl'
          : 'text-4xl sm:text-5xl lg:text-6xl xl:text-7xl',
      variant === 'withGradient' &&
        'bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent'
    )

    // Description classes
    const descriptionClasses = cn(
      'text-muted-foreground',
      variant === 'minimal'
        ? 'text-lg sm:text-xl max-w-2xl'
        : variant === 'centered'
          ? 'text-xl sm:text-2xl max-w-3xl mx-auto'
          : 'text-lg sm:text-xl lg:text-2xl max-w-3xl'
    )

    return (
      <section ref={ref} className={containerClasses} {...props}>
        {/* Background Video */}
        {variant === 'withVideo' && video && (
          <div className="absolute inset-0 -z-10">
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
            <div className="absolute inset-0 bg-gradient-to-b from-background/80 to-background" />
          </div>
        )}

        {/* Gradient Background */}
        {variant === 'withGradient' && (
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 animate-gradient" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
          </div>
        )}

        <div className={contentWrapperClasses}>
          {/* Text Content */}
          <div className={variant === 'split' ? 'order-1' : ''}>
            {/* Badge */}
            {badge && (
              <div className={cn('mb-6', variant === 'centered' && 'flex justify-center')}>
                <Badge variant="secondary" className="px-4 py-2 text-sm font-medium">
                  {badge}
                </Badge>
              </div>
            )}

            {/* Title */}
            <h1 className={cn(titleClasses, 'mb-6')}>{title}</h1>

            {/* Description */}
            <p className={cn(descriptionClasses, 'mb-8')}>{description}</p>

            {/* CTAs */}
            <div
              className={cn(
                'flex flex-wrap gap-4',
                variant === 'centered' && 'justify-center'
              )}
            >
              {primaryCTA && (
                <Button asChild size="lg" className="text-base px-8 py-6">
                  <a href={primaryCTAHref}>{primaryCTA}</a>
                </Button>
              )}
              {secondaryCTA && (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="text-base px-8 py-6"
                >
                  <a href={secondaryCTAHref}>{secondaryCTA}</a>
                </Button>
              )}
            </div>

            {/* Stats (for withStats variant) */}
            {variant === 'withStats' && stats && stats.length > 0 && (
              <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center sm:text-left">
                    <div className="text-3xl sm:text-4xl font-bold text-primary">
                      {stat.value}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Custom Children */}
            {children && <div className="mt-8">{children}</div>}
          </div>

          {/* Image/Visual Content (for split/withImage variants) */}
          {(variant === 'split' || variant === 'withImage') && image && (
            <div className={cn('order-2', variant === 'withImage' && 'mt-12 lg:mt-0')}>
              <div className="relative aspect-video lg:aspect-square rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src={image}
                  alt={title}
                  className="h-full w-full object-cover"
                  loading="eager"
                />
              </div>
            </div>
          )}
        </div>
      </section>
    )
  }
)

Hero.displayName = 'Hero'

// ========== Export ==========

export default Hero
