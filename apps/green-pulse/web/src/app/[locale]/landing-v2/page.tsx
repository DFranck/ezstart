'use client'
/**
 * GreenPulse Landing Page V2 - AI Form Builder with Visual Enhancements
 *
 * Client Component for interactive landing page with animations and media placeholders
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
  Section,
  Div,
  H2,
  H3,
  P,
  Card,
  CardContent,
  Badge,
  Input,
  Button,
} from '@ezstart/ui/components'

export default function LandingV2Page() {
  // Get SEO data for GreenPulse
  const seoData = getAppSEO('green-pulse')

  return (
    <>

      {/* Hero Section avec gradient vert AI */}
      <Section className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600">
        <Div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <Div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

        <Div className="relative">
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
            {/* Demo Interactive avec placeholder vidéo */}
            <Div className="mt-8 space-y-6 animate-fade-in">
              {/* Input Demo */}
              <Div className="p-6 rounded-lg border bg-white/10 backdrop-blur-md max-w-2xl">
                <Div className="text-sm text-white/90 mb-3 font-medium">Try it now (Demo):</Div>
                <Div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder='Type: "Create an employee onboarding form..."'
                    className="flex-1 bg-white/20 border-white/30 text-white placeholder:text-white/60"
                    readOnly
                  />
                  <Button className="px-6 bg-white text-emerald-600 hover:bg-white/90">
                    Generate ✨
                  </Button>
                </Div>
                <Div className="text-xs text-white/70 mt-2">
                  AI generates complete forms in 30 seconds
                </Div>
              </Div>

              {/* 📹 VIDEO PLACEHOLDER - AI Generation */}
              <Div className="relative rounded-xl overflow-hidden shadow-2xl border-4 border-white/20">
                <Div className="aspect-video bg-gradient-to-br from-emerald-900/40 to-teal-900/40 flex items-center justify-center backdrop-blur-sm">
                  <Div className="text-center space-y-4 p-8">
                    <Div className="w-20 h-20 mx-auto rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm">
                      <Span className="text-4xl">📹</Span>
                    </Div>
                    <P className="text-white font-semibold text-lg">AI Demo Video Placeholder</P>
                    <P className="text-white/80 text-sm max-w-md">
                      30s video: Type prompt → AI generates fields → Preview form → Export React code
                    </P>
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      Video: ai-demo.mp4 (5MB, 1920x1080)
                    </Badge>
                  </Div>
                </Div>
              </Div>
            </Div>
          </LandingHero>
        </Div>
      </Section>

      {/* Features Section avec GIF Placeholders */}
      <Section className="py-20 bg-gradient-to-b from-muted/30 to-background">
        <Div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Div className="text-center max-w-3xl mx-auto mb-12">
            <H2 className="text-3xl sm:text-4xl font-bold mb-4 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              The Only Form Builder Where AI Does the Work
            </H2>
            <P className="text-lg text-muted-foreground">
              Describe what you need in plain English. AI generates complete, working forms
              instantly.
            </P>
          </Div>

          {/* Feature Cards avec GIF Placeholders */}
          <Div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {/* Feature 1 - AI Generation */}
            <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 hover:border-emerald-500/50">
              <CardContent className="p-6 space-y-4">
                {/* 🎬 GIF PLACEHOLDER */}
                <Div className="aspect-video rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-950 dark:to-teal-950 flex items-center justify-center overflow-hidden">
                  <Div className="text-center space-y-2">
                    <Span className="text-3xl">🎬</Span>
                    <P className="text-xs text-muted-foreground px-4">
                      GIF: AI generating form fields from prompt
                    </P>
                    <Badge variant="outline" className="text-xs">ai-generation.gif (2MB)</Badge>
                  </Div>
                </Div>
                <H3 className="text-xl font-semibold">AI-Powered Generation</H3>
                <P className="text-sm text-muted-foreground">
                  Describe your form in natural language, AI builds it in seconds
                </P>
              </CardContent>
            </Card>

            {/* Feature 2 - Live Preview */}
            <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 hover:border-teal-500/50">
              <CardContent className="p-6 space-y-4">
                {/* 🎬 GIF PLACEHOLDER */}
                <Div className="aspect-video rounded-lg bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-950 dark:to-cyan-950 flex items-center justify-center overflow-hidden">
                  <Div className="text-center space-y-2">
                    <Span className="text-3xl">🎬</Span>
                    <P className="text-xs text-muted-foreground px-4">
                      GIF: Live preview and form filling
                    </P>
                    <Badge variant="outline" className="text-xs">form-preview.gif (2MB)</Badge>
                  </Div>
                </Div>
                <H3 className="text-xl font-semibold">Real-Time Preview</H3>
                <P className="text-sm text-muted-foreground">
                  See your form live as you build, test instantly
                </P>
              </CardContent>
            </Card>

            {/* Feature 3 - Code Export */}
            <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 hover:border-green-500/50">
              <CardContent className="p-6 space-y-4">
                {/* 🎬 GIF PLACEHOLDER */}
                <Div className="aspect-video rounded-lg bg-gradient-to-br from-green-100 to-lime-100 dark:from-green-950 dark:to-lime-950 flex items-center justify-center overflow-hidden">
                  <Div className="text-center space-y-2">
                    <Span className="text-3xl">🎬</Span>
                    <P className="text-xs text-muted-foreground px-4">
                      GIF: Export to React code
                    </P>
                    <Badge variant="outline" className="text-xs">code-export.gif (1.5MB)</Badge>
                  </Div>
                </Div>
                <H3 className="text-xl font-semibold">Export as Code</H3>
                <P className="text-sm text-muted-foreground">
                  Get production-ready React components, copy-paste ready
                </P>
              </CardContent>
            </Card>
          </Div>

          <FeatureGrid features={seoData.features} columns={3} variant="floating" expandable />
        </Div>
      </Section>

      {/* Screenshot Gallery */}
      <Section className="py-20 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20">
        <Div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Div className="text-center max-w-3xl mx-auto mb-12">
            <H2 className="text-3xl sm:text-4xl font-bold mb-4">
              Intuitive Form Builder Interface
            </H2>
            <P className="text-lg text-muted-foreground">
              Clean, modern UI that developers and non-developers love
            </P>
          </Div>

          {/* 📸 SCREENSHOTS PLACEHOLDER */}
          <Div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Screenshot 1 - Builder */}
            <Div className="relative rounded-xl overflow-hidden shadow-2xl border-2 border-emerald-200 dark:border-emerald-800 group">
              <Div className="aspect-video bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900 dark:to-teal-900 flex items-center justify-center">
                <Div className="text-center space-y-3 p-8">
                  <Span className="text-4xl">📸</Span>
                  <P className="font-semibold">Form Builder Screenshot</P>
                  <P className="text-sm text-muted-foreground">builder.webp (1920x1080)</P>
                  <Badge variant="outline">AI prompt visible + generated fields</Badge>
                </Div>
              </Div>
              <Div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-teal-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Div>

            {/* Screenshot 2 - Preview */}
            <Div className="relative rounded-xl overflow-hidden shadow-2xl border-2 border-teal-200 dark:border-teal-800 group">
              <Div className="aspect-video bg-gradient-to-br from-teal-100 to-cyan-100 dark:from-teal-900 dark:to-cyan-900 flex items-center justify-center">
                <Div className="text-center space-y-3 p-8">
                  <Span className="text-4xl">📸</Span>
                  <P className="font-semibold">Live Preview Screenshot</P>
                  <P className="text-sm text-muted-foreground">preview.webp (1920x1080)</P>
                  <Badge variant="outline">Form preview with validation</Badge>
                </Div>
              </Div>
              <Div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/10 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Div>
          </Div>
        </Div>
      </Section>

      {/* How It Works - avec icons animés */}
      <Section className="py-20">
        <Div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Div className="text-center max-w-3xl mx-auto mb-16">
            <H2 className="text-3xl sm:text-4xl font-bold mb-4 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              From Idea to Form in 3 Steps
            </H2>
          </Div>

          <Div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Div className="text-center group">
              <Div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg">
                1
              </Div>
              <H3 className="text-xl font-semibold mb-3">Describe Your Form</H3>
              <P className="text-muted-foreground">
                Tell AI what you need: "Create a customer feedback survey with rating scales and
                open text."
              </P>
            </Div>

            <Div className="text-center group">
              <Div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg">
                2
              </Div>
              <H3 className="text-xl font-semibold mb-3">AI Generates Instantly</H3>
              <P className="text-muted-foreground">
                AI analyzes your prompt, determines field types, adds validation rules, and
                structures multi-step flow.
              </P>
            </Div>

            <Div className="text-center group">
              <Div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg">
                3
              </Div>
              <H3 className="text-xl font-semibold mb-3">Customize & Export</H3>
              <P className="text-muted-foreground">
                Get 80% perfect instantly. Customize the final 20% if needed. Export as React
                components or use via API.
              </P>
            </Div>
          </Div>
        </Div>
      </Section>

      {/* Use Cases Section */}
      <Section className="py-20 bg-muted/30">
        <Div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <UseCases
            cases={seoData.useCases}
            variant="cards"
            showMetrics
            title="Real Time Savings, Real Results"
            description="See how AI form generation accelerated development for product managers, developers, and researchers."
          />
        </Div>
      </Section>

      {/* USPs Grid avec gradients */}
      <Section className="py-20 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20">
        <Div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Div className="text-center max-w-3xl mx-auto mb-12">
            <H2 className="text-3xl sm:text-4xl font-bold mb-4">{seoData.usps.title}</H2>
            <P className="text-lg text-muted-foreground">{seoData.usps.description}</P>
          </Div>

          <Div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {seoData.usps.differentiators.map((usp, index) => {
              const [title, ...descParts] = usp.split(':')
              const description = descParts.join(':').trim()

              // Rotation des couleurs vertes
              const colors = [
                'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20',
                'border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/20',
                'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20',
                'border-cyan-200 dark:border-cyan-800 bg-cyan-50/50 dark:bg-cyan-950/20'
              ]
              const colorClass = colors[index % colors.length]

              return (
                <Card
                  key={index}
                  className={`hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-2 ${colorClass}`}
                >
                  <CardContent className="p-6">
                    <Div className="flex items-start gap-3">
                      <Div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shrink-0">
                        <Span className="text-white text-lg">✨</Span>
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

      {/* Comparison Section */}
      <Section className="py-20">
        <Div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Div className="text-center max-w-3xl mx-auto mb-12">
            <H2 className="text-3xl sm:text-4xl font-bold mb-4 bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
              How GreenPulse Compares
            </H2>
          </Div>

          <Div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {seoData.vsCompetition.map((comparison, index) => (
              <Card
                key={index}
                className="p-8 border-2 border-emerald-200 dark:border-emerald-800 hover:border-emerald-500 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-emerald-50/30 to-teal-50/30 dark:from-emerald-950/10 dark:to-teal-950/10"
              >
                <H3 className="text-xl font-bold mb-4">{comparison.category}</H3>

                <Div className="space-y-4">
                  <Div>
                    <Div className="text-sm text-muted-foreground mb-2">Competitors:</Div>
                    <Div className="flex flex-wrap gap-2">
                      {comparison.competitors.map((competitor, idx) => (
                        <Badge key={idx} variant="secondary" className="px-3 py-1">
                          {competitor}
                        </Badge>
                      ))}
                    </Div>
                  </Div>

                  <Div>
                    <Div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2">
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

      {/* Stats Section avec gradient vert */}
      <Section className="py-20 bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600 text-white">
        <Div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <LandingStats
            stats={seoData.socialProof.stats}
            variant="grid"
            animated
            title="Proven Performance"
            description="AI-powered form generation that works"
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
      <Section className="py-20 bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600">
        <Div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <CTA
            variant="gradient"
            title="Stop Building Forms Field by Field"
            description="Let AI generate your forms in 30 seconds. Open-source, type-safe, production-ready. Start building smarter today."
            primaryText={seoData.callToAction.primary}
            primaryHref={seoData.callToAction.url}
            secondaryText="Try Demo"
            secondaryHref="#demo"
          />
        </Div>
      </Section>
    </>
  )
}
