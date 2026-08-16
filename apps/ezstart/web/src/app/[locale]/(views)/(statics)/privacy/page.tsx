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
  title: 'Privacy Policy',
  description:
    'EZStart privacy policy: what we collect, how we use it, and how to contact us about your data.',
  robots: { index: true, follow: true },
}

export default function PrivacyPage() {
  const t = useTranslations('privacy')

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
            <H2 size="h3">{t('scopeHeading')}</H2>
          </CardHeader>
          <CardContent>
            <P className="text-muted-foreground">{t('scopeBody')}</P>
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
