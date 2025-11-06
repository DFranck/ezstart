'use client'
/**
 * EZBill Landing Page V2 - Modern Landing with SEO Optimization + Visual Placeholders
 *
 * Client Component for interactive landing page with animations and media placeholders
 * Metadata handled in layout.tsx (Server Component)
 */

import { getAppSEO } from '@ezstart/seo-config'
import {
  LandingHero,
  FeatureGrid,
  UseCases,
  LandingFAQ,
  CTA,
  LandingStats,
  Section,
  Div,
  H2,
  H3,
  P,
  Span,
  Card,
  CardContent,
  Badge,
} from '@ezstart/ui/components'

export default function LandingV2Page() {
  // Get SEO data for EZBill
  const seoData = getAppSEO('ezbill')

  return (
    <>

      {/* Hero Section avec Vidéo Demo Placeholder */}
      <Section className="relative overflow-hidden bg-gradient-invoice">
        <Div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
        <Div className="relative">
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
          >
            {/* 📹 VIDEO PLACEHOLDER - Démo 30s de création de facture */}
            <Div className="mt-12 animate-fade-in">
              <Div className="relative rounded-xl overflow-hidden shadow-2xl border-4 border-white/20 bg-gradient-invoice-light">
                <Div className="aspect-video bg-gradient-to-br from-ezbill-invoice/20 to-ezbill-payment/20 flex items-center justify-center">
                  <Div className="text-center space-y-4 p-8">
                    <Div className="w-20 h-20 mx-auto rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm">
                      <Span className="text-4xl">📹</Span>
                    </Div>
                    <P className="text-white font-semibold text-lg">Demo Video Placeholder</P>
                    <P className="text-white/80 text-sm max-w-md">
                      30-second video: Create invoice from client selection → add items → preview → send
                    </P>
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      Video: invoice-demo.mp4 (5MB, 1920x1080)
                    </Badge>
                  </Div>
                </Div>
              </Div>
            </Div>
          </LandingHero>
        </Div>
      </Section>

      {/* Features Section avec GIFs */}
      <Section className="py-20 bg-muted/30 animate-slide-up">
        <Div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Div className="text-center max-w-3xl mx-auto mb-12">
            <H2 className="text-3xl sm:text-4xl font-bold mb-4 bg-gradient-payment bg-clip-text text-transparent">
              Everything You Need for Professional Invoicing
            </H2>
            <P className="text-lg text-muted-foreground">
              Stop paying $30-50/month for basic invoicing. Own your invoicing system
              forever.
            </P>
          </Div>

          {/* Feature Cards avec GIF Placeholders */}
          <Div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {/* Feature 1 - Client Management */}
            <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-6 space-y-4">
                {/* 🎬 GIF PLACEHOLDER */}
                <Div className="aspect-video rounded-lg bg-gradient-client-light flex items-center justify-center overflow-hidden">
                  <Div className="text-center space-y-2">
                    <Span className="text-3xl">🎬</Span>
                    <P className="text-xs text-muted-foreground px-4">
                      GIF: Adding new client with auto-complete
                    </P>
                    <Badge variant="outline" className="text-xs">client-add.gif (2MB)</Badge>
                  </Div>
                </Div>
                <H3 className="text-xl font-semibold">Client Management</H3>
                <P className="text-sm text-muted-foreground">
                  Organize clients, track payment history, manage contacts
                </P>
              </CardContent>
            </Card>

            {/* Feature 2 - Invoice Creation */}
            <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-6 space-y-4">
                {/* 🎬 GIF PLACEHOLDER */}
                <Div className="aspect-video rounded-lg bg-gradient-invoice-light flex items-center justify-center overflow-hidden">
                  <Div className="text-center space-y-2">
                    <Span className="text-3xl">🎬</Span>
                    <P className="text-xs text-muted-foreground px-4">
                      GIF: Creating invoice with line items
                    </P>
                    <Badge variant="outline" className="text-xs">invoice-create.gif (2MB)</Badge>
                  </Div>
                </Div>
                <H3 className="text-xl font-semibold">Fast Invoice Creation</H3>
                <P className="text-sm text-muted-foreground">
                  Create professional invoices in under 60 seconds
                </P>
              </CardContent>
            </Card>

            {/* Feature 3 - PDF Generation */}
            <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-6 space-y-4">
                {/* 🎬 GIF PLACEHOLDER */}
                <Div className="aspect-video rounded-lg bg-gradient-receipt-light flex items-center justify-center overflow-hidden">
                  <Div className="text-center space-y-2">
                    <Span className="text-3xl">🎬</Span>
                    <P className="text-xs text-muted-foreground px-4">
                      GIF: PDF preview and download
                    </P>
                    <Badge variant="outline" className="text-xs">pdf-preview.gif (1.5MB)</Badge>
                  </Div>
                </Div>
                <H3 className="text-xl font-semibold">Beautiful PDFs</H3>
                <P className="text-sm text-muted-foreground">
                  Professional templates, instant generation, email-ready
                </P>
              </CardContent>
            </Card>
          </Div>

          <FeatureGrid
            features={seoData.features}
            columns={3}
            variant="floating"
            showUseCases
          />
        </Div>
      </Section>

      {/* Screenshot Gallery Section */}
      <Section className="py-20 bg-gradient-to-br from-background to-muted/20">
        <Div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Div className="text-center max-w-3xl mx-auto mb-12">
            <H2 className="text-3xl sm:text-4xl font-bold mb-4">
              Beautiful, Professional Interface
            </H2>
            <P className="text-lg text-muted-foreground">
              Modern design that works on desktop, tablet, and mobile
            </P>
          </Div>

          {/* 📸 SCREENSHOTS PLACEHOLDER */}
          <Div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Screenshot 1 - Dashboard */}
            <Div className="relative rounded-xl overflow-hidden shadow-2xl border group">
              <Div className="aspect-video bg-gradient-to-br from-ezbill-invoice/10 to-ezbill-client/10 flex items-center justify-center">
                <Div className="text-center space-y-3 p-8">
                  <Span className="text-4xl">📸</Span>
                  <P className="font-semibold">Dashboard Screenshot</P>
                  <P className="text-sm text-muted-foreground">dashboard.webp (1920x1080)</P>
                </Div>
              </Div>
              <Div className="absolute inset-0 bg-gradient-invoice opacity-0 group-hover:opacity-10 transition-opacity" />
            </Div>

            {/* Screenshot 2 - Invoice Editor */}
            <Div className="relative rounded-xl overflow-hidden shadow-2xl border group">
              <Div className="aspect-video bg-gradient-to-br from-ezbill-payment/10 to-ezbill-quote/10 flex items-center justify-center">
                <Div className="text-center space-y-3 p-8">
                  <Span className="text-4xl">📸</Span>
                  <P className="font-semibold">Invoice Editor Screenshot</P>
                  <P className="text-sm text-muted-foreground">editor.webp (1920x1080)</P>
                </Div>
              </Div>
              <Div className="absolute inset-0 bg-gradient-payment opacity-0 group-hover:opacity-10 transition-opacity" />
            </Div>
          </Div>
        </Div>
      </Section>

      {/* USPs Section avec gradients */}
      <Section className="py-20 bg-gradient-quote-light">
        <Div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Div className="text-center max-w-3xl mx-auto mb-12">
            <H2 className="text-3xl sm:text-4xl font-bold mb-4">
              {seoData.usps.title}
            </H2>
            <P className="text-lg text-muted-foreground">{seoData.usps.description}</P>
          </Div>

          <Div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {seoData.usps.differentiators.map((usp, index) => {
              const [title, ...descParts] = usp.split(':')
              const description = descParts.join(':').trim()

              // Rotation des gradients pour chaque carte
              const gradients = [
                'bg-gradient-invoice-light',
                'bg-gradient-payment-light',
                'bg-gradient-quote-light',
                'bg-gradient-client-light'
              ]
              const gradientClass = gradients[index % gradients.length]

              return (
                <Card
                  key={index}
                  className={`hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${gradientClass}`}
                >
                  <CardContent className="p-6">
                    <Div className="flex items-start gap-3">
                      <Div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Span className="text-primary font-bold text-lg">✓</Span>
                      </Div>
                      <Div>
                        <H3 className="font-semibold mb-2">{title}</H3>
                        {description && (
                          <P className="text-sm text-muted-foreground">{description}</P>
                        )}
                      </Div>
                    </Div>
                  </CardContent>
                </Card>
              )
            })}
          </Div>
        </Div>
      </Section>

      {/* Use Cases Section */}
      <Section className="py-20 bg-muted/30">
        <Div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <UseCases
            cases={seoData.useCases}
            variant="comparison"
            showMetrics
            title="Real Results from Real Users"
            description="See how EZBill helped freelancers, agencies, and businesses save money and time."
          />
        </Div>
      </Section>

      {/* Comparison Section avec gradients */}
      <Section className="py-20">
        <Div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Div className="text-center max-w-3xl mx-auto mb-12">
            <H2 className="text-3xl sm:text-4xl font-bold mb-4 bg-gradient-company bg-clip-text text-transparent">
              Why Choose EZBill?
            </H2>
            <P className="text-lg text-muted-foreground">
              See how we compare to the alternatives
            </P>
          </Div>

          <Div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {seoData.vsCompetition.map((comparison, index) => (
              <Card
                key={index}
                className="p-8 border-2 hover:border-ezbill-payment transition-all duration-300 hover:shadow-xl bg-gradient-company-light"
              >
                <H3 className="text-xl font-bold mb-4">{comparison.category}</H3>

                <Div className="space-y-4">
                  <Div>
                    <Div className="text-sm text-muted-foreground mb-2">
                      Competitors:
                    </Div>
                    <Div className="flex flex-wrap gap-2">
                      {comparison.competitors.map((competitor, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="px-3 py-1"
                        >
                          {competitor}
                        </Badge>
                      ))}
                    </Div>
                  </Div>

                  <Div>
                    <Div className="text-sm font-semibold text-ezbill-payment mb-2">
                      Our Advantage:
                    </Div>
                    <P className="text-sm">{comparison.ourAdvantage}</P>
                  </Div>
                </Div>
              </Card>
            ))}
          </Div>
        </Div>
      </Section>

      {/* Social Proof Stats avec gradient */}
      <Section className="py-20 bg-gradient-payment text-white">
        <Div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <LandingStats
            stats={seoData.socialProof.stats}
            variant="centered"
            animated
            title="Trusted by Freelancers and Businesses"
          />
        </Div>
      </Section>

      {/* FAQ Section */}
      <Section className="py-20">
        <Div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <LandingFAQ items={seoData.faq} defaultExpanded={0} />
        </Div>
      </Section>

      {/* Final CTA avec gradient */}
      <Section className="py-20 bg-gradient-to-br from-ezbill-invoice to-ezbill-payment">
        <Div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <CTA
            variant="gradient"
            title="Ready to Stop Paying Monthly Fees?"
            description="Join thousands of freelancers and businesses who own their invoicing system. No subscriptions, no limits, just professional invoicing forever."
            primaryText={seoData.callToAction.primary}
            primaryHref={seoData.callToAction.url}
            secondaryText="View Documentation"
            secondaryHref="/docs"
          />
        </Div>
      </Section>
    </>
  )
}
