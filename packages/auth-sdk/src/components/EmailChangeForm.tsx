'use client'

/**
 * EmailChangeForm — form for changing the authenticated user's email
 * address with verification.
 *
 * Sends a verification link to the new email address; the user must
 * click the link to commit the change. The component handles the
 * happy path, shows the post-submit "check your inbox" success state,
 * and surfaces validation/network errors inline.
 *
 * i18n-agnostic: all texts come from the `texts` prop (English defaults).
 */

import {
  Button,
  Div,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  P,
  Span,
  Spinner,
} from '@ezstart/ui/components'
import { ApiError } from '@ezstart/api-sdk'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../react/hooks.js'
import { useRequestEmailChange } from '../react/use-email-change.js'
import { logger } from './internal-logger.js'

// ─── Texts ──────────────────────────────────────────────────────────────────

export interface EmailChangeFormTexts {
  title: string
  description: string
  currentEmailLabel: string
  newEmailLabel: string
  newEmailPlaceholder: string
  currentPasswordLabel: string
  currentPasswordPlaceholder: string
  currentPasswordHelp: string
  submitButton: string
  submittingButton: string
  required: string
  invalidEmail: string
  successTitle: string
  /** {email} placeholder is replaced with the new email address. */
  successMessage: string
  resetButton: string
  /** Generic error fallback when the server returns no actionable message. */
  errorGeneric: string
  /** Specific message for `EMAIL_SAME_AS_CURRENT`. */
  errorSameEmail: string
  /** Specific message for `EMAIL_ALREADY_TAKEN`. */
  errorTaken: string
  /** Specific message for `INVALID_PASSWORD`. */
  errorInvalidPassword: string
  /** Network failure (`NETWORK_UNAVAILABLE`). */
  networkError: string
}

const DEFAULT_TEXTS: EmailChangeFormTexts = {
  title: 'Change email',
  description: 'We will send a verification link to your new email address.',
  currentEmailLabel: 'Current email',
  newEmailLabel: 'New email',
  newEmailPlaceholder: 'you@example.com',
  currentPasswordLabel: 'Current password',
  currentPasswordPlaceholder: 'Enter your current password',
  currentPasswordHelp:
    'Required to confirm it is really you (skipped if you sign in only via Google).',
  submitButton: 'Send verification link',
  submittingButton: 'Sending…',
  required: 'This field is required',
  invalidEmail: 'Please enter a valid email address',
  successTitle: 'Check your inbox',
  successMessage:
    'We sent a verification link to {email}. Click the link within 24 hours to complete the change.',
  resetButton: 'Change a different email',
  errorGeneric: 'Could not request the email change. Please try again.',
  errorSameEmail: 'This is already your current email.',
  errorTaken: 'This email is already taken by another account.',
  errorInvalidPassword: 'Current password is incorrect.',
  networkError: 'Service unavailable. Please check your connection and try again.',
}

// ─── Props ──────────────────────────────────────────────────────────────────

export interface EmailChangeFormProps {
  /** Override texts (merged on top of English defaults). */
  texts?: Partial<EmailChangeFormTexts>
  /** Optional className passed to the outer wrapper. */
  className?: string
  /** App slug to brand the verification email (e.g. `'ezauth'`, `'green-pulse'`). */
  appName?: string
  /** Locale for the email body (en/fr/vi). Auto-detected from URL pathname if absent. */
  locale?: string
  /** Called after a successful request — receives the new email. */
  onSuccess?: (newEmail: string) => void
}

interface FormData {
  newEmail: string
  password: string
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Form for changing the authenticated user's email address with verification.
 *
 * Sends a verification link to the new address — the change is only
 * committed once the user clicks the link. Shows a "check your inbox"
 * success state on submit and surfaces validation/network errors inline.
 *
 * @example
 * ```tsx
 * <EmailChangeForm appName="myapp" />
 * ```
 */
export function EmailChangeForm({
  texts,
  className,
  appName,
  locale,
  onSuccess,
}: EmailChangeFormProps) {
  const t: EmailChangeFormTexts = { ...DEFAULT_TEXTS, ...texts }
  const { user } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)

