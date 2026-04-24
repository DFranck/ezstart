'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { SignInForm, useAuthNavigation } from '@ezstart/auth-sdk'
import { ThemeSwitcher } from '@ezstart/ui/theme/components'
import {
  BackButton,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  Div,
  P,
  Span,
  Spinner,
} from '@ezstart/ui/components'
import { toast } from '@ezstart/ui/utils'
// eslint-disable-next-line @ezstart/ezstart/no-next-link-in-locale-apps -- `navigation.registerHref` already includes the locale prefix; the i18n Link would re-prepend it (→ /en/en/register). TODO: refactor useAuthNavigation to expose unprefixed `registerPath` + `searchSuffix` so we can migrate cleanly.
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useKeyConfig, type KeyConfigState } from '@/hooks/useKeyConfig'
import { deriveAppHintFromRedirectUri } from '@/hooks/useDerivedApp'
import { prettifySlug } from '@/server/theme-ssr'

/**
 * Max retry delay when the server did not provide a `Retry-After` header or
 * returned an unreasonably large value. Keeps the user unblocked even under
 * sustained rate-limiting.
 */
const MAX_RATE_LIMIT_RETRY_SECONDS = 10

interface LoginContentProps {
  /**
   * SSR-resolved app slug from the middleware `x-app-theme` header. Used as
   * the initial / fallback app slug so first render matches SSR and avoids
   * the `ezauth` → real-app flash while the client probe runs. `null` when
   * no key was provided on the URL (first-party login).
   */
  ssrAppName: string | null
  /**
   * SSR-resolved Application.name (e.g. `'GreenPulse.AI'`) from the
   * middleware `x-app-display-name` header. `null` when no key was
   * provided OR when the Application has no `name` set. Rendered in the
   * "Sign in to access <display name>" copy to give the user the proper
   * brand name on first paint.
   */
  ssrAppDisplayName: string | null
}

