'use client'

import { Button, Div, Form } from '@ezstart/ui/components'
import { apiCall, ApiError } from '@ezstart/api-sdk'
import { logger } from './internal-logger.js'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuthNavigation } from '../react/useAuthNavigation.js'
import { getAuthTexts } from '../i18n/index.js'
import {
  RESET_PASSWORD_DEFAULT_FORM_ID,
  RESET_PASSWORD_INVALID_TOKEN_CODE,
  RESET_PASSWORD_MIN_LENGTH,
  type ResetPasswordFormData,
  type ResetPasswordFormProps,
  type ResetPasswordFormTexts,
  type ResetPasswordValidationState,
} from './_internal/reset-password-form/types.js'
import { ResetPasswordFields } from './_internal/reset-password-form/ResetPasswordFields.js'
import {
  ResetPasswordNoToken,
  ResetPasswordSuccess,
  ResetPasswordTokenExpired,
  ResetPasswordValidating,
} from './_internal/reset-password-form/states.js'

export type {
  ResetPasswordFormProps,
  ResetPasswordFormTexts,
} from './_internal/reset-password-form/types.js'

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
  formId = RESET_PASSWORD_DEFAULT_FORM_ID,
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
  const [validationState, setValidationState] = useState<ResetPasswordValidationState>(
    onValidateToken && token ? 'validating' : 'idle'
  )

  const form = useForm<ResetPasswordFormData>({
    defaultValues: { newPassword: '', confirmPassword: '' },
    mode: 'onChange',
  })

  const watchPassword = form.watch('newPassword')
  const minLengthMessage = t.minLength.replace('{min}', String(RESET_PASSWORD_MIN_LENGTH))

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

  const onSubmit = async (formData: ResetPasswordFormData) => {
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
      if (ApiError.isApiError(err) && err.code === RESET_PASSWORD_INVALID_TOKEN_CODE) {
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

  // ── Early states ──────────────────────────────────────────────────────────

  const stateProps = {
    texts: t,
    backHref: resolvedBackHref,
    forgotHref: resolvedForgotHref,
    requestNewLinkHref: resolvedRequestNewLinkHref,
  }

  // No token → show invalid token message (existing behavior)
  if (!token) {
    return <ResetPasswordNoToken {...stateProps} />
  }

  // Pre-validation in progress
  if (validationState === 'validating') {
    return <ResetPasswordValidating texts={t} />
  }

  // Token invalid (either pre-validation or server rejection on submit)
  if (validationState === 'invalid') {
    return <ResetPasswordTokenExpired {...stateProps} />
  }

  // Success state
  if (success) {
    return <ResetPasswordSuccess texts={t} backHref={resolvedBackHref} />
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

        <ResetPasswordFields
          form={form}
          texts={t}
          watchPassword={watchPassword}
          minLengthMessage={minLengthMessage}
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
