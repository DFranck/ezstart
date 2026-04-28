'use client'

import { Div, Span, Spinner } from '@ezstart/ui/components'
import { Suspense, type ReactNode } from 'react'
import { useAuthNavigation } from '../../react/useAuthNavigation.js'
import { prettifySlug, useKeyConfig } from '../../react/useKeyConfig.js'
import { getAuthTexts } from '../../i18n/index.js'
import { SignUpForm, type SignUpFormProps, type SignUpFormTexts } from '../SignUpForm.js'
import { AuthModalShell, type AuthModalShellProps } from './auth-modal-shell.js'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SignUpModalTexts extends Partial<SignUpFormTexts> {
  cardTitle?: string
  cardSubtitleWithApp?: string
  cardSubtitle?: string
  haveAccount?: string
  loginLink?: string
}

export interface SignUpModalProps extends Omit<
  SignUpFormProps,
  'appName' | 'redirectUri' | 'disabled' | 'keyStatus' | 'urlKey'
> {
  /** Whether the modal is open. */
  isOpen: boolean
  /** Callback fired when the modal should close (X icon, Esc, overlay click). */
  onClose?: () => void
  /** Pre-resolved app name (SSR) to avoid first-paint brand flash. */
  ssrAppName?: string | null
  /** Pre-resolved Application display name (SSR). */
  ssrAppDisplayName?: string | null
  /** Brand logo shown above the title. */
  logo?: ReactNode
  /** Override the default chrome props. */
  modalShellProps?: Partial<AuthModalShellProps>
  /** Override texts (merged on top of localized defaults). */
  texts?: SignUpModalTexts
}

// ─── Inner content ─────────────────────────────────────────────────────────

function SignUpModalInner({
  isOpen,
  onClose,
  ssrAppName = null,
  ssrAppDisplayName = null,
  logo,
  modalShellProps,
  texts,
  locale: propLocale,
  showOAuth = true,
  oauthProviders = ['google'],
  ...formProps
}: SignUpModalProps) {
  const navigation = useAuthNavigation()
  const locale = propLocale ?? navigation.locale
  const formDefaults = getAuthTexts(locale, 'signUp') as Record<string, string>
  const t = {
    ...formDefaults,
    ...(texts as Record<string, string> | undefined),
  } as Required<SignUpModalTexts>
  const formTexts = t as Partial<SignUpFormTexts>

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

  const footer = (
    <>
      {t.haveAccount}{' '}
      <a
        href={navigation.loginHref}
        className="text-primary font-medium underline-offset-4 hover:underline"
      >
        {t.loginLink}
      </a>
    </>
  )

  return (
    <AuthModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={t.cardTitle}
      subtitle={subtitle}
      footer={footer}
      logo={logo}
      {...modalShellProps}
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
        {...formProps}
      />
    </AuthModalShell>
  )
}

// ─── Public ────────────────────────────────────────────────────────────────

/**
 * Self-contained Sign-Up modal — embeddable anywhere.
 *
 * Equivalent to Clerk's `<SignUp />`. Wraps `<SignUpForm>` inside
 * `<AuthModalShell>` with the consumer brand auto-resolved from the `?key=`
 * URL param. Works as both a standalone auth route (always-open) and as an
 * embeddable modal triggered from any consumer page.
 *
 * @example
 *   // Standalone /register page
 *   import { SignUpModal } from '@ezstart/auth-sdk/components'
 *   import { useRouter } from '@/i18n/navigation'
 *   export default function RegisterPage() {
 *     const router = useRouter()
 *     return <SignUpModal isOpen onClose={() => router.push('/')} />
 *   }
 */
export function SignUpModal(props: SignUpModalProps) {
  return (
    <Suspense fallback={props.isOpen ? <SignUpModalFallback {...props} /> : null}>
      <SignUpModalInner {...props} />
    </Suspense>
  )
}

function SignUpModalFallback({ isOpen, onClose, modalShellProps }: SignUpModalProps) {
  return (
    <AuthModalShell isOpen={isOpen} onClose={onClose} {...modalShellProps}>
      <Div className="flex items-center justify-center min-h-[200px]">
        <Spinner variant="primary" size="lg" />
      </Div>
    </AuthModalShell>
  )
}
