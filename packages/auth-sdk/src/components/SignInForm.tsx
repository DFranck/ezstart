'use client'

import { Button, Div, Form } from '@ezstart/ui/components'
import { apiCall, ApiError } from '@ezstart/api-sdk'
import { logger } from './internal-logger.js'
import { generatePkcePair } from '../core/pkce.js'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { OAuthButtons } from './OAuthButtons.js'
import { TwoFactorPrompt, type TwoFactorPromptTexts } from './TwoFactorPrompt.js'
import { DevModeBanner } from './DevModeBanner.js'
import { TurnstileWidget } from '@ezstart/api-sdk/integrations'
import { useAuth } from '../react/hooks.js'
import { useAuthNavigation } from '../react/useAuthNavigation.js'
import { getAuthTexts } from '../i18n/index.js'
import {
  SIGN_IN_DEFAULT_FORM_ID,
  type SignInFormData,
  type SignInFormProps,
  type SignInFormTexts,
} from './_internal/sign-in-form/types.js'
import { useAuthedRedirect } from './_internal/sign-in-form/use-authed-redirect.js'
import { completeLoginRedirect } from './_internal/sign-in-form/complete-login-redirect.js'
import { SignInFormFields } from './_internal/sign-in-form/SignInFormFields.js'

export type { SignInFormProps, SignInFormTexts } from './_internal/sign-in-form/types.js'

/**
 * True when `redirectUri` resolves to the SAME origin as the current page.
 *
 * PKCE for password login is only minted in this case: the verifier stays in
 * the submit-handler closure and the SDK exchanges the code itself
 * (`handleCallback`) before navigating. A cross-origin redirect hands the code
 * to a foreign `/auth/callback` that cannot read this verifier, so PKCE is
 * skipped there (backward-compat). Returns `false` server-side or when the
 * URI is missing/unparseable so the caller falls back to no-PKCE safely.
 *
 * @internal
 */
function isSameOriginRedirect(redirectUri: string | undefined): boolean {
  if (!redirectUri || typeof window === 'undefined') return false
  try {
    return new URL(redirectUri, window.location.origin).origin === window.location.origin
  } catch {
    return false
  }
}

