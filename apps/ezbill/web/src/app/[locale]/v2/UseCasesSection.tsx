'use client'

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  Div,
  H2,
  H3,
  P,
  Section,
  Strong,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

export default function UseCasesSection() {
  const t = useTranslations('landing')

  return (
    <Section size="xl">
      <Div className="text-center mb-12">
        <H2 size="h3" className="mb-4">
          {t('useCases.title')}
        </H2>
        <P className="text-xl text-muted-foreground">{t('useCases.subtitle')}</P>
      </Div>

      <Div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {(Array.isArray(t.raw('useCases.cases')) ? t.raw('useCases.cases') : []).map(
          (
            useCase: { persona: string; challenge: string; solution: string; result: string },
            index: number
          ) => (
            <Card key={index} className="hover:shadow-xl transition-all">
              <CardHeader>
                <Badge className="mb-2 w-fit">{useCase.persona}</Badge>
                <H3 size="h5">{t('useCases.challengeLabel')}</H3>
                <P className="text-sm text-muted-foreground">{useCase.challenge}</P>
              </CardHeader>
              <CardContent className="space-y-4">
                <Div>
                  <H3 size="h6" className="mb-2">
                    {t('useCases.solutionLabel')}
                  </H3>
                  <P className="text-sm">{useCase.solution}</P>
                </Div>
                <Div className="bg-success/10 p-4 rounded-lg">
                  <Strong className="text-success">✓ {useCase.result}</Strong>
                </Div>
              </CardContent>
            </Card>
          )
        )}
      </Div>
    </Section>
  )
}
