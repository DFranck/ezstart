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

const GITHUB_URL = 'https://github.com/DFranck/ezstart'

export const metadata: Metadata = {
  title: 'Blog',
  description: 'EZStart blog: engineering notes, product updates, and platform announcements.',
  robots: { index: true, follow: true },
}

export default function BlogPage() {
  const t = useTranslations('blog')

  return (
    <Main withHeaderOffset>
      <Section className="space-y-12 max-w-3xl mx-auto px-4 py-12">
        <Div className="text-center space-y-4">
          <H1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t('title')}</H1>
          <P className="text-xl text-muted-foreground">{t('leadHeading')}</P>
          <P className="text-base text-muted-foreground">{t('leadBody')}</P>
        </Div>

        <Card>
          <CardHeader>
            <H2 size="h3">{t('subscribeHeading')}</H2>
          </CardHeader>
          <CardContent className="space-y-4">
            <P className="text-muted-foreground">{t('subscribeBody')}</P>
            <Button asChild variant="outline">
              {/* eslint-disable-next-line @ezstart/ezstart/no-raw-html -- external URL: next/link is for internal routes only */}
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                {t('subscribeCta')}
              </a>
            </Button>
          </CardContent>
        </Card>
      </Section>
    </Main>
  )
}
