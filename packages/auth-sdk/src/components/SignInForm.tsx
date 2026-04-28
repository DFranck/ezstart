'use client'

import {
  Button,
  Div,
  P,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  PasswordInput,
} from '@ezstart/ui/components'
import { apiCall } from '@ezstart/api-sdk'
import { logger } from './internal-logger.js'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { OAuthButtons, type OAuthProvider } from './OAuthButtons.js'
import { TwoFactorPrompt, type TwoFactorPromptTexts } from './TwoFactorPrompt.js'
import { DevModeBanner } from './DevModeBanner.js'
import { useAuth } from '../react/hooks.js'
import { useAuthNavigation } from '../react/useAuthNavigation.js'
import { getAuthTexts, type AuthLocale } from '../i18n/index.js'
import { detectCurrentThemePreference } from './themePreference.js'
import { buildPostLoginRedirect } from './postLoginRedirect.js'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SignInFormTexts {
  emailOrUsername: string
  emailOrUsernamePlaceholder: string
  password: string
  passwordPlaceholder: string
  forgotPassword: string
  submit: string
  submitting: string
  required: string
  minLength: string
  noRedirectUri: string
  fallbackError: string
  // PasswordInput visibility toggle (sr-only)
  showPassword?: string
  hidePassword?: string
  // 2FA texts (optional — only needed if 2FA is enabled)
  twoFactorPrompt?: string
  twoFactorCodePlaceholder?: string
  twoFactorVerify?: string
  twoFactorVerifying?: string
  twoFactorBack?: string
  // OAuth texts (optional — only needed if showOAuth is true)
  continueWithGoogle?: string
  orContinueWith?: string
}

export interface SignInFormProps {
  /** App name for the login request */
  appName: string
  /** Redirect URI after login (OAuth code flow) */
  redirectUri?: string
  /** Called after successful login (if not using redirect) */
  onSuccess?: () => void
  /** Called when user clicks "Forgot password" */
  onForgotPassword?: () => void
  /** Href for forgot password link (used if onForgotPassword is not provided) */
  forgotPasswordHref?: string
  /** Show OAuth buttons above the form */
  showOAuth?: boolean
  /** OAuth providers to display */
  oauthProviders?: OAuthProvider[]
  /**
   * Locale for embedded dictionaries (en | fr | vi). Defaults to the active
   * locale detected from the URL pathname (e.g. `/fr/login` → `'fr'`).
   * Any keys provided in `texts` take precedence over the localized defaults.
   */
  locale?: AuthLocale | string
  /** Override texts (merged on top of the localized defaults). */
  texts?: Partial<SignInFormTexts>
  /**
   * When true, the form is rendered in preview mode: all inputs and submit
   * button are disabled with reduced opacity. Useful when the publishable
   * key is invalid — the form is visible but not usable.
   */
  disabled?: boolean
  /**
   * Key validation status for the DevModeBanner.
   * - `'valid'` — key was validated successfully
   * - `'invalid'` — key is invalid, revoked, or expired
   * - `'missing'` — no key provided
   */
  keyStatus?: 'valid' | 'invalid' | 'missing'
  /** Raw publishable key from URL (for DevModeBanner display). */
  urlKey?: string
}

// ─── Component ──────────────────────────────────────────────────────────────

type FormData = {
  email: string
  password: string
}

