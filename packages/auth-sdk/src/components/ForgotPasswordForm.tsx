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
import { apiCall } from '@ezstart/api-sdk'
import { logger } from '@ezstart/logger'
import { useLocale } from 'next-intl'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuthNavigation } from '../react/useAuthNavigation.js'
import { getAuthTexts, type AuthLocale } from '../i18n/index.js'

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
  /** App name for the forgot-password request. Falls back to `?app=` param, then `'ezauth'`. */
  appName?: string
  /** Called after successful password reset request */
  onSuccess?: () => void
  /** Called when user clicks "Back to login" */
  onBack?: () => void
  /** Href for back to login link (used if onBack is not provided) */
  backHref?: string
  /**
   * Locale for embedded dictionaries (en | fr | vi). Defaults to `useLocale()`.
   * Any keys provided in `texts` take precedence over the localized defaults.
   */
  locale?: AuthLocale | string
  /** Override texts (merged on top of the localized defaults). */
  texts?: Partial<ForgotPasswordFormTexts>
}

// ─── Component ──────────────────────────────────────────────────────────────

type FormData = {
  email: string
}

export function ForgotPasswordForm({
  appName,
  onSuccess,
  onBack,
  backHref,
  locale: propLocale,
  texts,
}: ForgotPasswordFormProps) {
  const contextLocale = useLocale()
  const locale = propLocale ?? contextLocale
  const t: ForgotPasswordFormTexts = {
    ...getAuthTexts(locale, 'forgotPassword'),
    ...texts,
  }
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

    const { app: queryApp, redirectUri } = navigation
    const resolvedApp = appName || queryApp || 'ezauth'

    try {
      await apiCall('/auth/forgot-password', {
        appName: 'ezauth',
        method: 'POST',
        body: {
          email: formData.email,
          locale,
          app: resolvedApp,
          ...(redirectUri && { redirect_uri: redirectUri }),
        },
      })

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
