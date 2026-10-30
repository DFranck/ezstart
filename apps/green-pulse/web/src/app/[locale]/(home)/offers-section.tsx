'use client'

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Div,
  H2,
  H3,
  Icon,
  LI,
  P,
  Section,
  Span,
  UL,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { ContactButton } from './contact-button'

interface Plan {
  name: string
  status: string
  description: string
  requestAccess?: boolean
}

function AudienceList({ label, items }: { label: string; items: string[] }) {
  return (
    <Div>
      <P className="text-sm font-semibold mb-2">{label}</P>
      <UL className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
        {items.map(item => (
          <LI key={item}>{item}</LI>
        ))}
      </UL>
    </Div>
  )
}

export function OffersSection() {
  const t = useTranslations('home')
  const features = t.raw('offers.whiteLabel.features') as string[]
  const plans = t.raw('offers.direct.plans') as Plan[]
  const ecosystemItems = t.raw('offers.ecosystem.items') as string[]

  return (
    <Section size="xl" id="pricing">
      <Div className="container mx-auto">
        <Div className="text-center mb-12">
          <H2 size="h3" className="mb-4">
            {t('offers.title')}
          </H2>
          <P className="text-xl text-muted-foreground max-w-3xl mx-auto">{t('offers.subtitle')}</P>
        </Div>

        <Card className="max-w-5xl mx-auto border-2 border-gp-primary p-8">
          <Div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Div className="md:col-span-2 space-y-4">
              <H3 size="h4">{t('offers.whiteLabel.title')}</H3>
              <P className="text-muted-foreground">{t('offers.whiteLabel.description')}</P>
              <UL className="space-y-2">
                {features.map(feature => (
                  <LI key={feature} className="flex items-start gap-3 text-sm">
                    <Icon
                      name="lucide:Check"
                      className="w-5 h-5 text-gp-primary flex-shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <Span>{feature}</Span>
                  </LI>
                ))}
              </UL>
            </Div>
            <Div className="flex flex-col justify-between gap-6">
              <AudienceList
                label={t('offers.openTo')}
                items={t.raw('offers.whiteLabel.audience') as string[]}
              />
              <ContactButton topic="white-label" className="bg-gp-primary hover:bg-gp-primary/80">
                {t('offers.whiteLabel.cta')}
              </ContactButton>
            </Div>
          </Div>
        </Card>

        <H3 size="h5" className="text-center text-muted-foreground mt-12 mb-6">
          {t('offers.otherOptions')}
        </H3>

        <Div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          <Card>
            <CardHeader>
              <H3 size="h5">{t('offers.direct.title')}</H3>
              <P className="text-sm text-muted-foreground">{t('offers.direct.description')}</P>
            </CardHeader>
            <CardContent className="space-y-4">
              {plans.map(plan => (
                <Div key={plan.name}>
                  <P className="text-sm font-semibold">
                    {plan.name} <Span className="text-muted-foreground">({plan.status})</Span>
                  </P>
                  <P className="text-sm text-muted-foreground">{plan.description}</P>
                  {plan.requestAccess && (
                    <ContactButton topic="pro" variant="outline" size="sm" className="mt-2">
                      {t('offers.direct.proCta')}
                    </ContactButton>
                  )}
                </Div>
              ))}
              <AudienceList
                label={t('offers.openTo')}
                items={t.raw('offers.direct.audience') as string[]}
              />
              <Button asChild className="w-full bg-gp-primary hover:bg-gp-primary/80">
                <Link href="/chat" target="_blank" rel="noopener noreferrer">
                  {t('offers.direct.cta')}
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <H3 size="h5">{t('offers.ecosystem.title')}</H3>
              <P className="text-sm text-muted-foreground">{t('offers.ecosystem.description')}</P>
            </CardHeader>
            <CardContent className="space-y-4">
              <UL className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                {ecosystemItems.map(item => (
                  <LI key={item}>{item}</LI>
                ))}
              </UL>
              <AudienceList
                label={t('offers.openTo')}
                items={t.raw('offers.ecosystem.audience') as string[]}
              />
              <ContactButton topic="integrations" variant="outline" className="w-full">
                {t('offers.ecosystem.cta')}
              </ContactButton>
            </CardContent>
          </Card>
        </Div>
      </Div>
    </Section>
  )
}
