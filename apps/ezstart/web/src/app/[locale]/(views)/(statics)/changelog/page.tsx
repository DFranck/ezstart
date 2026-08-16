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

const GITHUB_RELEASES_URL = 'https://github.com/DFranck/ezstart/releases'

export const metadata: Metadata = {
  title: 'Changelog',
  description: 'Notable changes to the EZStart platform, in reverse chronological order.',
  robots: { index: true, follow: true },
}

export default function ChangelogPage() {
  const t = useTranslations('changelog')

  return (
    <Main withHeaderOffset>
      <Section className="space-y-8 max-w-3xl mx-auto px-4 py-12">
        <Div className="text-center space-y-4">
          <H1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t('title')}</H1>
          <P className="text-base text-muted-foreground sm:text-lg">{t('subtitle')}</P>
        </Div>

        <Card>
          <CardHeader>
            <Div className="flex flex-wrap items-center justify-between gap-2">
              <H2 size="h3">{t('v01Title')}</H2>
              <Badge variant="secondary">{t('v01Date')}</Badge>
            </Div>
          </CardHeader>
          <CardContent>
            <P className="text-muted-foreground">{t('v01Body')}</P>
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
      </Section>
    </Main>
  )
}
