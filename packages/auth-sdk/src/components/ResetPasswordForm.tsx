'use client'

import {
  Button,
  Div,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  P,
  PasswordInput,
  PasswordStrength,
  Span,
  Spinner,
} from '@ezstart/ui/components'
import { apiCall, ApiError } from '@ezstart/api-sdk'
import { logger } from './internal-logger.js'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuthNavigation } from '../react/useAuthNavigation.js'
import { getAuthTexts, type AuthLocale } from '../i18n/index.js'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ResetPasswordFormTexts {
  newPassword: string
  newPasswordPlaceholder: string
  confirmPassword: string
  confirmPasswordPlaceholder: string
  submit: string
  submitting: string
  required: string
  /** Message template with {min} placeholder, e.g. "Must be at least {min} characters" */
  minLength: string
  passwordMismatch: string
  invalidToken: string
  success: string
  tryAgain: string
  backToLogin: string
  fallbackError: string
  /**
   * Shown when `apiCall` throws an `ApiError` with `code === 'NETWORK_UNAVAILABLE'`
   * (server unreachable: offline, DNS down, server crashed). Replaces the
   * raw browser `"Failed to fetch"` message which is non-actionable.
   */
  networkError: string
  // Password strength
  passwordWeak: string
  passwordFair: string
  passwordGood: string
  passwordStrong: string
  // Pre-validation / token-expired states
  validating: string
  tokenExpired: string
  requestNewLink: string
  errorInvalidToken: string
  // PasswordInput visibility toggle (sr-only)
  showPassword?: string
  hidePassword?: string
}

export interface ResetPasswordFormProps {
  /** Reset token from email link (required) */
  token: string | null | undefined
  /** Back to login href (defaults to useAuthNavigation().loginHref) */
  backHref?: string
  /** Forgot password href for "try again" link (defaults to useAuthNavigation().forgotPasswordHref) */
  forgotPasswordHref?: string
  /**
   * Href to request a new reset link (shown in "token expired" state).
   * Defaults to `forgotPasswordHref` / useAuthNavigation().forgotPasswordHref.
   */
  requestNewLinkHref?: string
  /**
   * Optional pre-validation hook. When provided AND a token is present, called on mount
   * to verify the token is still valid BEFORE showing the form.
   * Should resolve with `{ valid: boolean, code?: string }`.
   */
  onValidateToken?: (token: string) => Promise<{ valid: boolean; code?: string }>
  /** Called after success (if provided, overrides auto-redirect to login) */
  onSuccess?: () => void
  /** Auto-redirect to login after success (default: true, 3s delay) */
  autoRedirect?: boolean
  /**
   * Locale for embedded dictionaries (en | fr | vi). Defaults to the active
   * locale detected from the URL pathname (e.g. `/fr/reset-password` → `'fr'`).
   * Any keys provided in `texts` take precedence over the localized defaults.
   */
  locale?: AuthLocale | string
  /** Override texts (merged on top of the localized defaults). */
  texts?: Partial<ResetPasswordFormTexts>
  /**
   * DOM `id` of the underlying `<form>` element. Used by `<ResetPasswordModal>`
   * to render its primary submit button OUTSIDE the form (in the Modal footer
   * slot) via the standard HTML `<button form="...">` association.
   *
   * Note: only applied to the password-input form state. The intermediate
   * "validating" / "token expired" / "success" states still render their own
   * inline CTAs (those are navigation links, not form submissions).
   */
  formId?: string
  /**
   * Hide the in-form primary submit button. Used by `<ResetPasswordModal>` so
   * the submit button can be rendered in the Modal footer instead. Only
   * affects the password-input form state.
   */
  hideSubmitButton?: boolean
  /**
   * Notified whenever the form's internal `loading` state flips. Lets a
   * parent (e.g. `<ResetPasswordModal>`) wire its external submit button's
   * spinner + disabled state without owning the submission logic.
   */
  onSubmittingChange?: (isSubmitting: boolean) => void
  /**
   * Notified whenever the form transitions in/out of its submittable state
   * (token present + valid + not yet submitted). Lets a parent (e.g.
   * `<ResetPasswordModal>`) hide its external submit button when the form
   * is showing its own intermediate UI (validating, token-expired, success).
   */
  onSubmittableChange?: (isSubmittable: boolean) => void
}

const DEFAULT_FORM_ID = 'ezstart-reset-password-form'

const MIN_PASSWORD_LENGTH = 8
const INVALID_TOKEN_CODE = 'INVALID_OR_EXPIRED_TOKEN'

