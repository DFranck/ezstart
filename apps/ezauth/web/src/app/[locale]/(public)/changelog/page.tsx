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

const GITHUB_RELEASES_URL = 'https://github.com/DFranck/ezstart/releases'

export default function ChangelogPage() {
  const t = useTranslations('changelog')

  return (
    <Main className="flex-1">
      <LandingSection align="center">
        <Div className="mx-auto max-w-3xl space-y-4">
          <H1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t('title')}</H1>
          <P className="text-base text-muted-foreground sm:text-lg">{t('subtitle')}</P>
        </Div>
      </LandingSection>

      <LandingSection>
        <Div className="mx-auto max-w-3xl space-y-6">
          <Card>
            <CardHeader>
              <Div className="flex flex-wrap items-center justify-between gap-2">
                <H2 size="h3">{t('entries.v01Title')}</H2>
                <Badge variant="secondary">{t('entries.v01Date')}</Badge>
              </Div>
            </CardHeader>
            <CardContent>
              <P className="text-muted-foreground">{t('entries.v01Body')}</P>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <H2 size="h3">{t('githubLabel')}</H2>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                {/* eslint-disable-next-line @ezstart/ezstart/no-raw-html -- external URL: next/link is for internal routes only */}
                <a href={GITHUB_RELEASES_URL} target="_blank" rel="noopener noreferrer">
                  {t('githubCta')}
                </a>
              </Button>
            </CardContent>
          </Card>
        </Div>
      </LandingSection>
    </Main>
  )
}
