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
} from '@ezstart/ui/components'
import { callApi, parseApiError } from '@ezstart/fetch-client'
import { logger } from '@ezstart/logger'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuthNavigation } from '../hooks/useAuthNavigation.js'

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
}

export interface ResetPasswordFormProps {
  /** Reset token from email link (required) */
  token: string | null | undefined
  /** Back to login href (defaults to useAuthNavigation().loginHref) */
  backHref?: string
  /** Forgot password href for "try again" link (defaults to useAuthNavigation().forgotPasswordHref) */
  forgotPasswordHref?: string
  /** Called after success (if provided, overrides auto-redirect to login) */
  onSuccess?: () => void
  /** Auto-redirect to login after success (default: true, 3s delay) */
  autoRedirect?: boolean
  texts?: Partial<ResetPasswordFormTexts>
}

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_TEXTS: ResetPasswordFormTexts = {
  newPassword: 'New password',
  newPasswordPlaceholder: 'Enter your new password',
  confirmPassword: 'Confirm password',
  confirmPasswordPlaceholder: 'Confirm your new password',
  submit: 'Reset password',
  submitting: 'Resetting...',
  required: 'This field is required',
  minLength: 'Must be at least {min} characters',
  passwordMismatch: 'Passwords do not match',
  invalidToken: 'Invalid or missing reset token. Please request a new password reset.',
  success: 'Your password has been reset successfully. Redirecting to login...',
  tryAgain: 'Try again',
  backToLogin: 'Back to login',
  fallbackError: 'An error occurred. Please try again.',
}

const MIN_PASSWORD_LENGTH = 6

// ─── Component ──────────────────────────────────────────────────────────────

type FormData = {
  newPassword: string
  confirmPassword: string
}

export function ResetPasswordForm({
  token,
  backHref,
  forgotPasswordHref,
  onSuccess,
  autoRedirect = true,
  texts,
}: ResetPasswordFormProps) {
  const t = { ...DEFAULT_TEXTS, ...texts }
  const navigation = useAuthNavigation()
  const resolvedBackHref = backHref ?? navigation.loginHref
  const resolvedForgotHref = forgotPasswordHref ?? navigation.forgotPasswordHref

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const form = useForm<FormData>({
    defaultValues: { newPassword: '', confirmPassword: '' },
  })

  const minLengthMessage = t.minLength.replace('{min}', String(MIN_PASSWORD_LENGTH))

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
      const response = await callApi('/auth/reset-password', {
        appName: 'ezauth',
        method: 'POST',
        body: { token, newPassword: formData.newPassword },
      })

      if (!response.ok) {
        throw new Error(response.error || parseApiError(response.data) || 'Request failed')
      }

      setSuccess(true)
      logger.info('Password reset successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : t.fallbackError)
    } finally {
      setLoading(false)
    }
  }

  // No token → show invalid token message
  if (!token) {
    return (
      <Div className="space-y-4">
        <P className="text-center text-sm text-destructive">{t.invalidToken}</P>
        <Div className="text-center">
          <a
            href={resolvedForgotHref}
            className="text-sm text-muted-foreground hover:text-foreground font-medium underline-offset-4 hover:underline"
          >
            {t.tryAgain}
          </a>
        </Div>
      </Div>
    )
  }

  // Success state
  if (success) {
    return (
      <Div className="space-y-4">
        <P className="text-center text-sm text-success">{t.success}</P>
        <Div className="text-center">
          <a
            href={resolvedBackHref}
            className="text-sm text-muted-foreground hover:text-foreground font-medium underline-offset-4 hover:underline"
          >
            {t.backToLogin}
          </a>
        </Div>
      </Div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 md:space-y-4">
        {error && (
          <Div className="bg-destructive/15 border border-destructive/50 text-destructive px-4 py-3 rounded-md text-sm">
            {error}
            <Div className="mt-2">
              <a
                href={resolvedForgotHref}
                className="text-sm text-muted-foreground hover:text-foreground font-medium underline-offset-4 hover:underline"
              >
                {t.tryAgain}
              </a>
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
              <FormLabel>{t.newPassword}</FormLabel>
              <FormControl>
                <PasswordInput placeholder={t.newPasswordPlaceholder} {...field} />
              </FormControl>
              <FormMessage />
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
              <FormLabel>{t.confirmPassword}</FormLabel>
              <FormControl>
                <PasswordInput placeholder={t.confirmPasswordPlaceholder} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={loading || !form.formState.isValid}
          className="w-full"
          variant="default"
        >
          {loading ? t.submitting : t.submit}
        </Button>

        <Div className="text-center">
          <a
            href={resolvedBackHref}
            className="text-sm text-muted-foreground hover:text-foreground font-medium underline-offset-4 hover:underline"
          >
            {t.backToLogin}
          </a>
        </Div>
      </form>
    </Form>
  )
}
