import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Div,
  H1,
  H2,
  LandingSection,
  Main,
  P,
} from '@ezstart/ui/components'
import type { Metadata } from 'next'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

export const metadata: Metadata = {
  title: 'Legal Notices',
  description:
    'EZAuth legal notices: company information, hosting provider, intellectual property, and contact details required by EU/French law.',
  robots: { index: true, follow: true },
}

export default function LegalNoticesPage() {
  const t = useTranslations('legalNotices')

  return (
    <Main className="flex-1">
      <LandingSection align="center">
        <Div className="mx-auto max-w-3xl space-y-4">
          <H1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t('title')}</H1>
          <Badge variant="outline">
            {t('lastUpdatedLabel')}: {t('lastUpdatedValue')}
          </Badge>
          <P className="text-base text-muted-foreground sm:text-lg">{t('lead')}</P>
        </Div>
      </LandingSection>

      <LandingSection>
        <Div className="mx-auto max-w-3xl space-y-6">
          <Card>
            <CardHeader>
              <H2 size="h3">{t('publisherHeading')}</H2>
            </CardHeader>
            <CardContent>
              <P className="text-muted-foreground">{t('publisherBody')}</P>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <H2 size="h3">{t('hostingHeading')}</H2>
            </CardHeader>
            <CardContent>
              <P className="text-muted-foreground">{t('hostingBody')}</P>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <H2 size="h3">{t('ipHeading')}</H2>
            </CardHeader>
            <CardContent>
              <P className="text-muted-foreground">{t('ipBody')}</P>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <H2 size="h3">{t('contactHeading')}</H2>
            </CardHeader>
            <CardContent className="space-y-4">
              <P className="text-muted-foreground">{t('contactBody')}</P>
              <Button asChild variant="outline">
                <Link href="/contact">{t('contactCta')}</Link>
              </Button>
            </CardContent>
          </Card>
        </Div>
      </LandingSection>
    </Main>
  )
}
