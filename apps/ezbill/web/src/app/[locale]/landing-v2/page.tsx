/**
 * EZBill Landing Page V2 - Modern Landing with SEO Optimization
 *
 * Uses components from @ezstart/ui and data from @ezstart/seo-config
 */

import {
  generateLandingMetadata,
  generateFAQSchema,
  generateSoftwareSchema,
  getAppSEO,
} from '@ezstart/seo-config'
import {
  LandingHero,
  FeatureGrid,
  UseCases,
  LandingFAQ,
  CTA,
  LandingStats,
} from '@ezstart/ui/components'

// Generate metadata for this page
export const metadata = generateLandingMetadata('ezbill')

export default function LandingV2Page() {
  // Get SEO data for EZBill
  const seoData = getAppSEO('ezbill')

  // Generate Schema.org structured data
  const faqSchema = generateFAQSchema('ezbill')
  const softwareSchema = generateSoftwareSchema('ezbill')

  return (
    <>
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />

      {/* Hero Section */}
      <LandingHero
        variant="withStats"
        title={seoData.tagline}
        description={seoData.shortDescription}
        primaryCTA={seoData.callToAction.primary}
        primaryCTAHref={seoData.callToAction.url}
        secondaryCTA={seoData.callToAction.secondary}
        secondaryCTAHref="#features"
        badge="Professional Invoicing - No Subscription"
        stats={seoData.socialProof.stats}
      />

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything You Need for Professional Invoicing
            </h2>
            <p className="text-lg text-muted-foreground">
              Stop paying $30-50/month for basic invoicing. Own your invoicing system
              forever.
            </p>
          </div>

          <FeatureGrid
            features={seoData.features}
            columns={3}
            variant="floating"
            showUseCases
          />
        </div>
      </section>

      {/* USPs Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              {seoData.usps.title}
            </h2>
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
                      <span className="text-primary font-bold">✓</span>
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

      {/* Use Cases Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <UseCases
            cases={seoData.useCases}
            variant="comparison"
            showMetrics
            title="Real Results from Real Users"
            description="See how EZBill helped freelancers, agencies, and businesses save money and time."
          />
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Why Choose EZBill?
            </h2>
            <p className="text-lg text-muted-foreground">
              See how we compare to the alternatives
            </p>
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
                    <div className="text-sm text-muted-foreground mb-2">
                      Competitors:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {comparison.competitors.map((competitor, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 rounded-full bg-muted text-sm"
                        >
                          {competitor}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-primary mb-2">
                      Our Advantage:
                    </div>
                    <p className="text-sm">{comparison.ourAdvantage}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Stats */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <LandingStats
            stats={seoData.socialProof.stats}
            variant="centered"
            animated
            title="Trusted by Freelancers and Businesses"
          />
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <LandingFAQ items={seoData.faq} defaultExpanded={0} />
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <CTA
            variant="gradient"
            title="Ready to Stop Paying Monthly Fees?"
            description="Join thousands of freelancers and businesses who own their invoicing system. No subscriptions, no limits, just professional invoicing forever."
            primaryText={seoData.callToAction.primary}
            primaryHref={seoData.callToAction.url}
            secondaryText="View Documentation"
            secondaryHref="/docs"
          />
        </div>
      </section>
    </>
  )
}
