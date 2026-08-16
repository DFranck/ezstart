'use client'
import { cn } from '../../lib/utils'
import React, { ReactNode } from 'react'

// Aurora CSS custom properties shared by both the standalone effect and the
// wrapper. Extracted here so consumers passing `<AuroraEffect />` to a hero
// `backgroundSlot` get the exact same look as `<AuroraBackground>` callers.
const AURORA_CSS_VARS = {
  '--aurora':
    'repeating-linear-gradient(100deg,#3b82f6_10%,#a5b4fc_15%,#93c5fd_20%,#ddd6fe_25%,#60a5fa_30%)',
  '--dark-gradient':
    'repeating-linear-gradient(100deg,#000_0%,#000_7%,transparent_10%,transparent_12%,#000_16%)',
  '--white-gradient':
    'repeating-linear-gradient(100deg,#fff_0%,#fff_7%,transparent_10%,transparent_12%,#fff_16%)',
  '--blue-300': '#93c5fd',
  '--blue-400': '#60a5fa',
  '--blue-500': '#3b82f6',
  '--indigo-300': '#a5b4fc',
  '--violet-200': '#ddd6fe',
  '--black': '#000',
  '--white': '#fff',
  '--transparent': 'transparent',
} as React.CSSProperties

const AURORA_LAYER_CLASSES = `after:animate-aurora pointer-events-none absolute -inset-[10px] [background-image:var(--white-gradient),var(--aurora)] [background-size:300%,_200%] [background-position:50%_50%,50%_50%] opacity-50 blur-[10px] invert filter will-change-transform [--aurora:repeating-linear-gradient(100deg,var(--blue-500)_10%,var(--indigo-300)_15%,var(--blue-300)_20%,var(--violet-200)_25%,var(--blue-400)_30%)] [--dark-gradient:repeating-linear-gradient(100deg,var(--black)_0%,var(--black)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--black)_16%)] [--white-gradient:repeating-linear-gradient(100deg,var(--white)_0%,var(--white)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--white)_16%)] after:absolute after:inset-0 after:[background-image:var(--white-gradient),var(--aurora)] after:[background-size:200%,_100%] after:[background-attachment:fixed] after:mix-blend-difference after:content-[""] dark:[background-image:var(--dark-gradient),var(--aurora)] dark:invert-0 after:dark:[background-image:var(--dark-gradient),var(--aurora)]`

const RADIAL_MASK_CLASS = `[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,var(--transparent)_70%)]`

// ─── AuroraEffect — slot-only, drop-in for any `backgroundSlot` ─────────────

export interface AuroraEffectProps {
  /** Additional className applied to the outer absolute wrapper. */
  className?: string
  /**
   * Mask the aurora with a radial gradient (ellipse at top-right) so the
   * effect fades toward the bottom-left for a softer look. Defaults to
   * `true` — matches the design ezstart uses in its hero.
   */
  showRadialGradient?: boolean
}

/**
 * Pure aurora visual layer — no wrapper, no children, just the animated
 * background painted `inset-0`. Drop into any container that already
 * provides the layout (hero `backgroundSlot`, modal background, full-bleed
 * section, etc.).
 *
 * @example Inside a hero's backgroundSlot (consumer pattern)
 * ```tsx
 * <Hero
 *   variant="full"
 *   title="..."
 *   description="..."
 *   backgroundSlot={<AuroraEffect />}
 * />
 * ```
 *
 * @example Inside a custom container
 * ```tsx
 * <div className="relative h-screen">
 *   <AuroraEffect />
 *   <div className="relative z-10">{your content}</div>
 * </div>
 * ```
 */
export const AuroraEffect = ({ className, showRadialGradient = true }: AuroraEffectProps) => {
  return (
    <div
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      style={AURORA_CSS_VARS}
      aria-hidden
    >
      <div className={cn(AURORA_LAYER_CLASSES, showRadialGradient && RADIAL_MASK_CLASS)} />
    </div>
  )
}

AuroraEffect.displayName = 'AuroraEffect'

// ─── AuroraBackground — wrapper that renders the effect + children ─────────

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children: ReactNode
  showRadialGradient?: boolean
}

/**
 * Full-viewport (100vh) aurora-backed container. Wraps `children` and
 * paints the aurora effect behind them. Used by ezstart's home `<HeroSection>`
 * as a one-liner around the hero content.
 *
 * For drop-in use inside the modern `<LandingHero backgroundSlot>` API,
 * prefer the slot-only {@link AuroraEffect} which lets the hero own the
 * layout (variant / sizing / children) while AuroraEffect provides only
 * the visual layers.
 */
export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) => {
  return (
    <div
      className={cn(
        'transition-bg relative flex h-[100vh] flex-col items-center justify-center w-full',
        className
      )}
      {...props}
    >
      <AuroraEffect showRadialGradient={showRadialGradient} />
      {children}
    </div>
  )
}

AuroraBackground.displayName = 'AuroraBackground'
