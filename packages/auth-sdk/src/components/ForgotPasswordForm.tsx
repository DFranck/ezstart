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
  Span,
} from '@ezstart/ui/components'
import { apiCall, ApiError } from '@ezstart/api-sdk'
import { logger } from './internal-logger.js'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { DevModeBanner } from './DevModeBanner.js'
import { TurnstileWidget } from './TurnstileWidget.js'
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
  /**
   * Shown when `apiCall` throws an `ApiError` with `code === 'NETWORK_UNAVAILABLE'`
   * (server unreachable: offline, DNS down, server crashed). Replaces the
   * raw browser `"Failed to fetch"` message which is non-actionable.
   */
  networkError: string
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
   * Locale for embedded dictionaries (en | fr | vi). Defaults to the active
   * locale detected from the URL pathname (e.g. `/fr/forgot-password` →
   * `'fr'`). Any keys provided in `texts` take precedence over the
   * localized defaults.
   */
  locale?: AuthLocale | string
  /** Override texts (merged on top of the localized defaults). */
  texts?: Partial<ForgotPasswordFormTexts>
  /**
   * Key validation status for the DevModeBanner. Matches the prop on
   * `SignInForm` / `SignUpForm` so all three auth forms surface the same
   * dev-mode diagnostic when a consumer key is attached to the URL.
   * - `'valid'`   — key was validated successfully
   * - `'invalid'` — key is invalid, revoked, or expired
   * - `'missing'` — no key provided
   */
  keyStatus?: 'valid' | 'invalid' | 'missing'
  /** Raw publishable key from URL (for DevModeBanner display). */
  urlKey?: string
  /**
   * DOM `id` of the underlying `<form>` element. Used by
   * `<ForgotPasswordModal>` to render its primary submit button OUTSIDE the
   * form (in the Modal footer slot) via the standard HTML `<button form="...">`
   * association.
   */
  formId?: string
  /**
   * Hide the in-form primary submit button. Used by `<ForgotPasswordModal>`
   * so the submit button can be rendered in the Modal footer instead.
   * Secondary controls ("Back to login" link) STAY visible.
   */
  hideSubmitButton?: boolean
  /**
   * Notified whenever the form's internal `loading` state flips. Lets a
   * parent (e.g. `<ForgotPasswordModal>`) wire its external submit button's
   * spinner + disabled state without owning the submission logic.
   */
  onSubmittingChange?: (isSubmitting: boolean) => void
  /**
   * Cloudflare Turnstile site key — when provided, renders a captcha widget
   * above the submit button and blocks submission until a token is obtained.
   * The token is sent as `body.turnstileToken` to the backend. When omitted
   * the widget is not rendered (no-op) and submission is unrestricted.
   */
  turnstileSiteKey?: string
}

const DEFAULT_FORM_ID = 'ezstart-forgot-password-form'

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
  keyStatus,
  urlKey,
  formId = DEFAULT_FORM_ID,
  hideSubmitButton = false,
  onSubmittingChange,
  turnstileSiteKey,
}: ForgotPasswordFormProps) {
  const navigation = useAuthNavigation()
  const locale = propLocale ?? navigation.locale
  const t: ForgotPasswordFormTexts = {
    ...getAuthTexts(locale, 'forgotPassword'),
    ...texts,
  }
  const resolvedBackHref = backHref ?? navigation.loginHref
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)

  const form = useForm<FormData>({
    defaultValues: { email: '' },
  })

  // Lift `loading` out so a parent (e.g. `<ForgotPasswordModal>` rendering an
  // external submit button in the Modal footer) can mirror the spinner /
  // disabled state without owning the submission flow.
  useEffect(() => {
    onSubmittingChange?.(loading)
  }, [loading, onSubmittingChange])

  const onSubmit = async (formData: FormData) => {
    if (loading) return
    // Block submission when the captcha widget is showing but the user
    // hasn't completed the challenge yet. Defensive guard for cases where
    // the submit button lives outside the form (e.g. `<ForgotPasswordModal>`
    // footer) and the caller hasn't wired the disabled state.
    if (turnstileSiteKey && !turnstileToken) return

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
          ...(turnstileToken ? { turnstileToken } : {}),
        },
      })

      setSuccess(true)
      logger.info('Password reset email requested')
      onSuccess?.()
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
      <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 md:space-y-4">
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
              <FormLabel>
                {t.email}
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
            disabled={
              loading || !form.formState.isValid || (Boolean(turnstileSiteKey) && !turnstileToken)
            }
            className="w-full cursor-pointer"
            variant="default"
          >
            {loading ? t.submitting : t.submit}
          </Button>
        )}

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

        {/* See note in SignInForm.tsx — only override appName when the URL
            surfaced a real key/legacy app= signal so the first-party early
            return in DevModeBanner can fire on ezauth's own pages. */}
        <DevModeBanner
          {...(appName && (urlKey || keyStatus) ? { appName } : {})}
          keyStatus={keyStatus}
          urlKey={urlKey}
          locale={navigation.locale}
        />
      </form>
    </Form>
  )
}
