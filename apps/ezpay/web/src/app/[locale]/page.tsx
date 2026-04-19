'use client'

import { useAuth } from '@ezstart/auth-sdk'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Code,
  Div,
  H1,
  H2,
  H3,
  Icon,
  LandingHeroSection,
  LandingSection,
  P,
  Pre,
} from '@ezstart/ui/components'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Features data (icons are lucide names)
// ---------------------------------------------------------------------------
const FEATURES = [
  { key: 'Donations', icon: 'lucide:Heart' as const },
  { key: 'Purchases', icon: 'lucide:ShoppingCart' as const },
  { key: 'Subscriptions', icon: 'lucide:RefreshCw' as const },
  { key: 'StripeConnect', icon: 'lucide:CreditCard' as const },
  { key: 'PromoCodes', icon: 'lucide:Ticket' as const },
  { key: 'Webhooks', icon: 'lucide:Webhook' as const },
] as const

// ---------------------------------------------------------------------------
// Steps data
// ---------------------------------------------------------------------------
const STEPS = [
  { key: 'Step1', icon: 'lucide:Download' as const, step: '1' },
  { key: 'Step2', icon: 'lucide:Code' as const, step: '2' },
  { key: 'Step3', icon: 'lucide:Sparkles' as const, step: '3' },
] as const

// ---------------------------------------------------------------------------
// Code snippets (static, no i18n needed)
// ---------------------------------------------------------------------------
const CODE_INSTALL = `npm install @ezstart/pay-sdk`

const CODE_SETUP = `import { PayProvider } from '@ezstart/pay-sdk'

export default function App({ children }) {
  return (
    <PayProvider appName="myapp">
      {children}
    </PayProvider>
  )
}`

