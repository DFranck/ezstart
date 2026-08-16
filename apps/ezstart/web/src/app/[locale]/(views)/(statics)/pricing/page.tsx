import { getServerKeyConfig } from '@ezstart/auth-sdk/server'
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
import { getTranslations } from 'next-intl/server'

const GITHUB_URL = 'https://github.com/DFranck/ezstart'
// Canonical production fallbacks used when neither `/keys/config` nor a
// publishable key is configured. Keeps the landing renderable on a fresh
// `pnpm dev ezstart` without requiring any env wiring.
const EZAUTH_WEB_FALLBACK = 'https://ezauth.ezstart.xyz'
const EZPAY_WEB_FALLBACK = 'https://ezpay.ezstart.xyz'

export const metadata: Metadata = {
  title: 'Platform pricing',
  description:
    'EZStart is the open-source platform hub. Pricing for the SaaS services it powers (EZAuth, EZPay) is defined in each service.',
  robots: { index: true, follow: true },
}

/**
 * Phase A1 ENV-DIET (2026-05-05) — `EZAUTH_WEB_URL` is resolved server-side
 * via the new {@link getServerKeyConfig} helper. The publishable key
 * (`NEXT_PUBLIC_EZAUTH_KEY`) becomes the single source of truth for the
 * EZAuth dashboard URL — same Stripe / Clerk pattern as the client SDK.
 * Falls back to the canonical prod host when no key is configured.
 *
 * `EZPAY_WEB_URL` is NOT resolvable from `/keys/config` (that endpoint
 * lives on the EZPay API and would require its own publishable key); we
 * still rely on the canonical production fallback for now. A future Phase
 * A2 can introduce `getServerPayKeyConfig` from `@ezstart/pay-sdk/server`.
 */
export default async function PricingPage() {
  const t = await getTranslations('pricing')

  const ezauthKeyConfig = await getServerKeyConfig({
    publishableKey: process.env.NEXT_PUBLIC_EZAUTH_KEY,
  })
  const ezauthWebUrl = ezauthKeyConfig?.webUrl ?? EZAUTH_WEB_FALLBACK
  const ezpayWebUrl = EZPAY_WEB_FALLBACK

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
                <a href={`${ezauthWebUrl}/pricing`} target="_blank" rel="noopener noreferrer">
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
                <a href={`${ezpayWebUrl}/pricing`} target="_blank" rel="noopener noreferrer">
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
