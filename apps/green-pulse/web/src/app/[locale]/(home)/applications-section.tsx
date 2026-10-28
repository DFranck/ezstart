'use client'

import { Card, Div, H2, H3, Icon, KnownIconName, P, Section, Strong } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

interface UseCase {
  icon: string
  title: string
  challenge: string
  solution: string
  result: string
  tags: string[]
}

export function ApplicationsSection() {
  const t = useTranslations('home')
  const cases = t.raw('useCases.cases') as UseCase[]
  const rows = ['challenge', 'solution', 'result'] as const

  return (
    <Section size="xl" id="use-cases">
      <Div className="container mx-auto">
        <H2 size="h3" className="text-center mb-12">
          {t('useCases.title')}
        </H2>

        <Div className="flex flex-col gap-6 max-w-6xl mx-auto">
          {cases.map(useCase => (
            <Card key={useCase.title} className="p-6">
              <Div className="flex flex-col md:flex-row gap-6">
                <Icon
                  name={useCase.icon as KnownIconName}
                  size={48}
                  className="flex-shrink-0 text-gp-primary"
                  aria-hidden="true"
                />
                <Div className="flex-1 space-y-4">
                  <H3 size="h5" className="text-gp-primary">
                    {useCase.title}
                  </H3>
                  {rows.map(row => (
                    <Div key={row}>
                      <Strong className="text-sm">{t(`useCases.labels.${row}`)}</Strong>
                      <P className="text-sm text-muted-foreground mt-1">{useCase[row]}</P>
                    </Div>
                  ))}
                  <P className="text-xs uppercase tracking-wide text-muted-foreground">
                    {useCase.tags.join(' · ')}
                  </P>
                </Div>
              </Div>
            </Card>
          ))}
        </Div>

        <P className="text-center text-sm text-muted-foreground mt-8 italic max-w-4xl mx-auto">
          {t('useCases.disclaimer')}
        </P>
      </Div>
    </Section>
  )
}
