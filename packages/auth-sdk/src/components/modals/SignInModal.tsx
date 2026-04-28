'use client'

import { Div, Span, Spinner } from '@ezstart/ui/components'
import { toast } from '@ezstart/ui/utils'
import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { useAuthNavigation } from '../../react/useAuthNavigation.js'
import {
  deriveAppHintFromRedirectUri,
  prettifySlug,
  useKeyConfig,
  type KeyConfigState,
} from '../../react/useKeyConfig.js'
import { getAuthTexts } from '../../i18n/index.js'
import { SignInForm, type SignInFormProps, type SignInFormTexts } from '../SignInForm.js'
import { AuthModalShell, type AuthModalShellProps } from './auth-modal-shell.js'

/** Max retry delay when the server did not provide `Retry-After` or returned an unreasonably large value. */
const MAX_RATE_LIMIT_RETRY_SECONDS = 10

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SignInModalTexts extends Partial<SignInFormTexts> {
  /** Modal title (default: localized "Sign in to your account"). */
  cardTitle?: string
  /** Modal subtitle WITH brand interpolation (default: localized "Sign in to access {app}"). */
  cardSubtitleWithApp?: string
  /** Modal subtitle without brand (default: localized "Welcome back"). Used when no brand resolves. */
  cardSubtitle?: string
  /** "Don't have an account?" prefix in the footer. */
  noAccount?: string
  /** "Sign up" link label in the footer. */
  registerLink?: string
  /** Toast text shown when the publishable key is invalid. */
  keyInvalid?: string
  /** Toast text shown on rate-limit ({seconds} placeholder is replaced). */
  keyRateLimited?: string
  /** Toast text shown on transport error. */
  keyUnavailable?: string
  /** Spinner label while the SDK probes the publishable key. */
  loading?: string
}

export interface SignInModalProps extends Omit<
  SignInFormProps,
  'appName' | 'redirectUri' | 'disabled' | 'keyStatus' | 'urlKey'
> {
  /** Whether the modal is open. */
  isOpen: boolean
  /** Callback fired when the modal should close (X icon, Esc, overlay click). */
  onClose?: () => void
  /**
   * Optional override for the resolved app name. Normally the modal auto-resolves
   * from `?key=` URL param via `useKeyConfig`, falling back to `?app=` and
   * finally `'ezauth'`. Pass this only when SSR resolved an app name on the
   * server side and you want to avoid the first-render flash.
   */
  ssrAppName?: string | null
  /**
   * Optional override for the resolved Application display name (used for
   * rendering the brand pill in the subtitle). When omitted, the modal derives
   * it from `useKeyConfig().appDisplayName` then `prettifySlug(appName)`.
   */
  ssrAppDisplayName?: string | null
  /** Brand logo shown above the title. */
  logo?: ReactNode
  /** Override the default chrome props (theme switcher, size, etc.). */
  modalShellProps?: Partial<AuthModalShellProps>
  /** Override texts (merged on top of the localized defaults). */
  texts?: SignInModalTexts
}

// ─── Inner content (uses Suspense-bound hooks) ─────────────────────────────

