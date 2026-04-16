'use client'
/**
 * EZBill Landing Page V2 - Comprehensive Landing Inspired by GreenPulse
 *
 * Features:
 * - Hero with typewriter effect
 * - Problem/Solution framework
 * - Step-by-step process
 * - Feature showcase
 * - Comparison table
 * - Use cases
 * - Testimonials
 * - FAQ
 * - Strong CTAs
 */

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Div,
  H1,
  H2,
  H3,
  Icon,
  KnownIconName,
  P,
  Section,
  SplitSection,
  SplitSectionItem,
  Span,
  Strong,
  TypewriterEffectSmooth,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

import TestimonialsSection from './TestimonialsSection'
import UseCasesSection from './UseCasesSection'

export default function LandingV2Page() {
  const t = useTranslations('landing')

  return (
    <>
      {/* Hero Section */}
      <Section size="full" className="relative overflow-hidden bg-gradient-invoice">
        <Div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />

        <Div className="relative">
          {/* Logo + Title */}
          <Div layout="row" className="mb-6">
            <Icon name="custom:Ezbill" size={60} className="animate-pulse" />
            <H1 className="bg-gradient-to-r from-ezbill-client to-ezbill-invoice bg-clip-text text-transparent">
              {t('hero.title')}
            </H1>
          </Div>

          <Div layout="center" className="gap-6">
            {/* Badge */}
            <Badge variant="secondary" className="text-lg px-6 py-2">
              {t('hero.badge')}
            </Badge>

            {/* Subtitle */}
            <H2 size="h3" className="text-primary-foreground">
              {t('hero.subtitle')}
            </H2>

            {/* Typewriter Effect */}
            <TypewriterEffectSmooth
              words={[{ text: t('hero.typewriter') }]}
              className="text-primary-foreground text-center"
              duration={3}
              delay={0.5}
            />

            {/* Description */}
            <P className="text-xl text-primary-foreground/90 max-w-2xl">{t('hero.description')}</P>

            {/* CTA Button */}
            <Button
              asChild
              size="lg"
              className="bg-primary-foreground text-ezbill-invoice hover:bg-primary-foreground/90 text-lg px-8 py-6"
            >
              <Link href="/signup">{t('hero.cta')}</Link>
            </Button>
          </Div>
        </Div>
      </Section>

      {/* Problem Statement Section */}
      <Section size="xl" className="bg-muted/30">
        <Div className="container mx-auto">
          <Div className="text-center mb-12">
            <H2 size="h3" className="mb-4">
              {t.rich('problem.title', {
                strong: chunks => <Strong className="text-destructive">{chunks}</Strong>,
              })}
            </H2>
            <P className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t.rich('problem.subtitle', {
                strong: chunks => <Strong>{chunks}</Strong>,
              })}
            </P>
          </Div>

          <Div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {(Array.isArray(t.raw('problem.problems')) ? t.raw('problem.problems') : []).map(
              (item: { title: string; description: string }, index: number) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="flex items-center gap-3">
                    <Icon
                      name={
                        (index === 0
                          ? 'lucide:DollarSign'
                          : index === 1
                            ? 'lucide:Lock'
                            : 'lucide:Database') as KnownIconName
                      }
                      size={30}
                      className="text-destructive"
                    />
                    <H3 size="h6" className="w-fit">
                      {item.title}
                    </H3>
                  </CardHeader>
                  <CardContent>
                    <P
                      className="text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: item.description }}
                    />
                  </CardContent>
                </Card>
              )
            )}
          </Div>
        </Div>
      </Section>

      {/* Solution Section - 3 Steps */}
      <SplitSection diagonal diagonalDirection="right" diagonalAngle={10} inverted>
        <SplitSectionItem size="xl" className="xl:mx-20">
          <H2 size="h3" className="mb-8">
            {t('solution.title')}
          </H2>
          <P className="text-lg text-muted-foreground mb-8">{t('solution.description')}</P>

          {/* 3-Step Process */}
          <Div className="space-y-6">
            {(['step1', 'step2', 'step3'] as const).map((step, index) => (
              <Div key={step} className="flex gap-4">
                <Badge circle circleSize="lg" className="bg-ezbill-invoice shrink-0">
                  {t(`solution.steps.${step}.badge`)}
                </Badge>
                <Div>
                  <H3 size="h5" className="mb-2">
                    {t(`solution.steps.${step}.title`)}
                  </H3>
                  <P className="text-muted-foreground">{t(`solution.steps.${step}.description`)}</P>
                </Div>
              </Div>
            ))}
          </Div>
        </SplitSectionItem>

        {/* Right side - Visual placeholder */}
        <SplitSectionItem className="h-full min-h-[500px]">
          <Div className="relative w-full h-full rounded-lg overflow-hidden bg-gradient-to-br from-ezbill-invoice/20 to-ezbill-payment/20">
            <Div className="absolute inset-0 flex items-center justify-center">
              <Div className="text-center space-y-4 p-8">
                <Span className="text-6xl">📊</Span>
                <P className="font-semibold text-lg">{t('solution.dashboardScreenshotLabel')}</P>
                <P className="text-sm text-muted-foreground">
                  {t('solution.dashboardScreenshotHint')}
                </P>
              </Div>
            </Div>
          </Div>
        </SplitSectionItem>
      </SplitSection>

      {/* Features Section */}
      <Section size="xl">
        <Div className="text-center mb-12">
          <H2 size="h3" className="mb-4">
            {t('features.title')}
          </H2>
          <P className="text-xl text-muted-foreground">{t('features.subtitle')}</P>
        </Div>

        {/* Feature Grid - 3 main features */}
        <Div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {(Array.isArray(t.raw('solution.features')) ? t.raw('solution.features') : []).map(
            (feature: { title: string; description: string }, index: number) => (
              <Card key={index} variant="floating" className="hover:shadow-xl transition-all">
                <CardHeader className="flex items-center gap-3">
                  <Icon
                    name={
                      (index === 0
                        ? 'lucide:Infinity'
                        : index === 1
                          ? 'lucide:Shield'
                          : 'lucide:Palette') as KnownIconName
                    }
                    size={30}
                    className="text-ezbill-invoice"
                  />
                  <H3 size="h5" className="w-fit">
                    {feature.title}
                  </H3>
                </CardHeader>
                <CardContent>
                  <P className="text-muted-foreground">{feature.description}</P>
                </CardContent>
              </Card>
            )
          )}
        </Div>

        {/* Additional features - 6 cards */}
        <Div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {(Array.isArray(t.raw('features.list')) ? t.raw('features.list') : []).map(
            (feature: { title: string; description: string }, index: number) => (
              <Card key={index} className="hover:border-ezbill-invoice/50 transition-colors">
                <CardHeader>
                  <H3 size="h6">{feature.title}</H3>
                </CardHeader>
                <CardContent>
                  <P className="text-sm text-muted-foreground">{feature.description}</P>
                </CardContent>
              </Card>
            )
          )}
        </Div>
      </Section>

      {/* Comparison Section */}
      <Section size="xl" className="bg-gradient-to-br from-background to-muted/20">
        <Div className="text-center mb-12">
          <H2 size="h3" className="mb-4">
            {t('comparison.title')}
          </H2>
          <P className="text-xl text-muted-foreground">{t('comparison.description')}</P>
        </Div>

        {/* Comparison Cards */}
        <Div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {/* Competitors */}
          {(Array.isArray(t.raw('comparison.competitors'))
            ? t.raw('comparison.competitors')
            : []
          ).map(
            (
              competitor: { name: string; price: string; yearCost: string; limits: string },
              index: number
            ) => (
              <Card key={index} className="bg-muted/50">
                <CardContent className="p-6 space-y-4">
                  <H3 size="h5" className="text-center">
                    {competitor.name}
                  </H3>
                  <Div className="text-center space-y-2">
                    <P className="text-2xl font-bold text-destructive">{competitor.price}</P>
                    <P className="text-sm text-muted-foreground">{competitor.yearCost}</P>
                    <P className="text-xs text-muted-foreground italic">{competitor.limits}</P>
                  </Div>
                </CardContent>
              </Card>
            )
          )}

          {/* EZBill - Highlighted */}
          <Card className="bg-gradient-invoice text-primary-foreground border-4 border-primary relative overflow-hidden">
            <Div className="absolute top-4 right-4">
              <Badge className="bg-primary-foreground text-ezbill-invoice">
                {t('comparison.bestValue')}
              </Badge>
            </Div>
            <CardContent className="p-6 space-y-4">
              <H3 size="h5" className="text-center text-primary-foreground">
                EZBill
              </H3>
              <Div className="text-center space-y-2">
                <P className="text-2xl font-bold text-primary-foreground">
                  {(t.raw('comparison.ezbill') as Record<string, string>).price}
                </P>
                <P className="text-sm text-primary-foreground/90">
                  {(t.raw('comparison.ezbill') as Record<string, string>).yearCost}
                </P>
                <P className="text-xs text-primary-foreground/90 italic">
                  {(t.raw('comparison.ezbill') as Record<string, string>).limits}
                </P>
              </Div>
            </CardContent>
          </Card>
        </Div>

        {/* Savings Highlight */}
        <Div className="text-center mt-8">
          <Badge variant="success" className="text-xl px-6 py-3">
            💰 {t('comparison.savings')}
          </Badge>
        </Div>
      </Section>

      {/* Use Cases Section */}
      <UseCasesSection />

      {/* Testimonials Section */}
      <TestimonialsSection />

      {/* FAQ Section */}
      <Section size="xl">
        <Div className="container mx-auto max-w-4xl">
          <H2 size="h3" className="text-center mb-12">
            {t('faq.title')}
          </H2>

          <Div className="space-y-4">
            {(Array.isArray(t.raw('faq.questions')) ? t.raw('faq.questions') : []).map(
              (item: { question: string; answer: string }, index: number) => (
                <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                  <Div>
                    <H3 size="h5" className="mb-3 flex items-start gap-3">
                      <Icon
                        name="lucide:HelpCircle"
                        className="w-6 h-6 text-ezbill-invoice flex-shrink-0 mt-1"
                      />
                      <Span>{item.question}</Span>
                    </H3>
                    <P className="text-muted-foreground leading-relaxed pl-9">{item.answer}</P>
                  </Div>
                </Card>
              )
            )}
          </Div>
        </Div>
      </Section>

      {/* Final CTA Section */}
      <Section size="full" className="bg-gradient-invoice text-primary-foreground">
        <Div className="container mx-auto text-center">
          <Div className="max-w-3xl mx-auto space-y-6">
            <H2 size="h2" className="text-primary-foreground">
              {t('cta.title')}
            </H2>
            <P className="text-xl text-primary-foreground/90">{t('cta.description')}</P>

            <Div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                asChild
                size="lg"
                className="bg-primary-foreground text-ezbill-invoice hover:bg-primary-foreground/90 text-lg px-8 py-6"
              >
                <Link href="/signup">{t('cta.primary')}</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Link href="/pricing">{t('cta.secondary')}</Link>
              </Button>
            </Div>

            <P className="text-sm text-primary-foreground/70">{t('cta.guarantee')}</P>
          </Div>
        </Div>
      </Section>
    </>
  )
}
