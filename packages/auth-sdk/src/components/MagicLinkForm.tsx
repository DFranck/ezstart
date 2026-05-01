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
  Input,
  P,
  Span,
  Spinner,
} from '@ezstart/ui/components'
import { ApiError } from '@ezstart/api-sdk'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useRequestMagicLink } from '../react/use-magic-link.js'
import { logger } from './internal-logger.js'

// ─── Texts ──────────────────────────────────────────────────────────────────

export interface MagicLinkFormTexts {
  emailLabel: string
  emailPlaceholder: string
  submitButton: string
  submittingButton: string
  required: string
  invalidEmail: string
  successTitle: string
  /** {email} placeholder is replaced with the submitted email. */
  successMessage: string
  /** Hint shown under the success message, "didn't get the email? try again". */
  resetButton: string
  errorGeneric: string
  networkError: string
}

const DEFAULT_TEXTS: MagicLinkFormTexts = {
  emailLabel: 'Email',
  emailPlaceholder: 'you@example.com',
  submitButton: 'Send sign-in link',
  submittingButton: 'Sending…',
  required: 'This field is required',
  invalidEmail: 'Please enter a valid email address',
  successTitle: 'Check your inbox',
  successMessage:
    'If an account exists for {email}, we sent a sign-in link. The link expires in 15 minutes.',
  resetButton: 'Use a different email',
  errorGeneric: 'Could not send the sign-in link. Please try again.',
  networkError: 'Service unavailable. Please check your connection and try again.',
}

// ─── Props ──────────────────────────────────────────────────────────────────

export interface MagicLinkFormProps {
  /** Override texts (English defaults). */
  texts?: Partial<MagicLinkFormTexts>
  /** Optional className for the outer wrapper. */
  className?: string
  /** App slug for branding the email + post-login session context. */
  appName?: string
  /** Optional explicit redirect URI honored on verify. */
  redirectUri?: string
  /** Locale for the email body. */
  locale?: string
  /** Called after a successful (anti-enumeration) request. */
  onSuccess?: (email: string) => void
  /**
   * DOM `id` of the underlying `<form>` element. Lets a parent (e.g.
   * `<MagicLinkButton>` Modal) put the submit button outside the form
   * via the standard `<button form="...">` HTML association.
   */
  formId?: string
  /** Hide the in-form primary submit button (parent renders one externally). */
  hideSubmitButton?: boolean
  /**
   * Notified whenever the form's loading state flips. Lets a parent mirror
   * the spinner / disabled state without owning submission logic.
   */
  onSubmittingChange?: (isSubmitting: boolean) => void
}

interface FormData {
  email: string
}

const DEFAULT_FORM_ID = 'ezstart-magic-link-form'

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Email input form that triggers a passwordless sign-in link.
 *
 * Renders a single email input + submit button. On success, displays the
 * "check your inbox" confirmation; the response is intentionally generic
 * (anti-enumeration: the user is told the same thing whether or not the
 * account exists). i18n-agnostic: all texts come from the `texts` prop
 * (English defaults).
 *
 * @example
 * ```tsx
 * <MagicLinkForm appName="myapp" onSuccess={(email) => console.log(email)} />
 * ```
 */
export function MagicLinkForm({
  texts,
  className,
  appName,
  redirectUri,
  locale,
  onSuccess,
  formId = DEFAULT_FORM_ID,
  hideSubmitButton = false,
  onSubmittingChange,
}: MagicLinkFormProps) {
  const t: MagicLinkFormTexts = { ...DEFAULT_TEXTS, ...texts }
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<FormData>({ defaultValues: { email: '' } })

  const { mutate, isPending } = useRequestMagicLink()

  useEffect(() => {
    onSubmittingChange?.(isPending)
  }, [isPending, onSubmittingChange])

  const emailValue = form.watch('email')
  useEffect(() => {
    if (error) setError(null)
  }, [emailValue, error])

  const onSubmit = (data: FormData) => {
    if (isPending) return
    setError(null)
    const email = data.email.trim().toLowerCase()
    mutate(
      {
        email,
        ...(appName ? { app: appName } : {}),
        ...(redirectUri ? { redirectUri } : {}),
        ...(locale ? { locale } : {}),
      },
      {
        onSuccess: () => {
          setSubmittedEmail(email)
          logger.info('Magic link request submitted')
          onSuccess?.(email)
        },
        onError: err => {
          if (ApiError.isApiError(err) && err.code === 'NETWORK_UNAVAILABLE') {
            setError(t.networkError)
            return
          }
          const message = err instanceof Error ? err.message : t.errorGeneric
          setError(message)
        },
      }
    )
  }

  const reset = () => {
    setSubmittedEmail(null)
    setError(null)
    form.reset({ email: '' })
  }

  if (submittedEmail) {
    return (
      <Div className={className} role="status" aria-live="polite">
        <Div className="space-y-3 text-center">
          <P className="text-sm font-medium text-foreground">{t.successTitle}</P>
          <P className="text-sm text-muted-foreground">
            {t.successMessage.replace('{email}', submittedEmail)}
          </P>
          <Button type="button" variant="link" size="sm" onClick={reset}>
            {t.resetButton}
          </Button>
        </Div>
      </Div>
    )
  }

  return (
    <Div className={className}>
      <Form {...form}>
        <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Div
              role="alert"
              className="bg-destructive/15 border border-destructive/50 text-destructive px-4 py-3 rounded-md text-sm"
            >
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
                <FormLabel>
                  {t.emailLabel}
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
                    placeholder={t.emailPlaceholder}
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
          )}
        </form>
      </Form>
    </Div>
  )
}