export function SignInForm({
  appName,
  redirectUri,
  onSuccess,
  onForgotPassword,
  forgotPasswordHref,
  showOAuth = false,
  oauthProviders,
  locale: propLocale,
  texts,
  disabled = false,
  keyStatus,
  urlKey,
}: SignInFormProps) {
  const navigation = useAuthNavigation()
  const { handleCallback } = useAuth()
  const locale = propLocale ?? navigation.locale
  const t: SignInFormTexts = { ...getAuthTexts(locale, 'signIn'), ...texts }
  const resolvedForgotPasswordHref = forgotPasswordHref ?? navigation.forgotPasswordHref

  // Resolve redirectUri with sensible defaults so consumers (including the
  // first-party ezauth/web dogfooder) don't have to compute it themselves:
  //
  // 1. Explicit `redirectUri` prop (highest priority — caller knows best).
  // 2. `?redirect_uri=` URL param (cross-app SSO arriving from a consumer).
  // 3. Same-origin default → `/{locale}/dashboard`. The SDK detects same
  //    origin in the submit handler and runs `handleCallback()` BEFORE the
  //    navigation, so the destination receives the user already authenticated
  //    — no `/auth/callback` bounce required for first-party logins.
  const resolvedRedirectUri =
    redirectUri ??
    navigation.redirectUri ??
    (typeof window !== 'undefined'
      ? `${window.location.origin}${locale ? `/${locale}` : ''}/dashboard`
      : undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [twoFactorState, setTwoFactorState] = useState<{ tempToken: string } | null>(null)

  const form = useForm<FormData>({
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (formData: FormData) => {
    if (loading) return

    setLoading(true)
    setError('')

    try {
      const result = await apiCall<{
        code?: string
        requires2FA?: boolean
        tempToken?: string
      }>('/auth/login', {
        appName: 'ezauth',
        method: 'POST',
        body: {
          email: formData.email,
          password: formData.password,
          app: appName,
          redirect_uri: resolvedRedirectUri || undefined,
        },
      })

      // Handle 2FA requirement
      if (result.requires2FA && result.tempToken) {
        setTwoFactorState({ tempToken: result.tempToken })
        setLoading(false)
        return
      }

      // Redirect with authorization code.
      //
      // `buildPostLoginRedirect` distinguishes two flows:
      //
      // 1. **Cross-origin SSO** (foreign consumer app) — append `?code=`
      //    so the consumer's `/auth/callback` can exchange it, plus
      //    `?theme=` so the consumer adopts the user's last-chosen
      //    scheme. `detectCurrentThemePreference` returns `undefined`
      //    when no signal is available — the param is omitted in that
      //    case.
      //
      // 2. **Same-origin first-party** (e.g. ezauth dogfood hitting
      //    `/admin` on its own origin) — there is no `/auth/callback`
      //    handler on the destination, so the SDK MUST exchange the
      //    code itself BEFORE navigating. Otherwise the destination
      //    page renders with no tokens in the store, `RequireAuth`
      //    flips to unauthenticated, and we redirect right back to
      //    `/login` — an infinite loop. We reuse `handleCallback`
      //    (the same primitive `<AuthCallbackPage>` calls in the SSO
      //    flow) so both paths share one code-exchange code path.
      if (resolvedRedirectUri && result.code) {
        logger.info('Redirecting to:', resolvedRedirectUri)
        const url = new URL(resolvedRedirectUri)
        const isSameOrigin = url.origin === window.location.origin

        if (isSameOrigin) {
          try {
            await handleCallback(result.code)
          } catch (exchangeError) {
            logger.error(
              'Same-origin code exchange failed:',
              exchangeError instanceof Error ? exchangeError.message : String(exchangeError)
            )
            throw exchangeError instanceof Error ? exchangeError : new Error(t.fallbackError)
          }
          window.location.href = url.toString()
          return
        }

        // Cross-origin: forward the code (and theme) so the consumer's
        // `/auth/callback` can perform the exchange itself.
        const themePref = detectCurrentThemePreference()
        const target = buildPostLoginRedirect(
          resolvedRedirectUri,
          result.code,
          themePref,
          window.location.origin
        )
        window.location.href = target
        return
      }

      // No redirect — call onSuccess callback
      if (onSuccess) {
        onSuccess()
        setLoading(false)
        return
      }

      // No redirect_uri and no onSuccess
      logger.error('No redirect_uri or onSuccess provided!')
      throw new Error(t.noRedirectUri)
    } catch (err) {
      const message = err instanceof Error ? err.message : t.fallbackError
      setError(message)
      setLoading(false)
    }
  }

  // Show 2FA prompt if needed
  if (twoFactorState) {
    const twoFactorTexts: Partial<TwoFactorPromptTexts> = {}
    if (t.twoFactorPrompt) twoFactorTexts.prompt = t.twoFactorPrompt
    if (t.twoFactorCodePlaceholder) twoFactorTexts.codePlaceholder = t.twoFactorCodePlaceholder
    if (t.twoFactorVerify) twoFactorTexts.verify = t.twoFactorVerify
    if (t.twoFactorVerifying) twoFactorTexts.verifying = t.twoFactorVerifying
    if (t.twoFactorBack) twoFactorTexts.back = t.twoFactorBack

    return (
      <TwoFactorPrompt
        tempToken={twoFactorState.tempToken}
        redirectUri={redirectUri}
        onBack={() => setTwoFactorState(null)}
        texts={twoFactorTexts}
      />
    )
  }

  return (
    <Div className={`space-y-3 md:space-y-4 ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      {showOAuth && (
        <OAuthButtons
          appName={appName}
          redirectUri={redirectUri}
          providers={oauthProviders}
          texts={{
            ...(t.continueWithGoogle && { continueWithGoogle: t.continueWithGoogle }),
            ...(t.orContinueWith && { orContinueWith: t.orContinueWith }),
          }}
        />
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 md:space-y-4">
          {error && (
            <Div className="bg-destructive/15 border border-destructive/50 text-destructive px-4 py-3 rounded-md">
              {error}
            </Div>
          )}

          <FormField
            control={form.control}
            name="email"
            rules={{
              required: t.required,
              minLength: { value: 3, message: t.minLength.replace('{min}', '3') },
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.emailOrUsername}</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder={t.emailOrUsernamePlaceholder}
                    disabled={disabled}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            rules={{
              required: t.required,
              minLength: { value: 6, message: t.minLength.replace('{min}', '6') },
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.password}</FormLabel>
                <FormControl>
                  <PasswordInput
                    placeholder={t.passwordPlaceholder}
                    disabled={disabled}
                    texts={{
                      showPassword: t.showPassword,
                      hidePassword: t.hidePassword,
                    }}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Div className="text-right">
            <P size="xs">
              {onForgotPassword ? (
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto text-xs text-muted-foreground hover:text-foreground font-medium underline-offset-4 hover:underline cursor-pointer"
                  onClick={onForgotPassword}
                  disabled={disabled}
                >
                  {t.forgotPassword}
                </Button>
              ) : (
                <a
                  href={resolvedForgotPasswordHref}
                  className="text-muted-foreground hover:text-foreground font-medium underline-offset-4 hover:underline cursor-pointer"
                >
                  {t.forgotPassword}
                </a>
              )}
            </P>
          </Div>

          <Button
            type="submit"
            disabled={disabled || loading || !form.formState.isValid}
            className="w-full cursor-pointer"
            variant="default"
          >
            {loading ? t.submitting : t.submit}
          </Button>
        </form>
      </Form>

      {/*
        Only pass `appName` as override when the caller surfaced a real URL
        signal (a key/legacy app= param). Without this guard the banner can
        never honour its first-party early-return (`scope === 'first-party' &&
        !overrideAppName`) on ezauth's own pages, so the "Dev Mode — No API
        key configured" hint leaks onto first-party pages.
      */}
      <DevModeBanner
        {...(urlKey || keyStatus ? { appName } : {})}
        keyStatus={keyStatus}
        urlKey={urlKey}
        locale={navigation.locale}
      />
    </Div>
  )
}