  const form = useForm<FormData>({
    defaultValues: { newEmail: '', password: '' },
  })

  const { mutate, isPending } = useRequestEmailChange()

  // Reset error when the user changes inputs.
  const newEmail = form.watch('newEmail')
  useEffect(() => {
    if (error) setError(null)
  }, [newEmail, error])

  const requiresPassword = user?.hasSetOwnPassword ?? true

  const onSubmit = (formData: FormData) => {
    if (isPending) return
    setError(null)
    const payload = {
      newEmail: formData.newEmail.trim().toLowerCase(),
      ...(requiresPassword && formData.password ? { password: formData.password } : {}),
      ...(locale ? { locale } : {}),
      ...(appName ? { app: appName } : {}),
    }
    mutate(payload, {
      onSuccess: () => {
        setSubmittedEmail(payload.newEmail)
        logger.info('Email change verification sent')
        onSuccess?.(payload.newEmail)
      },
      onError: err => {
        if (ApiError.isApiError(err)) {
          if (err.code === 'NETWORK_UNAVAILABLE') {
            setError(t.networkError)
            return
          }
          if (err.code === 'EMAIL_SAME_AS_CURRENT') {
            setError(t.errorSameEmail)
            return
          }
          if (err.code === 'EMAIL_ALREADY_TAKEN') {
            setError(t.errorTaken)
            return
          }
          if (err.code === 'INVALID_PASSWORD') {
            setError(t.errorInvalidPassword)
            return
          }
          setError(err.message || t.errorGeneric)
          return
        }
        const message = err instanceof Error ? err.message : t.errorGeneric
        setError(message)
      },
    })
  }

  const reset = () => {
    setSubmittedEmail(null)
    setError(null)
    form.reset({ newEmail: '', password: '' })
  }

  if (submittedEmail) {
    return (
      <Div className={className} role="status" aria-live="polite">
        <Div className="space-y-3">
          <P className="text-sm font-medium text-foreground">{t.successTitle}</P>
          <P className="text-sm text-muted-foreground">
            {t.successMessage.replace('{email}', submittedEmail)}
          </P>
          <Button type="button" variant="outline" size="sm" onClick={reset}>
            {t.resetButton}
          </Button>
        </Div>
      </Div>
    )
  }

  return (
    <Div className={className}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Div
              role="alert"
              className="bg-destructive/15 border border-destructive/50 text-destructive px-4 py-3 rounded-md text-sm"
            >
              {error}
            </Div>
          )}

          {user?.email && (
            <Div className="space-y-1">
              <P className="text-xs text-muted-foreground">{t.currentEmailLabel}</P>
              <P className="text-sm text-foreground">{user.email}</P>
            </Div>
          )}

          <FormField
            control={form.control}
            name="newEmail"
            rules={{
              required: t.required,
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: t.invalidEmail,
              },
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t.newEmailLabel}
                  <Span aria-hidden="true" className="text-destructive ml-0.5">
                    *
                  </Span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    required
                    aria-required="true"
                    autoComplete="email"
                    placeholder={t.newEmailPlaceholder}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {requiresPassword && (
            <FormField
              control={form.control}
              name="password"
              rules={{ required: t.required }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t.currentPasswordLabel}
                    <Span aria-hidden="true" className="text-destructive ml-0.5">
                      *
                    </Span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      required
                      aria-required="true"
                      autoComplete="current-password"
                      placeholder={t.currentPasswordPlaceholder}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{t.currentPasswordHelp}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="w-full"
            variant="default"
            aria-busy={isPending}
          >
            {isPending ? (
              <>
                <Spinner size="sm" className="mr-2" />
                {t.submittingButton}
              </>
            ) : (
              t.submitButton
            )}
          </Button>

          <P className="sr-only">{t.description}</P>
        </form>
      </Form>
    </Div>
  )
}
