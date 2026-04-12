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
} from '@ezstart/ui/components'
import { callApi, parseApiError } from '@ezstart/fetch-client'
import { logger } from '@ezstart/logger'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuthNavigation } from '../hooks/useAuthNavigation.js'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ForgotPasswordFormTexts {
  email: string
  emailPlaceholder: string
  submit: string
  submitting: string
  required: string
  invalidEmail: string
  success: string
  backToLogin: string
  fallbackError: string
}

export interface ForgotPasswordFormProps {
  /** Called after successful password reset request */
  onSuccess?: () => void
  /** Called when user clicks "Back to login" */
  onBack?: () => void
  /** Href for back to login link (used if onBack is not provided) */
  backHref?: string
  /** Override texts */
  texts?: Partial<ForgotPasswordFormTexts>
}

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_TEXTS: ForgotPasswordFormTexts = {
  email: 'Email',
  emailPlaceholder: 'Enter your email address',
  submit: 'Send Reset Link',
  submitting: 'Sending...',
  required: 'This field is required',
  invalidEmail: 'Please enter a valid email address',
  success: 'If an account with that email exists, we sent a password reset link.',
  backToLogin: 'Back to login',
  fallbackError: 'An error occurred. Please try again.',
}

// ─── Component ──────────────────────────────────────────────────────────────

type FormData = {
  email: string
}

export function ForgotPasswordForm({
  onSuccess,
  onBack,
  backHref,
  texts,
}: ForgotPasswordFormProps) {
  const t = { ...DEFAULT_TEXTS, ...texts }
  const navigation = useAuthNavigation()
  const resolvedBackHref = backHref ?? navigation.loginHref
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const form = useForm<FormData>({
    defaultValues: { email: '' },
  })

  const onSubmit = async (formData: FormData) => {
    if (loading) return

    setLoading(true)
    setError('')

    try {
      const response = await callApi('/auth/forgot-password', {
        appName: 'ezauth',
        method: 'POST',
        body: { email: formData.email },
      })

      if (!response.ok) {
        throw new Error(response.error || parseApiError(response.data) || 'Request failed')
      }

      setSuccess(true)
      logger.info('Password reset email requested')
      onSuccess?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : t.fallbackError
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Div className="space-y-4">
        <P className="text-center text-sm text-muted-foreground">{t.success}</P>
        <Div className="text-center">
          {onBack ? (
            <Button
              type="button"
              variant="link"
              className="text-sm text-muted-foreground hover:text-foreground font-medium underline-offset-4 hover:underline cursor-pointer"
              onClick={onBack}
            >
              {t.backToLogin}
            </Button>
          ) : (
            <a
              href={resolvedBackHref}
              className="text-sm text-muted-foreground hover:text-foreground font-medium underline-offset-4 hover:underline cursor-pointer"
            >
              {t.backToLogin}
            </a>
          )}
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
          </Div>
        )}

        <FormField
          control={form.control}
          name="email"
          rules={{
            required: t.required,
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: t.invalidEmail,
            },
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.email}</FormLabel>
              <FormControl>
                <Input type="email" placeholder={t.emailPlaceholder} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={loading || !form.formState.isValid}
          className="w-full cursor-pointer"
          variant="default"
        >
          {loading ? t.submitting : t.submit}
        </Button>

        <Div className="text-center">
          {onBack ? (
            <Button
              type="button"
              variant="link"
              className="text-sm text-muted-foreground hover:text-foreground font-medium underline-offset-4 hover:underline cursor-pointer"
              onClick={onBack}
            >
              {t.backToLogin}
            </Button>
          ) : (
            <a
              href={resolvedBackHref}
              className="text-sm text-muted-foreground hover:text-foreground font-medium underline-offset-4 hover:underline cursor-pointer"
            >
              {t.backToLogin}
            </a>
          )}
        </Div>
      </form>
    </Form>
  )
}
