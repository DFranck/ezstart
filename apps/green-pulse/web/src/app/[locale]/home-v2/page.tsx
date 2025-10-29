'use client'

import { HeroSection } from '@/components/home-v2/HeroSection'
import { LogoWallSection } from '@/components/home-v2/LogoWallSection'
import { StatsSection } from '@/components/home-v2/StatsSection'
import { FeaturesSection } from '@/components/home-v2/FeaturesSection'
import { HowItWorksSection } from '@/components/home-v2/HowItWorksSection'
import { TestimonialsSection } from '@/components/home-v2/TestimonialsSection'
import { CTASection } from '@/components/home-v2/CTASection'

/**
 * GreenPulse.AI Home Page V2
 *
 * Modern, conversion-optimized landing page with:
 * - Hero with animated typewriter effect
 * - Logo wall showing trusted companies
 * - Stats showcasing impact
 * - Features grid with icons
 * - How it works (3 steps)
 * - Testimonials slider
 * - Final CTA
 */
export default function HomeV2Page() {
  return (
    <>
      <HeroSection />
      <LogoWallSection />
      <StatsSection />
      <FeaturesSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <CTASection />
    </>
  )
}
