'use client'

import {
  Card,
  CardContent,
  CardHeader,
  Div,
  H2,
  H3,
  LI,
  P,
  Section,
  Span,
  UL,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

interface Step {
  title: string
  items: string[]
}

interface Tool {
  title: string
  example: string
}

interface JourneyStep {
  title: string
  description: string
}

export function HowItWorksSection() {
  const t = useTranslations('home')
  const steps = t.raw('howItWorks.steps') as Step[]
  const tools = t.raw('howItWorks.tools.items') as Tool[]
  const journey = t.raw('howItWorks.journey.steps') as JourneyStep[]

  return (
    <Section size="xl" id="how-it-works" className="bg-muted/30">
      <Div className="container mx-auto">
        <Div className="text-center mb-12">
          <H2 size="h3" className="mb-4">
            {t('howItWorks.title')}
          </H2>
          <P className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t('howItWorks.subtitle')}
          </P>
        </Div>

        <Div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {steps.map((step, index) => (
            <Card key={step.title}>
              <CardHeader className="flex items-center gap-3">
                <Span className="font-bold rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0 bg-gp-primary text-primary-foreground">
                  {index + 1}
                </Span>
                <H3 size="h6" className="w-fit">
                  {step.title}
                </H3>
              </CardHeader>
              <CardContent>
                <UL className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                  {step.items.map(item => (
                    <LI key={item}>{item}</LI>
                  ))}
                </UL>
              </CardContent>
            </Card>
          ))}
        </Div>

        <P className="text-center font-medium mt-6">{t('howItWorks.repeat')}</P>

        <Div className="max-w-5xl mx-auto mt-12 text-center">
          <H3 size="h5" className="mb-2">
            {t('howItWorks.tools.title')}
          </H3>
          <P className="text-muted-foreground mb-6">{t('howItWorks.tools.intro')}</P>
          <Div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {tools.map(tool => (
              <Div key={tool.title} className="rounded-lg border bg-card p-4">
                <P className="font-semibold text-sm">{tool.title}</P>
                <P className="text-xs text-muted-foreground mt-1">{tool.example}</P>
              </Div>
            ))}
          </Div>
        </Div>

        <Div className="max-w-6xl mx-auto mt-16">
          <H3 size="h5" className="text-center mb-8">
            {t('howItWorks.journey.title')}
          </H3>
          <UL className="grid grid-cols-1 md:grid-cols-5 gap-6 list-none p-0">
            {journey.map((step, index) => (
              <LI key={step.title} className="space-y-2">
                <Span className="text-sm font-bold text-gp-primary">0{index + 1}</Span>
                <P className="font-semibold">{step.title}</P>
                <P className="text-sm text-muted-foreground">{step.description}</P>
              </LI>
            ))}
          </UL>
        </Div>
      </Div>
    </Section>
  )
}
