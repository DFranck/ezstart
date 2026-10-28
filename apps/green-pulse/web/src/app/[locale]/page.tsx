'use client'

import { ApplicationsSection } from './(home)/applications-section'
import { ChallengesSection } from './(home)/challenges-section'
import { CompetitiveSection } from './(home)/competitive-section'
import { CredibilitySection } from './(home)/credibility-section'
import { CtaSection } from './(home)/cta-section'
import { FaqSection } from './(home)/faq-section'
import { HeroSection } from './(home)/hero-section'
import { HowItWorksSection } from './(home)/how-it-works-section'
import { OffersSection } from './(home)/offers-section'
import { PartnershipSection } from './(home)/partnership-section'
import { SolutionsSection } from './(home)/solutions-section'

export default function HomePage(): React.JSX.Element {
  return (
    <>
      <HeroSection />
      <ChallengesSection />
      <SolutionsSection />
      <HowItWorksSection />
      <ApplicationsSection />
      <CompetitiveSection />
      <OffersSection />
      <PartnershipSection />
      <CredibilitySection />
      <FaqSection />
      <CtaSection />
    </>
  )
}
