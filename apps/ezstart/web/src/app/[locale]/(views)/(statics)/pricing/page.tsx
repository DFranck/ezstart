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

const EZAUTH_WEB_URL = process.env.NEXT_PUBLIC_EZAUTH_WEB_URL ?? 'https://ezauth.ezstart.xyz'
const EZPAY_WEB_URL = process.env.NEXT_PUBLIC_EZPAY_WEB_URL ?? 'https://ezpay.ezstart.xyz'
const GITHUB_URL = 'https://github.com/DFranck/ezstart'

export const metadata: Metadata = {
  title: 'Platform pricing',
  description:
    'EZStart is the open-source platform hub. Pricing for the SaaS services it powers (EZAuth, EZPay) is defined in each service.',
  robots: { index: true, follow: true },
}

export default function PricingPage() {
  const t = useTranslations('pricing')

  return (
    <Main withHeaderOffset>
      <Section className="space-y-12 max-w-5xl mx-auto px-4 py-12">
        <Div className="text-center space-y-4 max-w-3xl mx-auto">
          <H1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t('title')}</H1>
          <P className="text-lg text-muted-foreground">{t('lead')}</P>
        </Div>

        <Div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <H2 size="h3">{t('ezauthHeading')}</H2>
            </CardHeader>
            <CardContent className="space-y-4">
              <P className="text-muted-foreground">{t('ezauthBody')}</P>
              <Button asChild variant="default">
                {/* eslint-disable-next-line @ezstart/ezstart/no-raw-html -- external app URL */}
                <a href={`${EZAUTH_WEB_URL}/pricing`} target="_blank" rel="noopener noreferrer">
                  {t('ezauthCta')}
                </a>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <H2 size="h3">{t('ezpayHeading')}</H2>
            </CardHeader>
            <CardContent className="space-y-4">
              <P className="text-muted-foreground">{t('ezpayBody')}</P>
              <Button asChild variant="default">
                {/* eslint-disable-next-line @ezstart/ezstart/no-raw-html -- external app URL */}
                <a href={`${EZPAY_WEB_URL}/pricing`} target="_blank" rel="noopener noreferrer">
                  {t('ezpayCta')}
                </a>
              </Button>
            </CardContent>
          </Card>
        </Div>

        <Card>
          <CardHeader>
            <H2 size="h3">{t('openSourceHeading')}</H2>
          </CardHeader>
          <CardContent className="space-y-4">
            <P className="text-muted-foreground">{t('openSourceBody')}</P>
            <Button asChild variant="outline">
              {/* eslint-disable-next-line @ezstart/ezstart/no-raw-html -- external URL */}
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
            </Button>
          </CardContent>
        </Card>
      </Section>
    </Main>
  )
}
