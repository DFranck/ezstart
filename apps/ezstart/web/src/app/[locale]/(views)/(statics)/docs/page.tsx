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

const EZAUTH_DOCS_URL = process.env.NEXT_PUBLIC_EZAUTH_WEB_URL ?? 'https://ezauth.ezstart.xyz'
const EZPAY_DOCS_URL = process.env.NEXT_PUBLIC_EZPAY_WEB_URL ?? 'https://ezpay.ezstart.xyz'
const GITHUB_URL = 'https://github.com/DFranck/ezstart'

export const metadata: Metadata = {
  title: 'Documentation',
  description:
    'EZStart platform documentation: SDK quickstarts, API references, and integration guides for EZAuth, EZPay, and @ezstart/ui.',
  robots: { index: true, follow: true },
}

export default function DocsPage() {
  const t = useTranslations('docs')

  return (
    <Main withHeaderOffset>
      <Section className="space-y-12 max-w-6xl mx-auto px-4 py-12">
        <Div className="text-center space-y-4 max-w-3xl mx-auto">
          <H1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t('title')}</H1>
          <P className="text-lg text-muted-foreground">{t('lead')}</P>
        </Div>

        <Div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Div className="flex items-center gap-2">
                <Icon name="lucide:Shield" className="h-5 w-5 text-primary" />
                <H2 size="h3">{t('ezauthHeading')}</H2>
              </Div>
            </CardHeader>
            <CardContent className="space-y-4">
              <P className="text-muted-foreground">{t('ezauthBody')}</P>
              <Button asChild variant="default">
                {/* eslint-disable-next-line @ezstart/ezstart/no-raw-html -- external app URL */}
                <a href={`${EZAUTH_DOCS_URL}/docs`} target="_blank" rel="noopener noreferrer">
                  {t('ezauthCta')}
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Div className="flex items-center gap-2">
                <Icon name="lucide:CreditCard" className="h-5 w-5 text-primary" />
                <H2 size="h3">{t('ezpayHeading')}</H2>
              </Div>
            </CardHeader>
            <CardContent className="space-y-4">
              <P className="text-muted-foreground">{t('ezpayBody')}</P>
              <Button asChild variant="default">
                {/* eslint-disable-next-line @ezstart/ezstart/no-raw-html -- external app URL */}
                <a href={`${EZPAY_DOCS_URL}/docs`} target="_blank" rel="noopener noreferrer">
                  {t('ezpayCta')}
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Div className="flex items-center gap-2">
                <Icon name="lucide:Palette" className="h-5 w-5 text-primary" />
                <H2 size="h3">{t('uiHeading')}</H2>
              </Div>
            </CardHeader>
            <CardContent className="space-y-4">
              <P className="text-muted-foreground">{t('uiBody')}</P>
              <Button asChild variant="outline">
                {/* eslint-disable-next-line @ezstart/ezstart/no-raw-html -- internal route uses Link in client; here static */}
                <a href="/packages/ui/inspector">{t('uiCta')}</a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Div className="flex items-center gap-2">
                <Icon name="lucide:Github" className="h-5 w-5 text-primary" />
                <H2 size="h3">{t('githubHeading')}</H2>
              </Div>
            </CardHeader>
            <CardContent className="space-y-4">
              <P className="text-muted-foreground">{t('githubBody')}</P>
              <Button asChild variant="outline">
                {/* eslint-disable-next-line @ezstart/ezstart/no-raw-html -- external URL */}
                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
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
