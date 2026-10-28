'use client'

import {
  Card,
  CardContent,
  CardHeader,
  Div,
  H2,
  H3,
  Icon,
  KnownIconName,
  P,
  Section,
  Span,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

interface Challenge {
  icon: string
  title: string
  problem: string
  response: string
}

interface Force {
  tag: string
  title: string
  changing: string
  impact: string
  response: string
}

export function ChallengesSection() {
  const t = useTranslations('home')
  const challenges = t.raw('challenges.items') as Challenge[]
  const forces = t.raw('whyNow.forces') as Force[]

  return (
    <>
      <Section size="xl" id="challenges">
        <Div className="container mx-auto">
          <Div className="text-center mb-12">
            <H2 size="h3" className="mb-4">
              {t('challenges.title')}
            </H2>
            <P className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t('challenges.intro')}
            </P>
          </Div>

          <Div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {challenges.map(item => (
              <Card key={item.title}>
                <CardHeader className="flex items-center gap-3">
                  <Icon name={item.icon as KnownIconName} size={28} aria-hidden="true" />
                  <H3 size="h6" className="w-fit">
                    {item.title}
                  </H3>
                </CardHeader>
                <CardContent className="space-y-3">
                  <P className="text-sm text-muted-foreground">{item.problem}</P>
                  <P className="text-sm">
                    <Span className="font-semibold text-gp-primary">
                      {t('challenges.responseLabel')}
                    </Span>{' '}
                    {item.response}
                  </P>
                </CardContent>
              </Card>
            ))}
          </Div>
        </Div>
      </Section>

      <Section size="xl" id="why-now" className="bg-muted/30">
        <Div className="container mx-auto">
          <Div className="text-center mb-12">
            <H2 size="h3" className="mb-4">
              {t('whyNow.title')}
            </H2>
            <P className="text-lg text-muted-foreground max-w-3xl mx-auto">
              {t('whyNow.subtitle')}
            </P>
          </Div>

          <Div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {forces.map(force => (
              <Card key={force.title} className="border-t-4 border-t-gp-primary">
                <CardHeader className="space-y-1">
                  <Span className="text-xs font-semibold uppercase tracking-wide text-gp-primary">
                    {force.tag}
                  </Span>
                  <H3 size="h6">{force.title}</H3>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <P>
                    <Span className="font-semibold">{t('whyNow.changingLabel')} </Span>
                    <Span className="text-muted-foreground">{force.changing}</Span>
                  </P>
                  <P>
                    <Span className="font-semibold">{t('whyNow.impactLabel')} </Span>
                    <Span className="text-muted-foreground">{force.impact}</Span>
                  </P>
                  <P>
                    <Span className="font-semibold text-gp-primary">
                      {t('whyNow.responseLabel')}{' '}
                    </Span>
                    {force.response}
                  </P>
                </CardContent>
              </Card>
            ))}
          </Div>
        </Div>
      </Section>
    </>
  )
}