function SignInModalInner({
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
}: SignInModalProps) {
  const navigation = useAuthNavigation()
  const locale = propLocale ?? navigation.locale
  // `getAuthTexts(locale, 'signIn')` returns the localized dict which includes
  // both the form keys AND the modal-specific keys (cardTitle,
  // cardSubtitleWithApp, noAccount, registerLink, keyInvalid,
  // keyRateLimited, keyUnavailable, loading). The dict is typed through
  // `AuthDict['signIn']` — we narrow to a Record<string, string> view to
  // merge with the caller-provided overrides without losing key safety.
  const formDefaults = getAuthTexts(locale, 'signIn') as Record<string, string>
  const t = {
    ...formDefaults,
    ...(texts as Record<string, string> | undefined),
  } as Required<SignInModalTexts>
  const formTexts = t as Partial<SignInFormTexts>

  // `retryTick` is a nonce used to force `useKeyConfig` to re-probe after a
  // `rate_limited` or `error` state — the publishable key itself stays the
  // same, only the effect's dependency changes.
  const [retryTick, setRetryTick] = useState(0)
  const keyConfig = useKeyConfig(navigation.publishableKey, retryTick)
  const isPlatformKey = keyConfig.scope === 'admin'
  const redirectUriAppHint = deriveAppHintFromRedirectUri(navigation.redirectUri)
  // When the resolved scope is `admin` (platform key), `appName` from the
  // config is meaningless for white-labeling — fall back to `?app=` or the
  // redirect_uri subdomain so we render the correct brand.
  const resolvedAppFromKey =
    isPlatformKey && (navigation.app || redirectUriAppHint)
      ? (navigation.app ?? redirectUriAppHint)
      : keyConfig.appName
  const app = resolvedAppFromKey ?? navigation.app ?? ssrAppName ?? 'ezauth'
  const appDisplayName = keyConfig.appDisplayName ?? ssrAppDisplayName ?? prettifySlug(app)

  // Form is ONLY disabled during the initial probe.
  const isProbing = keyConfig.status === 'loading'
  const bannerKeyStatus = navigation.publishableKey
    ? keyConfig.status === 'valid'
      ? ('valid' as const)
      : keyConfig.status === 'invalid'
        ? ('invalid' as const)
        : undefined
    : undefined

  // Surface terminal key-validation outcomes via toast so the form is never
  // silently locked.
  const lastToastStatusRef = useRef<KeyConfigState['status'] | null>(null)
  useEffect(() => {
    if (keyConfig.status === lastToastStatusRef.current) return
    if (keyConfig.status === 'invalid') {
      toast.error(t.keyInvalid, { id: 'key-config-invalid' })
      lastToastStatusRef.current = 'invalid'
    } else if (keyConfig.status === 'rate_limited') {
      const retrySeconds = Math.min(
        keyConfig.retryAfter && keyConfig.retryAfter > 0
          ? keyConfig.retryAfter
          : MAX_RATE_LIMIT_RETRY_SECONDS,
        MAX_RATE_LIMIT_RETRY_SECONDS
      )
      toast.info(t.keyRateLimited.replace('{seconds}', String(retrySeconds)), {
        id: 'key-config-rate-limited',
      })
      lastToastStatusRef.current = 'rate_limited'
    } else if (keyConfig.status === 'error') {
      toast.error(t.keyUnavailable, { id: 'key-config-error' })
      lastToastStatusRef.current = 'error'
    } else if (keyConfig.status === 'valid' || keyConfig.status === 'idle') {
      lastToastStatusRef.current = keyConfig.status
    }
  }, [keyConfig.status, keyConfig.retryAfter, t.keyInvalid, t.keyRateLimited, t.keyUnavailable])

  // Auto-retry on rate limit.
  useEffect(() => {
    if (keyConfig.status !== 'rate_limited') return
    const delay =
      Math.min(
        keyConfig.retryAfter && keyConfig.retryAfter > 0
          ? keyConfig.retryAfter
          : MAX_RATE_LIMIT_RETRY_SECONDS,
        MAX_RATE_LIMIT_RETRY_SECONDS
      ) * 1000
    const timer = window.setTimeout(() => {
      setRetryTick(n => n + 1)
    }, delay)
    return () => {
      window.clearTimeout(timer)
    }
  }, [keyConfig.status, keyConfig.retryAfter])

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
      {t.noAccount}{' '}
      <a
        href={navigation.registerHref}
        className="text-primary font-medium underline-offset-4 hover:underline"
      >
        {t.registerLink}
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
      <SignInForm
        appName={app}
        showOAuth={showOAuth}
        oauthProviders={oauthProviders}
        disabled={isProbing}
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
 * Self-contained Sign-In modal — embeddable anywhere.
 *
 * Wraps `<SignInForm>` inside `<AuthModalShell>` (Modal + theme switcher +
 * brand subtitle + cross-link footer). Auto-resolves the consumer brand from
 * the `?key=` URL param via {@link useKeyConfig} and renders the matching
 * display name in the subtitle.
 *
 * Equivalent to Clerk's `<SignIn />`. Works as both a standalone auth route
 * (always-open) and as an embeddable modal triggered from any consumer page.
 *
 * @example
 *   // Standalone /login page
 *   import { SignInModal } from '@ezstart/auth-sdk/components'
 *   import { useRouter } from '@/i18n/navigation'
 *   export default function LoginPage() {
 *     const router = useRouter()
 *     return <SignInModal isOpen onClose={() => router.push('/')} />
 *   }
 *
 * @example
 *   // Embedded modal triggered from a button
 *   const [open, setOpen] = useState(false)
 *   return (
 *     <>
 *       <Button onClick={() => setOpen(true)}>Sign in</Button>
 *       <SignInModal isOpen={open} onClose={() => setOpen(false)} />
 *     </>
 *   )
 */
export function SignInModal(props: SignInModalProps) {
  return (
    <Suspense fallback={props.isOpen ? <SignInModalFallback {...props} /> : null}>
      <SignInModalInner {...props} />
    </Suspense>
  )
}

function SignInModalFallback({ isOpen, onClose, modalShellProps }: SignInModalProps) {
  return (
    <AuthModalShell isOpen={isOpen} onClose={onClose} {...modalShellProps}>
      <Div className="flex items-center justify-center min-h-[200px]">
        <Spinner variant="primary" size="lg" />
      </Div>
    </AuthModalShell>
  )
}
