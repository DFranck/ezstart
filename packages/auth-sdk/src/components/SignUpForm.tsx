'use client'

import { Button, Div, Form } from '@ezstart/ui/components'
import { apiCall, ApiError } from '@ezstart/api-sdk'
import { logger } from './internal-logger.js'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { OAuthButtons } from './OAuthButtons.js'
import { usePromoCode } from './usePromoCode.js'
import { readUtmSource } from './utmSource.js'
import { DevModeBanner } from './DevModeBanner.js'
import { TurnstileWidget } from '@ezstart/api-sdk/integrations'
import { useAuth } from '../react/hooks.js'
import { useAuthNavigation } from '../react/useAuthNavigation.js'
import { getAuthTexts } from '../i18n/index.js'
import {
  SIGN_UP_DEFAULT_FORM_ID,
  type SignUpFormData,
  type SignUpFormProps,
  type SignUpFormTexts,
} from './_internal/sign-up-form/types.js'
import { useAvailabilityCheck } from './_internal/sign-up-form/use-availability-check.js'
import { SignUpFormFields } from './_internal/sign-up-form/SignUpFormFields.js'
import { SignUpSuccess } from './_internal/sign-up-form/SignUpSuccess.js'

export type { SignUpFormProps, SignUpFormTexts } from './_internal/sign-up-form/types.js'

/**
 * Account creation form with email + password, optional first/last name,
 * username, and promo code fields.
 *
 * @example
 * ```tsx
 * <SignUpForm appName="myapp" redirectUri="/welcome" />
 * ```
 */
export function SignUpForm({
  appName,
  promoCode,
  redirectUri,
  onSuccess,
  onBackToLogin,
  backToLoginHref,
  showOAuth = false,
  oauthProviders,
  locale: propLocale,
  texts,
  disabled = false,
  keyStatus,
  urlKey,
  promoApiUrl,
  formId = SIGN_UP_DEFAULT_FORM_ID,
  hideSubmitButton = false,
  onSubmittingChange,
  turnstileSiteKey,
}: SignUpFormProps) {
  const navigation = useAuthNavigation()
  const { isAuthenticated, isAuthReady } = useAuth()
  const locale = propLocale ?? navigation.locale
  const t: SignUpFormTexts = { ...getAuthTexts(locale, 'signUp'), ...texts }
  const resolvedBackToLoginHref = backToLoginHref ?? navigation.loginHref

  // ── Auto-redirect when already authenticated ─────────────────────────────
  //
  // Same rationale as `SignInForm` — if the user already has a valid session
  // in localStorage / cookie, do not show the signup form. Send them to the
  // dashboard (or to the explicit `redirectUri` / `?redirect_uri=`).
  // Cf. SignInForm for the full reasoning (LOGIN-PAGE-NO-REDIRECT-IF-AUTHED).
  const resolvedRedirectUri =
    redirectUri ??
    navigation.redirectUri ??
    (typeof window !== 'undefined'
      ? `${window.location.origin}${locale ? `/${locale}` : ''}/dashboard`
      : undefined)
  useEffect(() => {
    if (!isAuthReady) return
    if (!isAuthenticated) return
    if (typeof window === 'undefined') return
    if (!resolvedRedirectUri) return
    window.location.replace(resolvedRedirectUri)
  }, [isAuthReady, isAuthenticated, resolvedRedirectUri])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [registered, setRegistered] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const {
    promoCode: resolvedPromo,
    setPromoCode: setResolvedPromo,
    isValid: promoIsValid,
    isRateLimited: promoIsRateLimited,
    isValidating: promoIsValidating,
    isOpen: promoOpen,
    setIsOpen: setPromoOpen,
  } = usePromoCode(appName, promoCode, promoApiUrl)

  const form = useForm<SignUpFormData>({
    defaultValues: {
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      promoCode: resolvedPromo,
    },
    mode: 'onChange',
  })

  const watchPassword = form.watch('password')
  const watchEmail = form.watch('email')
  const watchUsername = form.watch('username')
  const { emailAvailable, usernameAvailable } = useAvailabilityCheck(watchEmail, watchUsername)

  // Lift `loading` out so a parent (e.g. `<SignUpModal>` rendering an
  // external submit button in the Modal footer) can mirror the spinner /
  // disabled state without owning the submission flow.
  useEffect(() => {
    onSubmittingChange?.(loading)
  }, [loading, onSubmittingChange])

  const onSubmit = async (formData: SignUpFormData) => {
    // Block submission when the captcha widget is showing but the user
    // hasn't completed the challenge yet. Defensive guard for cases where
    // the submit button lives outside the form (e.g. `<SignUpModal>` footer)
    // and the caller hasn't wired the disabled state.
    if (turnstileSiteKey && !turnstileToken) return

    setLoading(true)
    setError('')

    try {
      const finalPromo = promoIsValid === true ? formData.promoCode?.trim() : undefined
      const utmSource = readUtmSource()
      await apiCall('/auth/register', {
        appName: 'ezauth',
        method: 'POST',
        body: {
          email: formData.email,
          username: formData.username,
          password: formData.password,
          firstName: formData.firstName || undefined,
          lastName: formData.lastName || undefined,
          app: appName,
          redirect_uri: redirectUri || undefined,
          locale,
          ...(finalPromo ? { promoCode: finalPromo } : {}),
          ...(utmSource ? { utmSource } : {}),
          ...(turnstileToken ? { turnstileToken } : {}),
        },
      })

      setRegistered(true)
      logger.info('Registration successful, verification email sent')
      onSuccess?.()
    } catch (err) {
      // Server unreachable (offline / DNS / crashed) — show actionable
      // i18n message instead of raw browser "Failed to fetch".
      const message =
        ApiError.isApiError(err) && err.code === 'NETWORK_UNAVAILABLE'
          ? t.networkError
          : ApiError.isApiError(err) || err instanceof Error
            ? err.message
            : t.fallbackError
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (registered) {
    return (
      <SignUpSuccess
        texts={t}
        backToLoginHref={resolvedBackToLoginHref}
        onBackToLogin={onBackToLogin}
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
            <Div
              role="alert"
              className="bg-destructive/15 border border-destructive/50 text-destructive px-4 py-3 rounded-md"
            >
              {error}
            </Div>
          )}

          <SignUpFormFields
            form={form}
            texts={t}
            watchPassword={watchPassword}
            emailAvailable={emailAvailable}
            usernameAvailable={usernameAvailable}
            promoOpen={promoOpen}
            setPromoOpen={setPromoOpen}
            setResolvedPromo={setResolvedPromo}
            promoIsValid={promoIsValid}
            promoIsRateLimited={promoIsRateLimited}
            promoIsValidating={promoIsValidating}
          />

          {turnstileSiteKey && (
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
              disabled={disabled || loading || (Boolean(turnstileSiteKey) && !turnstileToken)}
              className="w-full cursor-pointer"
              variant="default"
            >
              {loading ? t.submitting : t.submit}
            </Button>
          )}
        </form>
      </Form>

      {/* See note in SignInForm.tsx — only override appName when the URL
          surfaced a real key/legacy app= signal so the first-party early
          return in DevModeBanner can fire on ezauth's own pages. */}
      <DevModeBanner
        {...(urlKey || keyStatus ? { appName } : {})}
        keyStatus={keyStatus}
        urlKey={urlKey}
        locale={navigation.locale}
      />
    </Div>
  )
}
