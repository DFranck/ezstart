import {
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

export default function AboutPage() {
  const t = useTranslations('about')

  return (
    <Main className="flex-1">
      <LandingSection align="center">
        <Div className="mx-auto max-w-3xl space-y-4">
          <H1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t('title')}</H1>
          <P className="text-xl text-muted-foreground">{t('leadHeading')}</P>
          <P className="text-base text-muted-foreground">{t('leadBody')}</P>
        </Div>
      </LandingSection>

      <LandingSection variant="muted">
        <Div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
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
              <H2 size="h3">{t('techHeading')}</H2>
            </CardHeader>
            <CardContent>
              <P className="text-muted-foreground">{t('techBody')}</P>
            </CardContent>
          </Card>
        </Div>
      </LandingSection>

      <LandingSection align="center" title={t('ctaHeading')} subtitle={t('ctaBody')}>
        <Div className="flex flex-wrap justify-center gap-3">
          <Button asChild variant="default" size="lg">
            <Link href="/docs">{t('ctaDocs')}</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/contact">{t('ctaContact')}</Link>
          </Button>
        </Div>
      </LandingSection>
    </Main>
  )
}