type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid'

// ─── Component ──────────────────────────────────────────────────────────────

type FormData = {
  newPassword: string
  confirmPassword: string
}

/**
 * Reset-password form that consumes a token from
 * `/reset-password?token=...`, pre-validates it server-side, and submits
 * the new password.
 *
 * @example
 * ```tsx
 * <ResetPasswordForm token={searchParams.token} backHref="/login" />
 * ```
 */
export function ResetPasswordForm({
  token,
  backHref,
  forgotPasswordHref,
  requestNewLinkHref,
  onValidateToken,
  onSuccess,
  autoRedirect = true,
  locale: propLocale,
  texts,
  formId = DEFAULT_FORM_ID,
  hideSubmitButton = false,
  onSubmittingChange,
  onSubmittableChange,
}: ResetPasswordFormProps) {
  const navigation = useAuthNavigation()
  const locale = propLocale ?? navigation.locale
  const t: ResetPasswordFormTexts = {
    ...getAuthTexts(locale, 'resetPassword'),
    ...texts,
  }
  const resolvedBackHref = backHref ?? navigation.loginHref
  const resolvedForgotHref = forgotPasswordHref ?? navigation.forgotPasswordHref
  const resolvedRequestNewLinkHref =
    requestNewLinkHref ?? forgotPasswordHref ?? navigation.forgotPasswordHref

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [validationState, setValidationState] = useState<ValidationState>(
    onValidateToken && token ? 'validating' : 'idle'
  )

  const form = useForm<FormData>({
    defaultValues: { newPassword: '', confirmPassword: '' },
    mode: 'onChange',
  })

  const watchPassword = form.watch('newPassword')
  const minLengthMessage = t.minLength.replace('{min}', String(MIN_PASSWORD_LENGTH))

  // Lift `loading` out so a parent (e.g. `<ResetPasswordModal>` rendering an
  // external submit button in the Modal footer) can mirror the spinner /
  // disabled state without owning the submission flow.
  useEffect(() => {
    onSubmittingChange?.(loading)
  }, [loading, onSubmittingChange])

  // Lift "is the password-input form being rendered?" so the parent modal
  // can hide its external submit button when the form is showing one of its
  // intermediate states (validating / token-expired / success).
  const isSubmittable =
    !!token && validationState !== 'validating' && validationState !== 'invalid' && !success
  useEffect(() => {
    onSubmittableChange?.(isSubmittable)
  }, [isSubmittable, onSubmittableChange])

  // Pre-validate token on mount when onValidateToken is provided
  useEffect(() => {
    if (!onValidateToken || !token) return
    let cancelled = false

    setValidationState('validating')
    onValidateToken(token)
      .then(result => {
        if (cancelled) return
        setValidationState(result.valid ? 'valid' : 'invalid')
      })
      .catch(err => {
        if (cancelled) return
        logger.warn('Reset token pre-validation failed', err)
        setValidationState('invalid')
      })

    return () => {
      cancelled = true
    }
  }, [onValidateToken, token])

  // Auto-redirect to login after success
  useEffect(() => {
    if (!success) return
    if (onSuccess) {
      onSuccess()
      return
    }
    if (!autoRedirect) return
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.href = resolvedBackHref
      }
    }, 3000)
    return () => clearTimeout(timer)
  }, [success, onSuccess, autoRedirect, resolvedBackHref])

  const onSubmit = async (formData: FormData) => {
    if (loading) return

    if (formData.newPassword !== formData.confirmPassword) {
      form.setError('confirmPassword', { message: t.passwordMismatch })
      return
    }

    setLoading(true)
    setError('')

    try {
      await apiCall('/auth/reset-password', {
        appName: 'ezauth',
        method: 'POST',
        body: { token, newPassword: formData.newPassword },
      })

      setSuccess(true)
      logger.info('Password reset successfully')
    } catch (err) {
      // Detect server-side "invalid/expired token" via error code → switch to expired view
      if (ApiError.isApiError(err) && err.code === INVALID_TOKEN_CODE) {
        setValidationState('invalid')
        setLoading(false)
        return
      }
      // Server unreachable (offline / DNS / crashed) — show actionable
      // i18n message instead of raw browser "Failed to fetch".
      if (ApiError.isApiError(err) && err.code === 'NETWORK_UNAVAILABLE') {
        setError(t.networkError)
      } else {
        setError(err instanceof Error ? err.message : t.fallbackError)
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  const renderTokenExpired = () => (
    <Div className="space-y-4">
      <Div
        role="alert"
        className="bg-destructive/10 border border-destructive/40 text-destructive px-4 py-3 rounded-md text-sm text-center"
      >
        <P className="text-sm text-destructive m-0">{t.tokenExpired}</P>
      </Div>
      <Div className="text-center">
        <Button asChild variant="default" className="w-full">
          <Link href={resolvedRequestNewLinkHref}>{t.requestNewLink}</Link>
        </Button>
      </Div>
      <Div className="text-center">
        <Button asChild variant="link" className="text-sm text-muted-foreground">
          <Link href={resolvedBackHref}>{t.backToLogin}</Link>
        </Button>
      </Div>
    </Div>
  )

  // ── Early states ──────────────────────────────────────────────────────────

  // No token → show invalid token message (existing behavior)
  if (!token) {
    return (
      <Div className="space-y-4">
        <P className="text-center text-sm text-destructive">{t.invalidToken}</P>
        <Div className="text-center">
          <Button asChild variant="link" className="text-sm text-muted-foreground">
            <Link href={resolvedForgotHref}>{t.tryAgain}</Link>
          </Button>
        </Div>
      </Div>
    )
  }

  // Pre-validation in progress
  if (validationState === 'validating') {
    return (
      <Div className="flex flex-col items-center justify-center gap-3 py-6">
        <Spinner variant="primary" size="lg" />
        <P className="text-sm text-muted-foreground m-0">{t.validating}</P>
      </Div>
    )
  }

  // Token invalid (either pre-validation or server rejection on submit)
  if (validationState === 'invalid') {
    return renderTokenExpired()
  }

  // Success state
  if (success) {
    return (
      <Div className="space-y-4">
        <P className="text-center text-sm text-success">{t.success}</P>
        <Div className="text-center">
          <Button asChild variant="link" className="text-sm text-muted-foreground">
            <Link href={resolvedBackHref}>{t.backToLogin}</Link>
          </Button>
        </Div>
      </Div>
    )
  }

  return (
    <Form {...form}>
      <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 md:space-y-4">
        {error && (
          <Div
            role="alert"
            className="bg-destructive/15 border border-destructive/50 text-destructive px-4 py-3 rounded-md text-sm"
          >
            {error}
            <Div className="mt-2">
              <Button asChild variant="link" className="text-sm text-muted-foreground">
                <Link href={resolvedForgotHref}>{t.tryAgain}</Link>
              </Button>
            </Div>
          </Div>
        )}

        <FormField
          control={form.control}
          name="newPassword"
          rules={{
            required: t.required,
            minLength: { value: MIN_PASSWORD_LENGTH, message: minLengthMessage },
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t.newPassword}
                <Span aria-hidden="true" className="text-destructive ml-0.5">
                  *
                </Span>
              </FormLabel>
              <FormControl>
                <PasswordInput
                  required
                  aria-required="true"
                  minLength={MIN_PASSWORD_LENGTH}
                  autoComplete="new-password"
                  placeholder={t.newPasswordPlaceholder}
                  texts={{
                    showPassword: t.showPassword,
                    hidePassword: t.hidePassword,
                  }}
                  {...field}
                />
              </FormControl>
              <FormMessage />
              <PasswordStrength
                password={watchPassword}
                texts={{
                  weak: t.passwordWeak,
                  fair: t.passwordFair,
                  good: t.passwordGood,
                  strong: t.passwordStrong,
                }}
              />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          rules={{
            required: t.required,
            minLength: { value: MIN_PASSWORD_LENGTH, message: minLengthMessage },
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t.confirmPassword}
                <Span aria-hidden="true" className="text-destructive ml-0.5">
                  *
                </Span>
              </FormLabel>
              <FormControl>
                <PasswordInput
                  required
                  aria-required="true"
                  minLength={MIN_PASSWORD_LENGTH}
                  autoComplete="new-password"
                  placeholder={t.confirmPasswordPlaceholder}
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

        {!hideSubmitButton && (
          <Button
            type="submit"
            disabled={loading || !form.formState.isValid}
            className="w-full"
            variant="default"
          >
            {loading ? t.submitting : t.submit}
          </Button>
        )}

        <Div className="text-center">
          <Button asChild variant="link" className="text-sm text-muted-foreground">
            <Link href={resolvedBackHref}>{t.backToLogin}</Link>
          </Button>
        </Div>
      </form>
    </Form>
  )
}
