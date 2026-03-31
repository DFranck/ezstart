'use client'

import { HeroSection } from './(home)/hero-section'
import { FeaturesSection } from './(home)/features-section'
import { CompetitiveSection } from './(home)/competitive-section'
import { PartnershipSection } from './(home)/partnership-section'

export default function HomePage(): React.JSX.Element {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <CompetitiveSection />
      <PartnershipSection />
    </>
  )
}
