'use client'
/**
 * GreenPulse Landing Page V2 - AI Form Builder
 *
 * Client Component for interactive landing page
 * Metadata handled in layout.tsx (Server Component)
 */

import { getAppSEO } from '@ezstart/seo-config'
import {
  CTA,
  FeatureGrid,
  LandingFAQ,
  LandingHero,
  LandingStats,
  UseCases,
} from '@ezstart/ui/components'

export default function LandingV2Page() {
  // Get SEO data for GreenPulse
  const seoData = getAppSEO('green-pulse')

  return (
    <>

      {/* Hero Section with Gradient */}
      <LandingHero
        variant="withGradient"
        title={seoData.tagline}
        description={seoData.shortDescription}
        primaryCTA={seoData.callToAction.primary}
        primaryCTAHref={seoData.callToAction.url}
        secondaryCTA="See Demo"
        secondaryCTAHref="#demo"
        badge="AI-Powered Form Generation"
      >
        {/* Demo Input Preview */}
        <div className="mt-8 p-6 rounded-lg border bg-card/50 backdrop-blur-sm max-w-2xl">
          <div className="text-sm text-muted-foreground mb-3">Try it now:</div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder='Type: "Create an employee onboarding form..."'
              className="flex-1 px-4 py-3 rounded-md border bg-background text-sm"
              readOnly
            />
            <button className="px-6 py-3 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
              Generate ✨
            </button>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            AI generates complete forms in 30 seconds
          </div>
        </div>
      </LandingHero>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              The Only Form Builder Where AI Does the Work
            </h2>
            <p className="text-lg text-muted-foreground">
              Describe what you need in plain English. AI generates complete, working forms
              instantly.
            </p>
          </div>

          <FeatureGrid features={seoData.features} columns={3} variant="floating" expandable />
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">From Idea to Form in 3 Steps</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold flex items-center justify-center mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-3">Describe Your Form</h3>
              <p className="text-muted-foreground">
                Tell AI what you need: "Create a customer feedback survey with rating scales and
                open text."
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold flex items-center justify-center mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-3">AI Generates Instantly</h3>
              <p className="text-muted-foreground">
                AI analyzes your prompt, determines field types, adds validation rules, and
                structures multi-step flow.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold flex items-center justify-center mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-3">Customize & Export</h3>
              <p className="text-muted-foreground">
                Get 80% perfect instantly. Customize the final 20% if needed. Export as React
                components or use via API.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <UseCases
            cases={seoData.useCases}
            variant="cards"
            showMetrics
            title="Real Time Savings, Real Results"
            description="See how AI form generation accelerated development for product managers, developers, and researchers."
          />
        </div>
      </section>

      {/* USPs Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{seoData.usps.title}</h2>
            <p className="text-lg text-muted-foreground">{seoData.usps.description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {seoData.usps.differentiators.map((usp, index) => {
              const [title, ...descParts] = usp.split(':')
              const description = descParts.join(':').trim()

              return (
                <div
                  key={index}
                  className="p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-lg">✨</span>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">{title}</h3>
                      {description && (
                        <p className="text-sm text-muted-foreground">{description}</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">How GreenPulse Compares</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {seoData.vsCompetition.map((comparison, index) => (
              <div
                key={index}
                className="p-8 rounded-xl border-2 bg-card hover:border-primary transition-colors"
              >
                <h3 className="text-xl font-bold mb-4">{comparison.category}</h3>

                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Competitors:</div>
                    <div className="flex flex-wrap gap-2">
                      {comparison.competitors.map((competitor, idx) => (
                        <span key={idx} className="px-3 py-1 rounded-full bg-muted text-sm">
                          {competitor}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-primary mb-2">Our Advantage:</div>
                    <p className="text-sm">{comparison.ourAdvantage}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <LandingStats
            stats={seoData.socialProof.stats}
            variant="grid"
            animated
            title="Proven Performance"
            description="AI-powered form generation that works"
          />
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <LandingFAQ items={seoData.faq} defaultExpanded={0} />
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <CTA
            variant="gradient"
            title="Stop Building Forms Field by Field"
            description="Let AI generate your forms in 30 seconds. Open-source, type-safe, production-ready. Start building smarter today."
            primaryText={seoData.callToAction.primary}
            primaryHref={seoData.callToAction.url}
            secondaryText="Try Demo"
            secondaryHref="#demo"
          />
        </div>
      </section>
    </>
  )
}