function LoginContent({ ssrAppName, ssrAppDisplayName }: LoginContentProps) {
  const t = useTranslations('login')
  const tForgot = useTranslations('forgotPassword')
  const tValidation = useTranslations('validation')
  const tApiErrors = useTranslations('apiErrors')
  const tOAuth = useTranslations('oauth')
  const tTwoFactor = useTranslations('twoFactor')
  const navigation = useAuthNavigation()
  const params = useParams<{ locale: string }>()
  const locale = params?.locale ?? 'en'

  // Resolve app from ?key= (publishable key) or fallback to ?app= (legacy).
  //
  // Platform-scoped keys (`scope === 'admin'`, e.g. ezauth self-seed key)
  // return `appName: 'ezauth'` from the config endpoint. When such a key is
  // used by a different app (e.g. ezpay reusing the admin key during
  // bootstrap), we must NOT white-label as EZAuth — fall back to the hint
  // from `?app=` or the `redirect_uri` subdomain so the user sees the
  // correct brand / theme for the app they are signing into.
  // `retryTick` is a nonce used to force `useKeyConfig` to re-probe after a
  // `rate_limited` or `error` state — the publishable key itself stays the
  // same, only the effect's dependency changes.
  const [retryTick, setRetryTick] = useState(0)
  const keyConfig = useKeyConfig(navigation.publishableKey, retryTick)
  const isPlatformKey = keyConfig.scope === 'admin'
  const redirectUriAppHint = deriveAppHintFromRedirectUri(navigation.redirectUri)
  const resolvedAppFromKey =
    isPlatformKey && (navigation.app || redirectUriAppHint)
      ? (navigation.app ?? redirectUriAppHint)
      : keyConfig.appName
  // SSR-resolved app takes precedence over the `'ezauth'` default so the
  // first render already matches the real consumer brand (zero flash).
  const app = resolvedAppFromKey ?? navigation.app ?? ssrAppName ?? 'ezauth'
  // Resolve the display name: client keyConfig wins (freshest), then the
  // SSR header, then a prettified slug fallback. This replaces the
  // deprecated hardcoded `getAppTheme(app).name` lookup.
  const appDisplayName = keyConfig.appDisplayName ?? ssrAppDisplayName ?? prettifySlug(app)

  // Form is ONLY disabled during the initial "loading" probe (explicit pending
  // state). For `invalid` / `rate_limited` / `error`, the form remains
  // enabled so the user is never stuck in a silent dead-end — they either
  // see a toast explaining the situation OR the auto-retry unblocks them.
  const isProbing = keyConfig.status === 'loading'

  // First-party fallback: if no ?redirect_uri= is passed (user lands on
  // ezauth's own /login directly), default to ezauth's own callback page so
  // the SDK's code-flow exchanges the authorization code for a session cookie
  // and lands the user on /dashboard (AuthCallbackPage default).
  const resolvedRedirectUri =
    navigation.redirectUri ??
    (typeof window !== 'undefined'
      ? `${window.location.origin}/${locale}/auth/callback`
      : undefined)
  const bannerKeyStatus = navigation.publishableKey
    ? keyConfig.status === 'valid'
      ? ('valid' as const)
      : keyConfig.status === 'invalid'
        ? ('invalid' as const)
        : undefined
    : undefined

  // Surface the terminal key-validation outcomes to the user so the form is
  // NEVER silently locked. Each status shows at most one toast (toast.id is
  // unique per status so re-renders do not stack duplicates).
  const lastToastStatusRef = useRef<KeyConfigState['status'] | null>(null)
  useEffect(() => {
    if (keyConfig.status === lastToastStatusRef.current) return

    if (keyConfig.status === 'invalid') {
      toast.error(t('keyInvalid'), { id: 'key-config-invalid' })
      lastToastStatusRef.current = 'invalid'
    } else if (keyConfig.status === 'rate_limited') {
      const retrySeconds = Math.min(
        keyConfig.retryAfter && keyConfig.retryAfter > 0
          ? keyConfig.retryAfter
          : MAX_RATE_LIMIT_RETRY_SECONDS,
        MAX_RATE_LIMIT_RETRY_SECONDS
      )
      toast.info(t('keyRateLimited', { seconds: String(retrySeconds) }), {
        id: 'key-config-rate-limited',
      })
      lastToastStatusRef.current = 'rate_limited'
    } else if (keyConfig.status === 'error') {
      toast.error(t('keyUnavailable'), { id: 'key-config-error' })
      lastToastStatusRef.current = 'error'
    } else if (keyConfig.status === 'valid' || keyConfig.status === 'idle') {
      lastToastStatusRef.current = keyConfig.status
    }
  }, [keyConfig.status, keyConfig.retryAfter, t])

  // Auto-retry on rate limit: schedule a single re-probe after `retryAfter`
  // seconds (clamped to MAX_RATE_LIMIT_RETRY_SECONDS). Bumping `retryTick`
  // re-runs the `useKeyConfig` effect via the publishable-key dep.
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

  return (
    <Card className="max-w-md w-full relative max-h-[90vh] overflow-y-auto">
      <Div className="absolute top-4 left-4">
        <BackButton />
      </Div>
      <Div className="absolute top-4 right-4">
        <ThemeSwitcher />
      </Div>
      <CardHeader className="text-center pb-4">
        <CardDescription className="text-xs md:text-sm">
          {t('signInToAccess')} <Span className="text-primary font-semibold">{appDisplayName}</Span>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <SignInForm
          appName={app}
          redirectUri={resolvedRedirectUri}
          showOAuth
          oauthProviders={['google']}
          disabled={isProbing}
          keyStatus={bannerKeyStatus}
          urlKey={navigation.publishableKey}
          texts={{
            emailOrUsername: t('emailOrUsername'),
            emailOrUsernamePlaceholder: t('emailOrUsernamePlaceholder'),
            password: t('password'),
            passwordPlaceholder: t('passwordPlaceholder'),
            forgotPassword: tForgot('link'),
            submit: t('submit'),
            submitting: t('submitting'),
            required: tValidation('required'),
            minLength: tValidation('minLength', { min: '{min}' }),
            noRedirectUri: t('noRedirectUri'),
            fallbackError: tApiErrors('fallback'),
            twoFactorPrompt: tTwoFactor('loginPrompt'),
            twoFactorCodePlaceholder: tTwoFactor('codePlaceholder'),
            twoFactorVerify: tTwoFactor('loginVerify'),
            twoFactorVerifying: tTwoFactor('loginVerifying'),
            twoFactorBack: tTwoFactor('useBackupCode'),
            continueWithGoogle: tOAuth('continueWithGoogle'),
            orContinueWith: tOAuth('orContinueWith'),
          }}
        />

        <Div className="text-center">
          <P size={'xs'}>
            {t('noAccount')}{' '}
            <Link
              href={navigation.registerHref}
              className="text-muted-foreground hover:text-foreground font-medium underline-offset-4 hover:underline"
            >
              {t('register')}
            </Link>
          </P>
        </Div>
      </CardContent>
    </Card>
  )
}

interface LoginClientProps {
  ssrAppName: string | null
  ssrAppDisplayName: string | null
}

export default function LoginClient({ ssrAppName, ssrAppDisplayName }: LoginClientProps) {
  const t = useTranslations('login')

  return (
    <Div className="flex flex-1 items-center justify-center px-2">
      <Suspense fallback={<Spinner variant="primary" size="lg" text={t('loading')} />}>
        <LoginContent ssrAppName={ssrAppName} ssrAppDisplayName={ssrAppDisplayName} />
      </Suspense>
    </Div>
  )
}
