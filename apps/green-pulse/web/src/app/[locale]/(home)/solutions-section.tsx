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
  LI,
  P,
  Section,
  UL,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

interface SolutionFamily {
  icon: string
  title: string
  items: string[]
}

export function SolutionsSection() {
  const t = useTranslations('home')
  const families = t.raw('solutions.families') as SolutionFamily[]

  return (
    <Section size="xl" id="solutions">
      <Div className="container mx-auto">
        <Div className="text-center mb-12">
          <H2 size="h3" className="mb-4">
            {t('solutions.title')}
          </H2>
          <P className="text-xl text-muted-foreground max-w-3xl mx-auto">{t('solutions.intro')}</P>
        </Div>

        <Div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {families.map(family => (
            <Card key={family.title}>
              <CardHeader className="flex items-center gap-3">
                <Icon name={family.icon as KnownIconName} size={30} aria-hidden="true" />
                <H3 size="h5" className="w-fit">
                  {family.title}
                </H3>
              </CardHeader>
              <CardContent>
                <UL className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                  {family.items.map(item => (
                    <LI key={item}>{item}</LI>
                  ))}
                </UL>
              </CardContent>
            </Card>
          ))}
        </Div>

        <P className="text-center text-sm text-muted-foreground italic mt-8 max-w-3xl mx-auto">
          {t('solutions.note')}
        </P>
      </Div>
    </Section>
  )
}
