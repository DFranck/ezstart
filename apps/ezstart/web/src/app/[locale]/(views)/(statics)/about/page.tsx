import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Div,
  H1,
  H2,
  Main,
  P,
  Section,
} from '@ezstart/ui/components'
import type { Metadata } from 'next'
import { useTranslations } from 'next-intl'

export const metadata: Metadata = {
  title: 'About EZStart',
  description:
    'EZStart is a TypeScript monorepo and platform hub powering EZAuth, EZPay, and a portfolio of consumer applications. All open source under MIT.',
  robots: { index: true, follow: true },
}

export default function AboutPage() {
  const t = useTranslations('about')

  return (
    <Main withHeaderOffset>
      <Section className="space-y-12 max-w-5xl mx-auto px-4 py-12">
        <Div className="text-center space-y-4 max-w-3xl mx-auto">
          <H1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t('title')}</H1>
          <P className="text-xl text-muted-foreground">{t('leadHeading')}</P>
          <P className="text-base text-muted-foreground">{t('leadBody')}</P>
        </Div>

        <Div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <H2 size="h3">{t('missionHeading')}</H2>
            </CardHeader>
            <CardContent>
              <P className="text-muted-foreground">{t('missionBody')}</P>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <H2 size="h3">{t('platformHeading')}</H2>
            </CardHeader>
            <CardContent>
              <P className="text-muted-foreground">{t('platformBody')}</P>
            </CardContent>
          </Card>
        </Div>

        <Div className="text-center space-y-4 max-w-2xl mx-auto">
          <H2 size="h3">{t('ctaHeading')}</H2>
          <P className="text-muted-foreground">{t('ctaBody')}</P>
          <Div className="flex flex-wrap justify-center gap-3">
            <Button asChild variant="default" size="lg">
              {/* eslint-disable-next-line @ezstart/ezstart/no-raw-html -- internal route, locale auto-prepended by middleware */}
              <a href="/docs">{t('ctaDocs')}</a>
            </Button>
            <Button asChild variant="outline" size="lg">
              {/* eslint-disable-next-line @ezstart/ezstart/no-raw-html -- internal route, locale auto-prepended by middleware */}
              <a href="/contact">{t('ctaContact')}</a>
            </Button>
          </Div>
        </Div>
      </Section>
    </Main>
  )
}
