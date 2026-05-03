import {
  Badge,
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
  title: 'Terms of Service',
  description:
    'EZStart terms of service: acceptable use, account responsibilities, and limitations.',
  robots: { index: true, follow: true },
}

export default function TermsPage() {
  const t = useTranslations('terms')

  return (
    <Main withHeaderOffset>
      <Section className="space-y-8 max-w-3xl mx-auto px-4 py-12">
        <Div className="text-center space-y-4">
          <H1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t('title')}</H1>
          <Badge variant="outline">
            {t('lastUpdatedLabel')}: {t('lastUpdatedValue')}
          </Badge>
        </Div>

        <Card>
          <CardHeader>
            <H2 size="h3">{t('summaryHeading')}</H2>
          </CardHeader>
          <CardContent>
            <P className="text-muted-foreground">{t('summaryBody')}</P>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <H2 size="h3">{t('useHeading')}</H2>
          </CardHeader>
          <CardContent>
            <P className="text-muted-foreground">{t('useBody')}</P>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <H2 size="h3">{t('contactHeading')}</H2>
          </CardHeader>
          <CardContent className="space-y-4">
            <P className="text-muted-foreground">{t('contactBody')}</P>
            <Button asChild variant="outline">
              {/* eslint-disable-next-line @ezstart/ezstart/no-raw-html -- internal route, locale auto-prepended by middleware */}
              <a href="/contact">{t('contactCta')}</a>
            </Button>
          </CardContent>
        </Card>
      </Section>
    </Main>
  )
}
