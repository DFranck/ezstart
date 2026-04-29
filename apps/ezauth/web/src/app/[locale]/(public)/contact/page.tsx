import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Div,
  H1,
  H2,
  Icon,
  LandingSection,
  Main,
  P,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

const SUPPORT_EMAIL = 'franckdufournet@hotmail.fr'
const GITHUB_ISSUES_URL = 'https://github.com/DFranck/ezstart/issues'

export default function ContactPage() {
  const t = useTranslations('contact')

  return (
    <Main className="flex-1">
      <LandingSection align="center">
        <Div className="mx-auto max-w-3xl space-y-4">
          <H1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t('title')}</H1>
          <P className="text-base text-muted-foreground sm:text-lg">{t('leadBody')}</P>
        </Div>
      </LandingSection>

      <LandingSection>
        <Div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
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
      </LandingSection>
    </Main>
  )
}
