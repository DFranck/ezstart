'use client'

import { Button, Div, P, Span, Spinner } from '@ezstart/ui/components'
import { Suspense, useState, type ReactNode } from 'react'
import { useAuthNavigation } from '../../react/useAuthNavigation.js'
import { prettifySlug, useKeyConfig } from '../../react/useKeyConfig.js'
import { getAuthTexts } from '../../i18n/index.js'
import { SignUpForm, type SignUpFormProps, type SignUpFormTexts } from '../SignUpForm.js'
import { AuthCardShell, type AuthCardShellProps } from './auth-card-shell.js'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SignUpCardTexts extends Partial<SignUpFormTexts> {
  cardTitle?: string
  cardSubtitleWithApp?: string
  cardSubtitle?: string
  haveAccount?: string
  loginLink?: string
}

export interface SignUpCardProps extends Omit<
  SignUpFormProps,
  'appName' | 'redirectUri' | 'disabled' | 'keyStatus' | 'urlKey'
> {
  /** Pre-resolved app name (SSR) to avoid first-paint brand flash. */
  ssrAppName?: string | null
  /** Pre-resolved Application display name (SSR). */
  ssrAppDisplayName?: string | null
  /** Brand logo shown above the title. */
  logo?: ReactNode
  /** Override the default chrome props. */
  cardShellProps?: Partial<AuthCardShellProps>
  /** Override texts (merged on top of localized defaults). */
  texts?: SignUpCardTexts
}

// ─── Inner content ─────────────────────────────────────────────────────────

function SignUpCardInner({
  ssrAppName = null,
  ssrAppDisplayName = null,
  logo,
  cardShellProps,
  texts,
  locale: propLocale,
  showOAuth = true,
  oauthProviders = ['google'],
  ...formProps
}: SignUpCardProps) {
  const navigation = useAuthNavigation()
  const locale = propLocale ?? navigation.locale
  const formDefaults = getAuthTexts(locale, 'signUp') as Record<string, string>
  const t = {
    ...formDefaults,
    ...(texts as Record<string, string> | undefined),
  } as Required<SignUpCardTexts>
  const formTexts = t as Partial<SignUpFormTexts>

  // Lifted from `<SignUpForm>` so the external submit button (in footer) can
  // mirror loading state.
  const [isSubmitting, setIsSubmitting] = useState(false)
  const keyConfig = useKeyConfig(navigation.publishableKey)
  const app = keyConfig.appName ?? navigation.app ?? ssrAppName ?? 'ezauth'
  const appDisplayName = keyConfig.appDisplayName ?? ssrAppDisplayName ?? prettifySlug(app)
  const isKeyInvalid = keyConfig.status === 'invalid'
  const bannerKeyStatus = navigation.publishableKey
    ? keyConfig.status === 'valid'
      ? ('valid' as const)
      : keyConfig.status === 'invalid'
        ? ('invalid' as const)
        : undefined
    : undefined

  // First-party fallback: default redirect_uri to ezauth's own callback page
  // when the user lands on /register directly (no third-party ?redirect_uri=).
  const resolvedRedirectUri =
    navigation.redirectUri ??
    (typeof window !== 'undefined'
      ? `${window.location.origin}${locale ? `/${locale}` : ''}/auth/callback`
      : undefined)

  const subtitle = appDisplayName ? (
    <>
      {t.cardSubtitleWithApp.split('{app}')[0]}
      <Span className="text-primary font-semibold">{appDisplayName}</Span>
      {t.cardSubtitleWithApp.split('{app}')[1]}
    </>
  ) : (
    t.cardSubtitle
  )

  // External submit button rendered in sticky footer so it stays visible
  // when the (long) registration form scrolls.
  const formId = 'ezstart-signup-form'
  const submitLabel = t.submit ?? 'Sign Up'
  const submittingLabel = t.submitting ?? 'Creating account...'

  const footer = (
    <Div className="w-full flex flex-col gap-3">
      <Button
        type="submit"
        form={formId}
        disabled={isKeyInvalid || isSubmitting}
        className="w-full cursor-pointer"
        variant="default"
      >
        {isSubmitting ? submittingLabel : submitLabel}
      </Button>
      <P size="xs" className="text-center w-full">
        {t.haveAccount}{' '}
        <a
          href={navigation.loginHref}
          className="text-primary font-medium underline-offset-4 hover:underline"
        >
          {t.loginLink}
        </a>
      </P>
    </Div>
  )

  return (
    <AuthCardShell
      subtitle={subtitle}
      footer={footer}
      showBackButton
      logo={logo}
      {...cardShellProps}
    >
      <SignUpForm
        appName={app}
        redirectUri={resolvedRedirectUri}
        showOAuth={showOAuth}
        oauthProviders={oauthProviders}
        disabled={isKeyInvalid}
        keyStatus={bannerKeyStatus}
        urlKey={navigation.publishableKey}
        locale={propLocale ?? locale}
        texts={formTexts}
        formId={formId}
        hideSubmitButton
        onSubmittingChange={setIsSubmitting}
        {...formProps}
      />
    </AuthCardShell>
  )
}

// ─── Public ────────────────────────────────────────────────────────────────

/**
 * Self-contained Sign-Up card — drop-in for any `/register` page.
 *
 * Equivalent to Clerk's `<SignUp />`. Wraps `<SignUpForm>` inside
 * `<AuthCardShell>` with the consumer brand auto-resolved from the `?key=`
 * URL param. Reduces a `/register` page to a single line.
 *
 * @example
 *   // app/[locale]/register/page.tsx
 *   import { SignUpCard } from '@ezstart/auth-sdk/components'
 *   export default function RegisterPage() {
 *     return <SignUpCard />
 *   }
 */
export function SignUpCard(props: SignUpCardProps) {
  return (
    <Suspense fallback={<SignUpCardFallback />}>
      <SignUpCardInner {...props} />
    </Suspense>
  )
}

function SignUpCardFallback() {
  return (
    <AuthCardShell>
      <Div className="flex items-center justify-center min-h-[200px]">
        <Spinner variant="primary" size="lg" />
      </Div>
    </AuthCardShell>
  )
}
