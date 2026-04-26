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
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

export default function PrivacyPage() {
  const t = useTranslations('privacy')

  return (
    <Main className="flex-1">
      <LandingSection align="center">
        <Div className="mx-auto max-w-3xl space-y-4">
          <H1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t('title')}</H1>
          <Badge variant="outline">
            {t('lastUpdatedLabel')}: {t('lastUpdatedValue')}
          </Badge>
        </Div>
      </LandingSection>

      <LandingSection>
        <Div className="mx-auto max-w-3xl space-y-6">
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
                <Link href="/contact">{t('contactCta')}</Link>
              </Button>
            </CardContent>
          </Card>
        </Div>
      </LandingSection>
    </Main>
  )
}
