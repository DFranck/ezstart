import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Div,
  H1,
  H2,
  Icon,
  Main,
  P,
  Section,
} from '@ezstart/ui/components'
import type { Metadata } from 'next'
import { useTranslations } from 'next-intl'

const SUPPORT_EMAIL = 'support@ezstart.xyz'
const GITHUB_ISSUES_URL = 'https://github.com/DFranck/ezstart/issues'

export const metadata: Metadata = {
  title: 'Contact us',
  description: 'Contact EZStart by email at support@ezstart.xyz or open an issue on GitHub.',
  robots: { index: true, follow: true },
}

export default function ContactPage() {
  const t = useTranslations('contact')

  return (
    <Main withHeaderOffset>
      <Section className="space-y-12 max-w-4xl mx-auto px-4 py-12">
        <Div className="text-center space-y-4 max-w-3xl mx-auto">
          <H1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t('title')}</H1>
          <P className="text-base text-muted-foreground sm:text-lg">{t('leadBody')}</P>
        </Div>

        <Div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Div className="flex items-center gap-2">
                <Icon name="lucide:Mail" className="h-5 w-5 text-primary" />
                <H2 size="h3">{t('emailLabel')}</H2>
              </Div>
            </CardHeader>
            <CardContent className="space-y-4">
              <P className="text-muted-foreground">{SUPPORT_EMAIL}</P>
              <Button asChild variant="default">
                {/* eslint-disable-next-line @ezstart/ezstart/no-raw-html -- mailto: external URL */}
                <a href={`mailto:${SUPPORT_EMAIL}`}>{t('emailCta')}</a>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Div className="flex items-center gap-2">
                <Icon name="lucide:Github" className="h-5 w-5 text-primary" />
                <H2 size="h3">{t('githubLabel')}</H2>
              </Div>
            </CardHeader>
            <CardContent className="space-y-4">
              <P className="text-muted-foreground">github.com/DFranck/ezstart</P>
              <Button asChild variant="outline">
                {/* eslint-disable-next-line @ezstart/ezstart/no-raw-html -- external URL: next/link is for internal routes only */}
                <a href={GITHUB_ISSUES_URL} target="_blank" rel="noopener noreferrer">
                  {t('githubCta')}
                </a>
              </Button>
            </CardContent>
          </Card>
        </Div>
      </Section>
    </Main>
  )
}