/**
 * Email + password sign-in form with optional 2FA prompt and OAuth
 * provider buttons.
 *
 * @example
 * ```tsx
 * <SignInForm appName="myapp" redirectUri="/dashboard" />
 * ```
 */
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
  formId = SIGN_IN_DEFAULT_FORM_ID,
  hideSubmitButton = false,
  onSubmittingChange,
  turnstileSiteKey,
  turnstileShowAfterFails = 3,
}: SignInFormProps) {
  const navigation = useAuthNavigation()
  const { handleCallback, isAuthenticated, isAuthReady, verifyAndRefresh, clearSession } = useAuth()
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

  useAuthedRedirect({
    isAuthReady,
    isAuthenticated,
    resolvedRedirectUri,
    appName,
    // Prove the session is LIVE before the cross-origin SSO handoff — the
    // persisted `isAuthenticated` flag outlives the httpOnly access cookie, so
    // firing `sso/authorize` off the flag alone 401s (and, unguarded, storms).
    // `verifyAndRefresh` hits `GET /me` (dual-mode) and returns the user, `null`
    // (no credential), or throws. Tri-state: only a DEFINITIVE 401 is
    // `'expired'` (→ clear); a transient network/5xx blip is `'error'` and must
    // NOT clear/broadcast logout across tabs on a still-valid cookie.
    revalidateSession: async () => {
      try {
        return (await verifyAndRefresh()) != null ? 'live' : 'expired'
      } catch (err) {
        return (err as { status?: number })?.status === 401 ? 'expired' : 'error'
      }
    },
    // `'expired'` only → drop the stale flag so the form renders signed-out.
    onStaleSession: clearSession,
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [twoFactorState, setTwoFactorState] = useState<{
    tempToken: string
    /** PKCE verifier from the originating same-origin login (RFC 7636). */
    codeVerifier?: string
  } | null>(null)
  // Anti-friction Turnstile: only show after the user has failed
  // `turnstileShowAfterFails` consecutive logins. Reset on success.
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const showTurnstile = Boolean(turnstileSiteKey) && failedAttempts >= turnstileShowAfterFails

  // Lift `loading` out so a parent (e.g. `<SignInModal>` rendering an
  // external submit button in the Modal footer) can mirror the spinner /
  // disabled state without owning the submission flow.
  useEffect(() => {
    onSubmittingChange?.(loading)
  }, [loading, onSubmittingChange])

  const form = useForm<SignInFormData>({
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (formData: SignInFormData) => {
    if (loading) return
    // Block submission when the captcha widget is showing but the user
    // hasn't completed the challenge yet. Defensive guard for cases where
    // the submit button lives outside the form (e.g. `<SignInModal>` footer)
    // and the caller hasn't wired the disabled state.
    if (showTurnstile && !turnstileToken) return

    setLoading(true)
    setError('')

    try {
      // PKCE (RFC 7636 / OAuth 2.1) — only mint a challenge when THIS SDK will
      // perform the /token exchange itself, i.e. a same-origin redirect (the
      // verifier lives in this closure and never crosses an origin boundary).
      // For a cross-origin SSO redirect the consumer's `/auth/callback` does
      // the exchange on a different origin and cannot read this verifier, so
      // we deliberately skip PKCE there (the code is minted without a
      // challenge → backward-compat path; the redirect_uri cross-check still
      // protects against authcode injection). When `crypto.subtle` is missing
      // (very old browser / non-secure context) `generatePkcePair` throws and
      // we fall back to the no-PKCE flow.
      let pkceVerifier: string | undefined
      let pkceChallenge: string | undefined
      let pkceMethod: 'S256' | undefined
      if (isSameOriginRedirect(resolvedRedirectUri)) {
        try {
          const pair = await generatePkcePair()
          pkceVerifier = pair.codeVerifier
          pkceChallenge = pair.codeChallenge
          pkceMethod = pair.codeChallengeMethod
        } catch (pkceErr) {
          logger.warn(
            'PKCE pair generation unavailable, falling back to no-PKCE login',
            pkceErr instanceof Error ? pkceErr.message : String(pkceErr)
          )
        }
      }

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
          ...(pkceChallenge
            ? { code_challenge: pkceChallenge, code_challenge_method: pkceMethod }
            : {}),
          ...(turnstileToken ? { turnstileToken } : {}),
        },
      })

      // Successful credential check — reset failure counter so the captcha
      // hides again next time the user types something valid.
      setFailedAttempts(0)
      setTurnstileToken(null)

      // Handle 2FA requirement
      if (result.requires2FA && result.tempToken) {
        // The PKCE challenge (if any) was carried into the temp token by the
        // API, so the post-2FA code stays bound. The verifier survives in
        // this same closure until the post-2FA exchange (TwoFactorPrompt runs
        // in this same page), so stash it on the 2FA state.
        setTwoFactorState({ tempToken: result.tempToken, codeVerifier: pkceVerifier })
        setLoading(false)
        return
      }

      // Redirect with the authorization code. `completeLoginRedirect`
      // distinguishes same-origin first-party (exchange the code itself via
      // `handleCallback` before navigating) from cross-origin SSO (forward
      // `?code=`/`?theme=` so the consumer's `/auth/callback` exchanges it).
      if (resolvedRedirectUri && result.code) {
        await completeLoginRedirect({
          resolvedRedirectUri,
          code: result.code,
          codeVerifier: pkceVerifier,
          handleCallback,
          fallbackError: t.fallbackError,
        })
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
      // Server unreachable (offline / DNS / crashed) — show actionable
      // i18n message instead of raw browser "Failed to fetch".
      const message =
        ApiError.isApiError(err) && err.code === 'NETWORK_UNAVAILABLE'
          ? t.networkError
          : err instanceof Error
            ? err.message
            : t.fallbackError
      setError(message)
      // Track failed attempts so the captcha widget surfaces after
      // `turnstileShowAfterFails` consecutive errors. The token (if any)
      // is single-use server-side, so clear it for the next attempt.
      setFailedAttempts(prev => prev + 1)
      setTurnstileToken(null)
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
        // Use the RESOLVED redirect URI (prop ?? URL param ?? same-origin
        // default) so the post-2FA redirect matches the resolution we did
        // for the no-2FA path. Passing the raw `redirectUri` prop here meant
        // the SDK only worked when the consumer explicitly passed one,
        // breaking dogfood standalone (e.g. ezauth /login → /dashboard).
        redirectUri={resolvedRedirectUri}
        // PKCE verifier (same-origin only) — completes the bound exchange
        // after 2FA. Undefined ⇒ no-PKCE / cross-origin (backward compat).
        {...(twoFactorState.codeVerifier ? { codeVerifier: twoFactorState.codeVerifier } : {})}
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
        <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 md:space-y-4">
          {error && (
            <Div className="bg-destructive/15 border border-destructive/50 text-destructive px-4 py-3 rounded-md">
              {error}
            </Div>
          )}

          <SignInFormFields
            form={form}
            texts={t}
            disabled={disabled}
            forgotPasswordHref={resolvedForgotPasswordHref}
            onForgotPassword={onForgotPassword}
          />

          {showTurnstile && (
            <TurnstileWidget
              siteKey={turnstileSiteKey}
              onSuccess={setTurnstileToken}
              onExpired={() => setTurnstileToken(null)}
              onError={() => setTurnstileToken(null)}
            />
          )}

          {!hideSubmitButton && (
            <Button
              type="submit"
              disabled={
                disabled || loading || !form.formState.isValid || (showTurnstile && !turnstileToken)
              }
              className="w-full cursor-pointer"
              variant="default"
            >
              {loading ? t.submitting : t.submit}
            </Button>
          )}
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
