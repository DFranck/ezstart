'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import { useDevice } from '../hooks/use-device'
import { cn } from '../lib/utils'
import { heroVariantConfig } from '../lib/design-system/variants'
import { H1, P, Section } from './tag'
import { Div } from './tag/src/aliases'

/**
 * Hero Component - Landing Page Hero Sections
 *
 * Flexible hero with layouts, video/image support, and overlay options.
 * Perfect for landing pages, feature highlights, and promotional sections.
 *
 * @example
 * // Basic centered hero with video
 * <Hero
 *   layout="center"
 *   videoSrc="/hero.mp4"
 *   title="Welcome to EZStart"
 *   subtitle="The Future"
 *   paragraph="Build amazing things"
 * />
 *
 * @example
 * // Grid layout with image on right
 * <Hero
 *   layout="grid"
 *   mediaPosition="right"
 *   imageSrc="/hero.jpg"
 *   height="viewport"
 *   alignment="left"
 *   title="Transform Your Business"
 * />
 *
 * @example
 * // Custom content with no overlay
 * <Hero
 *   layout="center"
 *   imageSrc="/bg.jpg"
 *   overlay={false}
 *   brightness="light"
 * >
 *   <CustomContent />
 * </Hero>
 */

const heroVariants = cva('relative max-w-none overflow-hidden', {
  variants: heroVariantConfig,
  defaultVariants: {
    height: 'lg',
    alignment: 'center',
  },
})

export interface HeroProps extends VariantProps<typeof heroVariants> {
  /** Unique ID for the section */
  id?: string
  /** Section size from Tag component */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  /** Additional CSS classes */
  className?: string
  /** Layout mode: centered overlay or side-by-side grid */
  layout?: 'center' | 'grid'
  /** Media position in grid layout */
  mediaPosition?: 'left' | 'right'
  /** Video source URL (autoplay, loop, muted) */
  videoSrc?: string
  /** Video poster image URL */
  posterSrc?: string
  /** Image source URL */
  imageSrc?: string
  /** Texture overlay image URL (appears over media with opacity) */
  textureSrc?: string
  /** Hero title */
  title?: React.ReactNode
  /** Hero subtitle (uppercase, tracking-widest) */
  subtitle?: React.ReactNode
  /** Hero paragraph */
  paragraph?: React.ReactNode
  /** Show dark overlay on media (default: true) */
  overlay?: boolean
  /** Overlay opacity (0-100) */
  overlayOpacity?: number
  /** Text brightness mode for contrast */
  brightness?: 'light' | 'dark' | 'auto'
  /** Custom content (overrides title/subtitle/paragraph) */
  children?: React.ReactNode
}

export const Hero = ({
  id,
  size = 'full',
  className,
  layout = 'center',
  mediaPosition = 'left',
  videoSrc,
  posterSrc,
  imageSrc,
  textureSrc,
  title,
  subtitle,
  paragraph,
  overlay = true,
  overlayOpacity = 30,
  brightness = 'auto',
  height,
  alignment,
  children,
}: HeroProps) => {
  const { isMobile } = useDevice()

  // Auto-detect brightness based on media presence
  const hasMedia = !!(videoSrc || imageSrc)
  const textBrightness = brightness === 'auto' ? (hasMedia ? 'light' : 'dark') : brightness

  // 🖼️ Media block (image or video)
  const Media = (
    <>
      {videoSrc ? (
        <video
          src={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          poster={posterSrc}
          className="absolute top-0 left-0 w-full h-full object-cover"
          aria-hidden="true"
        />
      ) : imageSrc ? (
        <img
          src={imageSrc}
          alt=""
          className="absolute top-0 left-0 w-full h-full object-cover"
          role="presentation"
        />
      ) : null}

      {textureSrc && (
        <img
          src={textureSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-30 z-[1] pointer-events-none"
          role="presentation"
        />
      )}

      {overlay && hasMedia && (
        <div
          className="absolute inset-0 bg-black z-[1]"
          style={{ opacity: overlayOpacity / 100 }}
          aria-hidden="true"
        />
      )}
    </>
  )

  // 📝 Text content block
  const TextContent = (
    <Div
      className={cn(
        'relative z-10 space-y-4 p-6 md:p-10 max-w-5xl',
        layout === 'center' && 'mx-auto',
        {
          'text-white': textBrightness === 'light',
          'text-foreground': textBrightness === 'dark',
        }
      )}
    >
      {subtitle && (
        <P className="uppercase tracking-widest" size="h1">
          {subtitle}
        </P>
      )}
      {title && <H1 className="italic">{title}</H1>}
      {paragraph && <P className="max-w-2xl">{paragraph}</P>}
      {children}
    </Div>
  )

  return (
    <Section
      id={id}
      size={size}
      className={cn(heroVariants({ height, alignment }), className)}
    >
      {/* ✅ Center mode: media as background overlay */}
      {layout === 'center' && (
        <>
          {Media}
          <div className="absolute inset-0 flex items-center justify-center z-[2]">
            {TextContent}
          </div>
        </>
      )}

      {/* ✅ Grid mode: media and text side-by-side */}
      {layout === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 h-full min-h-inherit">
          {mediaPosition === 'left' && (
            <>
              <div className="relative min-h-[40vh] md:min-h-[60vh]">{Media}</div>
              <div className="flex items-center justify-center">{TextContent}</div>
            </>
          )}
          {mediaPosition === 'right' && (
            <>
              <div className="flex items-center justify-center">{TextContent}</div>
              <div className="relative min-h-[40vh] md:min-h-[60vh]">{Media}</div>
            </>
          )}
        </div>
      )}
    </Section>
  )
}

export default Hero
