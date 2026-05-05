import { getServerKeyConfig } from '@ezstart/auth-sdk/server'
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
import { getTranslations } from 'next-intl/server'

const GITHUB_URL = 'https://github.com/DFranck/ezstart'
// Canonical production fallbacks used when neither `/keys/config` nor a
// publishable key is configured. Keeps the docs page renderable on a fresh
// `pnpm dev ezstart` without requiring any env wiring.
const EZAUTH_WEB_FALLBACK = 'https://ezauth.ezstart.xyz'
const EZPAY_WEB_FALLBACK = 'https://ezpay.ezstart.xyz'

export const metadata: Metadata = {
  title: 'Documentation',
  description:
    'EZStart platform documentation: SDK quickstarts, API references, and integration guides for EZAuth, EZPay, and @ezstart/ui.',
  robots: { index: true, follow: true },
}

/**
 * Phase A1 ENV-DIET (2026-05-05) — `EZAUTH_DOCS_URL` is resolved server-side
 * via the new {@link getServerKeyConfig} helper. The publishable key
 * (`NEXT_PUBLIC_EZAUTH_KEY`) becomes the single source of truth for the
 * EZAuth dashboard URL — same Stripe / Clerk pattern as the client SDK.
 * Falls back to the canonical prod host when no key is configured.
 *
 * `EZPAY_DOCS_URL` is NOT resolvable from `/keys/config` (that endpoint
 * lives on the EZPay API and would require its own publishable key); we
 * still rely on the canonical production fallback for now.
 */
export default async function DocsPage() {
  const t = await getTranslations('docs')

  const ezauthKeyConfig = await getServerKeyConfig({
    publishableKey: process.env.NEXT_PUBLIC_EZAUTH_KEY,
  })
  const ezauthDocsUrl = ezauthKeyConfig?.webUrl ?? EZAUTH_WEB_FALLBACK
  const ezpayDocsUrl = EZPAY_WEB_FALLBACK

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
                <a href={`${ezauthDocsUrl}/docs`} target="_blank" rel="noopener noreferrer">
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
                <a href={`${ezpayDocsUrl}/docs`} target="_blank" rel="noopener noreferrer">
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
