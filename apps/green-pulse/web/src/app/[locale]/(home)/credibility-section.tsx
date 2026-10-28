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
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

interface CredibilityCard {
  icon: string
  title: string
  description: string
}

interface TeamMember {
  name: string
  role: string
  description: string
}

export function CredibilitySection() {
  const t = useTranslations('home')
  const cards = t.raw('credibility.cards') as CredibilityCard[]
  const members = t.raw('credibility.team.members') as TeamMember[]

  return (
    <Section size="xl" id="credibility">
      <Div className="container mx-auto">
        <H2 size="h3" className="text-center mb-12">
          {t('credibility.title')}
        </H2>

        <Div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto mb-16">
          {cards.map(card => (
            <Card key={card.title} className="border-t-4 border-t-gp-primary">
              <CardHeader className="flex items-center gap-3">
                <Icon
                  name={card.icon as KnownIconName}
                  size={28}
                  className="flex-shrink-0 text-gp-primary"
                  aria-hidden="true"
                />
                <H3 size="h6" className="text-gp-primary">
                  {card.title}
                </H3>
              </CardHeader>
              <CardContent>
                <P className="text-sm text-muted-foreground leading-relaxed">{card.description}</P>
              </CardContent>
            </Card>
          ))}
        </Div>

        <Div className="max-w-4xl mx-auto text-center">
          <H3 size="h4" className="mb-2">
            {t('credibility.team.title')}
          </H3>
          <P className="text-muted-foreground mb-8">{t('credibility.team.intro')}</P>
          <Div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            {members.map(member => (
              <Card key={member.name} className="p-6">
                <P className="font-semibold text-lg">{member.name}</P>
                <P className="text-sm text-gp-primary mb-3">{member.role}</P>
                <P className="text-sm text-muted-foreground">{member.description}</P>
              </Card>
            ))}
          </Div>
        </Div>
      </Div>
    </Section>
  )
}
