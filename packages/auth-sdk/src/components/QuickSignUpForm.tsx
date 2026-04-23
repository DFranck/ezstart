'use client'

import {
  Badge,
  Button,
  DesignTokenProvider,
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
import { toast } from 'sonner'
import { logger } from '@ezstart/logger'
import { useLocale } from 'next-intl'
import { useAuthContext } from '../react/auth-provider.js'
import { useAuthStore } from '../react/store.js'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { usePromoCode } from './usePromoCode.js'
import { readUtmSource } from './utmSource.js'
import { getAuthTexts, type AuthLocale } from '../i18n/index.js'
import type { EmailOverrideRequest } from '../core/types.js'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface QuickSignUpFormTexts {
  username: string
  usernamePlaceholder: string
  email: string
  emailPlaceholder: string
  submit: string
  submitting: string
  required: string
  invalidEmail: string
  fallbackError: string
  successToast: string
  promoCodeLabel: string
  promoCodePlaceholder: string
  promoCodeApplied: string
  promoCodeToggle: string
  promoCodeInvalid: string
  promoCodeRateLimited: string
  promoCodeChecking: string
}

export interface QuickSignUpFormProps {
  /** App name for the quick signup request */
  appName: string
  /** Optional description/message displayed above the form */
  description?: string
  /** Layout density: compact reduces spacing for tight viewports */
  density?: 'compact' | 'default' | 'relaxed'
  /** Pre-filled promo code (auto-detected from URL ?promo= or localStorage if not provided) */
  promoCode?: string
  /**
   * Per-send email overrides forwarded to the welcome email template
   * (subject, from, replyTo, bodyHtml, etc.). Enables campaign-specific
   * emails (e.g. Earth Day) without touching the shared template.
   */
  emailOverride?: EmailOverrideRequest
  /** Called after successful signup */
  onSuccess?: () => void
  /**
   * Locale for embedded dictionaries (en | fr | vi). Defaults to `useLocale()`.
   * Any keys provided in `texts` take precedence over the localized defaults.
   */
  locale?: AuthLocale | string
  /** Override texts (merged on top of the localized defaults). */
  texts?: Partial<QuickSignUpFormTexts>
}

// ─── Component ──────────────────────────────────────────────────────────────

type FormData = {
  username: string
  email: string
  promoCode: string
}

export function QuickSignUpForm({
  appName,
  description,
  density = 'default',
  promoCode,
  emailOverride,
  onSuccess,
  locale: propLocale,
  texts,
}: QuickSignUpFormProps) {
  const { client } = useAuthContext()
  const store = useAuthStore()
  const contextLocale = useLocale()
  const locale = propLocale ?? contextLocale
  const t: QuickSignUpFormTexts = {
    ...getAuthTexts(locale, 'quickSignup'),
    ...texts,
  }
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const {
    promoCode: resolvedPromo,
    setPromoCode: setResolvedPromo,
    isValid: promoIsValid,
    isRateLimited: promoIsRateLimited,
    isValidating: promoIsValidating,
    isOpen: promoOpen,
    setIsOpen: setPromoOpen,
  } = usePromoCode(appName, promoCode)

  const form = useForm<FormData>({
    defaultValues: {
      username: '',
      email: '',
      promoCode: resolvedPromo,
    },
  })

  const onSubmit = async (formData: FormData) => {
    if (loading) return

    setLoading(true)
    setError('')

    try {
      const finalPromo = promoIsValid === true ? formData.promoCode?.trim() : undefined
      // Marketing attribution: read utm_source persisted client-side (by the
      // landing page or router middleware) and forward it to the backend so
      // it can be stored on the user alongside the promo code. Trimmed and
      // capped client-side; the API schema enforces max 128 chars as well.
      const utmSource = readUtmSource()
      const result = await client.quickSignUp({
        username: formData.username,
        email: formData.email,
        app: appName,
        locale,
        ...(finalPromo ? { promoCode: finalPromo } : {}),
        ...(utmSource ? { utmSource } : {}),
        ...(emailOverride ? { emailOverride } : {}),
      })

      // Auto-login: the API issues a real session so consumers (e.g.
      // green-pulse/earthday) can read the applied promo immediately.
      // The user still needs to click the emailed set-password link to
      // flip isVerified=true and set a real password.
      store.setAuth(result.user, result.accessToken, 'localStorage', result.refreshToken)
      logger.info('Quick signup successful')
      toast.success(t.successToast)
      onSuccess?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : t.fallbackError
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DesignTokenProvider density={density}>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className={
            density === 'compact'
              ? 'space-y-1.5'
              : density === 'relaxed'
                ? 'space-y-4 md:space-y-5'
                : 'space-y-3 md:space-y-4'
          }
        >
          {error && (
            <Div
              className={`bg-destructive/15 border border-destructive/50 text-destructive rounded-md ${density === 'compact' ? 'px-3 py-2 text-xs' : 'px-4 py-3'}`}
            >
              {error}
            </Div>
          )}

          {description && (
            <P
              className={`text-muted-foreground text-center ${density === 'compact' ? 'text-xs mb-2' : 'text-sm mb-4'}`}
            >
              {description}
            </P>
          )}

          <FormField
            control={form.control}
            name="username"
            rules={{
              required: t.required,
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.username}</FormLabel>
                <FormControl>
                  <Input type="text" placeholder={t.usernamePlaceholder} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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

          {!promoOpen ? (
            <Button
              type="button"
              variant="link"
              className="text-xs text-muted-foreground p-0 h-auto cursor-pointer"
              onClick={() => setPromoOpen(true)}
            >
              {t.promoCodeToggle}
            </Button>
          ) : (
            <FormField
              control={form.control}
              name="promoCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground">
                    {t.promoCodeLabel}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder={t.promoCodePlaceholder}
                      className="h-8 text-sm"
                      {...field}
                      onChange={e => {
                        field.onChange(e)
                        setResolvedPromo(e.target.value)
                      }}
                    />
                  </FormControl>
                  {promoIsValidating && (
                    <P className="text-xs text-muted-foreground">{t.promoCodeChecking}</P>
                  )}
                  {promoIsValid === true && (
                    <Badge variant="success" className="text-xs">
                      {t.promoCodeApplied}
                    </Badge>
                  )}
                  {promoIsValid === false && !promoIsRateLimited && (
                    <P className="text-xs text-destructive">{t.promoCodeInvalid}</P>
                  )}
                  {promoIsRateLimited && (
                    <P className="text-xs text-warning">{t.promoCodeRateLimited}</P>
                  )}
                </FormItem>
              )}
            />
          )}

          <Button
            type="submit"
            disabled={loading || !form.formState.isValid}
            className="w-full cursor-pointer"
            variant="default"
          >
            {loading ? t.submitting : t.submit}
          </Button>
        </form>
      </Form>
    </DesignTokenProvider>
  )
}