const CODE_USE = `import { DonateModal, PurchaseButton } from '@ezstart/pay-sdk'

function Shop() {
  return (
    <>
      <DonateModal />
      <PurchaseButton
        productId="premium-pass"
        amount={9.99}
      />
    </>
  )
}`

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HomePage() {
  const t = useTranslations('home')
  const { isAuthenticated } = useAuth()
  const locale = useLocale()

  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                             */}
      {/* ---------------------------------------------------------------- */}
      <LandingHeroSection>
        <Badge variant="outline" className="mb-6">
          <Icon name="lucide:Zap" className="mr-1 h-3 w-3" />
          Payments as a Service
        </Badge>

        <H1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
          {t('heroTitle')}
        </H1>

        <P className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          {t('heroSubtitle')}
        </P>

        <Div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          {isAuthenticated ? (
            <Button asChild size="lg">
              <Link href={`/${locale}/developer`}>{t('heroCtaDashboard')}</Link>
            </Button>
          ) : (
            <Button asChild size="lg">
              <Link href="/register">{t('heroCta')}</Link>
            </Button>
          )}
          <Button asChild variant="outline" size="lg">
            <Link href="/docs">{t('heroCtaSecondary')}</Link>
          </Button>
        </Div>

        {/* Hero code preview */}
        <Div className="mx-auto mt-12 max-w-lg">
          <Pre className="overflow-x-auto rounded-lg border bg-card p-4 text-left text-sm">
            <Code className="text-foreground">{`import { PayProvider } from '@ezstart/pay-sdk'

<PayProvider appName="myapp">
  <App />
</PayProvider>`}</Code>
          </Pre>
        </Div>
      </LandingHeroSection>

      {/* ---------------------------------------------------------------- */}
      {/* Features                                                         */}
      {/* ---------------------------------------------------------------- */}
      <LandingSection id="features" variant="muted" align="center">
        <Div className="mb-12">
          <H2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t('featuresSectionTitle')}
          </H2>
          <P className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            {t('featuresSectionSubtitle')}
          </P>
        </Div>

        <Div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ key, icon }) => (
            <Card key={key} className="text-left transition-shadow hover:shadow-md">
              <CardHeader>
                <Div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon name={icon} className="h-5 w-5 text-primary" />
                </Div>
                <H3 className="text-lg font-semibold">{t(`feature${key}`)}</H3>
              </CardHeader>
              <CardContent>
                <P className="text-sm text-muted-foreground">{t(`feature${key}Desc`)}</P>
              </CardContent>
            </Card>
          ))}
        </Div>
      </LandingSection>

      {/* ---------------------------------------------------------------- */}
      {/* How it works                                                     */}
      {/* ---------------------------------------------------------------- */}
      <LandingSection align="center">
        <Div className="mb-12">
          <H2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t('howItWorksSectionTitle')}
          </H2>
        </Div>

        <Div className="grid gap-8 sm:grid-cols-3">
          {STEPS.map(({ key, icon, step }) => (
            <Div key={key} className="flex flex-col items-center gap-4">
              <Div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold">
                {step}
              </Div>
              <Div className="flex items-center gap-2">
                <Icon name={icon} className="h-5 w-5 text-primary" />
                <H3 className="text-lg font-semibold">{t(`howItWorks${key}Title`)}</H3>
              </Div>
              <P className="max-w-xs text-sm text-muted-foreground">
                {t(`howItWorks${key}Desc`)}
              </P>
            </Div>
          ))}
        </Div>
      </LandingSection>

      {/* ---------------------------------------------------------------- */}
      {/* Code examples                                                    */}
      {/* ---------------------------------------------------------------- */}
      <LandingSection variant="muted" align="center">
        <Div className="mb-12">
          <H2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t('codeSectionTitle')}
          </H2>
          <P className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            {t('codeSectionSubtitle')}
          </P>
        </Div>

        <Div className="mx-auto grid max-w-4xl gap-6 text-left">
          {/* Install */}
          <Div>
            <Div className="mb-2 flex items-center gap-2">
              <Badge variant="secondary">{t('codeInstallLabel')}</Badge>
            </Div>
            <Pre className="overflow-x-auto rounded-lg border bg-card p-4 text-sm">
              <Code className="text-foreground">{CODE_INSTALL}</Code>
            </Pre>
          </Div>

          {/* Setup */}
          <Div>
            <Div className="mb-2 flex items-center gap-2">
              <Badge variant="secondary">{t('codeSetupLabel')}</Badge>
            </Div>
            <Pre className="overflow-x-auto rounded-lg border bg-card p-4 text-sm">
              <Code className="text-foreground">{CODE_SETUP}</Code>
            </Pre>
          </Div>

          {/* Use */}
          <Div>
            <Div className="mb-2 flex items-center gap-2">
              <Badge variant="secondary">{t('codeUseLabel')}</Badge>
            </Div>
            <Pre className="overflow-x-auto rounded-lg border bg-card p-4 text-sm">
              <Code className="text-foreground">{CODE_USE}</Code>
            </Pre>
          </Div>
        </Div>
      </LandingSection>

      {/* ---------------------------------------------------------------- */}
      {/* Pricing                                                          */}
      {/* ---------------------------------------------------------------- */}
      <LandingSection id="pricing" align="center">
        <Div className="py-8">
          <H2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t('pricingSectionTitle')}
          </H2>
          <P className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            {t('pricingSectionSubtitle')}
          </P>
        </Div>
      </LandingSection>

      {/* ---------------------------------------------------------------- */}
      {/* CTA Banner                                                       */}
      {/* ---------------------------------------------------------------- */}
      <LandingSection variant="accent" align="center">
        <Div className="py-8">
          <H2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t('ctaTitle')}
          </H2>
          <P className="mx-auto mt-4 max-w-xl text-muted-foreground">
            {t('ctaSubtitle')}
          </P>
          <Div className="mt-8">
            {isAuthenticated ? (
              <Button asChild size="lg">
                <Link href={`/${locale}/developer`}>{t('heroCtaDashboard')}</Link>
              </Button>
            ) : (
              <Button asChild size="lg">
                <Link href="/register">{t('ctaCta')}</Link>
              </Button>
            )}
          </Div>
        </Div>
      </LandingSection>
    </>
  )
}
