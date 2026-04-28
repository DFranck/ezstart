'use client'

import { Link } from '@/i18n/navigation'
import { RegisterButton, useAuth } from '@ezstart/auth-sdk'
import { PricingPage } from '@ezstart/pay-sdk/components'
import type { KnownIconName } from '@ezstart/ui/components'
import {
  Button,
  CodeBlock,
  CTA,
  Div,
  FeatureGrid,
  H2,
  HowItWorksSteps,
  Icon,
  LandingHero,
  LandingSection,
  P,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

const EZAUTH_APP_ID = process.env.NEXT_PUBLIC_EZAUTH_APP_ID

// ---------------------------------------------------------------------------
// Static data (icons, code snippets) — keys come from i18n
// ---------------------------------------------------------------------------

const FEATURE_KEYS = ['Sso', 'ApiKeys', 'Oauth', '2fa', 'Rbac', 'Security'] as const

const FEATURE_ICONS: Record<(typeof FEATURE_KEYS)[number], KnownIconName> = {
  Sso: 'lucide:Fingerprint',
  ApiKeys: 'lucide:Key',
  Oauth: 'lucide:Globe',
  '2fa': 'lucide:ShieldCheck',
  Rbac: 'lucide:Users',
  Security: 'lucide:Lock',
}

const STEP_ICONS: KnownIconName[] = ['lucide:Download', 'lucide:Code', 'lucide:Sparkles']

const CODE_INSTALL = `npm install @ezstart/auth-sdk`

const CODE_SETUP = `import { AuthProvider } from '@ezstart/auth-sdk'

export default function App({ children }) {
  return (
    <AuthProvider appName="myapp">
      {children}
    </AuthProvider>
  )
}`

const CODE_USE = `import { useAuth } from '@ezstart/auth-sdk'

function Dashboard() {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <LoginButton />
  }

  return <h1>Welcome, {user.email}</h1>
}`

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HomePage() {
  const t = useTranslations('home')
  const { isAuthenticated } = useAuth()

  const features = FEATURE_KEYS.map(key => ({
    icon: <Icon name={FEATURE_ICONS[key]} className="h-6 w-6 text-primary" />,
    title: t(`feature${key}`),
    description: t(`feature${key}Desc`),
  }))

  const steps = STEP_ICONS.map((icon, index) => ({
    step: String(index + 1),
    icon,
    title: t(`howItWorksStep${index + 1}Title`),
    description: t(`howItWorksStep${index + 1}Desc`),
  }))

  const primaryCTA = isAuthenticated ? (
    <Button asChild size="lg" className="text-base px-8 py-6">
      <Link href="/dashboard">{t('heroCtaDashboard')}</Link>
    </Button>
  ) : (
    <RegisterButton size="lg" alwaysShowText className="text-base px-8 py-6">
      {t('heroCta')}
    </RegisterButton>
  )

  const secondaryCTA = (
    <Button asChild size="lg" variant="outline" className="text-base px-8 py-6">
      <Link href="/docs">{t('heroCtaSecondary')}</Link>
    </Button>
  )

  const ctaBannerCTA = isAuthenticated ? (
    <Button asChild size="lg" className="text-base px-8 py-6">
      <Link href="/dashboard">{t('heroCtaDashboard')}</Link>
    </Button>
  ) : (
    <RegisterButton size="lg" alwaysShowText className="text-base px-8 py-6">
      {t('ctaCta')}
    </RegisterButton>
  )

  return (
    <>
      <LandingHero
        variant="full"
        align="center"
        badge={t('heroBadge')}
        title={t('heroTitle')}
        description={t('heroSubtitle')}
        primaryCTASlot={primaryCTA}
        secondaryCTASlot={secondaryCTA}
        backgroundSlot={
          <>
            {/* Layer 1 — diagonal gradient using tenant `--primary` via Tailwind
                semantic tokens (handles `/N` opacity for oklch automatically). */}
            <Div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-background to-accent/15" />
            {/* Layer 2 — soft top highlight using primary tint for depth */}
            <Div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-primary/10 to-transparent" />
            {/* Layer 3 — subtle dotted grid for tactile depth (Linear style).
                Currentcolor inherits `text-foreground`, so it auto-flips for
                light/dark mode. */}
            <Div
              aria-hidden
              className="absolute inset-0 opacity-[0.15] [background-image:radial-gradient(circle,currentColor_1px,transparent_1px)] [background-size:24px_24px] text-foreground"
            />
            {/* Layer 4 — bottom vignette for smooth hero-to-section transition */}
            <Div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-b from-transparent to-background" />
          </>
        }
      />

      <LandingSection
        id="features"
        variant="muted"
        align="center"
        title={t('featuresSectionTitle')}
        subtitle={t('featuresSectionSubtitle')}
      >
        <FeatureGrid features={features} columns={3} />
      </LandingSection>

      <LandingSection align="center" title={t('howItWorksSectionTitle')}>
        <HowItWorksSteps steps={steps} />
      </LandingSection>

      <LandingSection
        align="center"
        title={t('codeSectionTitle')}
        subtitle={t('codeSectionSubtitle')}
      >
        <Div className="mx-auto grid w-full min-w-0 max-w-4xl gap-6">
          <CodeBlock label={t('codeInstallLabel')} code={CODE_INSTALL} />
          <CodeBlock label={t('codeSetupLabel')} code={CODE_SETUP} />
          <CodeBlock label={t('codeUseLabel')} code={CODE_USE} />
        </Div>
      </LandingSection>

      <LandingSection id="pricing" align="center">
        {EZAUTH_APP_ID ? (
          <PricingPage
            applicationId={EZAUTH_APP_ID}
            texts={{
              title: t('pricingSectionTitle'),
              subtitle: t('pricingSectionSubtitle'),
            }}
          />
        ) : (
          <Div className="py-8">
            <H2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t('pricingSectionTitle')}
            </H2>
            <P className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              {t('pricingSectionSubtitle')}
            </P>
          </Div>
        )}
      </LandingSection>

      <LandingSection align="center">
        <CTA
          variant="centered"
          intent="primary"
          title={t('ctaTitle')}
          description={t('ctaSubtitle')}
          primaryCTASlot={ctaBannerCTA}
        />
      </LandingSection>
    </>
  )
}
