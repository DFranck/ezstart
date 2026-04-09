'use client'

import {
  Badge,
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
import { toast } from 'sonner'
import { logger } from '@ezstart/logger'
import { useAuthContext } from '../provider.js'
import { useAuthStore } from '../store.js'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { usePromoCode } from './usePromoCode.js'

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
  promoCodeChecking: string
}

export interface QuickSignUpFormProps {
  /** App name for the quick signup request */
  appName: string
  /** Optional description/message displayed above the form */
  description?: string
  /** Pre-filled promo code (auto-detected from URL ?promo= or localStorage if not provided) */
  promoCode?: string
  /** Custom email subject override for the welcome email */
  emailSubject?: string
  /** Custom message to prepend in the welcome email body */
  emailBody?: string
  /** Called after successful signup */
  onSuccess?: () => void
  /** Override texts */
  texts?: Partial<QuickSignUpFormTexts>
}

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_TEXTS: QuickSignUpFormTexts = {
  username: 'Username',
  usernamePlaceholder: 'Choose a username',
  email: 'Email',
  emailPlaceholder: 'Enter your email',
  submit: 'Quick Sign Up',
  submitting: 'Creating account...',
  required: 'This field is required',
  invalidEmail: 'Please enter a valid email',
  fallbackError: 'An error occurred. Please try again.',
  successToast: 'Account created! Welcome aboard.',
  promoCodeLabel: 'Promo code',
  promoCodePlaceholder: 'Enter promo code',
  promoCodeApplied: 'Valid code!',
  promoCodeToggle: 'Have a promo code?',
  promoCodeInvalid: 'Invalid promo code',
  promoCodeChecking: 'Checking...',
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
  promoCode,
  emailSubject,
  emailBody,
  onSuccess,
  texts,
}: QuickSignUpFormProps) {
  const t = { ...DEFAULT_TEXTS, ...texts }
  const { client } = useAuthContext()
  const store = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const {
    promoCode: resolvedPromo,
    setPromoCode: setResolvedPromo,
    isValid: promoIsValid,
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
      const result = await client.quickSignUp({
        username: formData.username,
        email: formData.email,
        app: appName,
        ...(finalPromo ? { promoCode: finalPromo } : {}),
        ...(emailSubject ? { emailSubject } : {}),
        ...(emailBody ? { emailBody } : {}),
      })

      // Auto-login: store tokens + user
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 md:space-y-4">
        {error && (
          <Div className="bg-destructive/15 border border-destructive/50 text-destructive px-4 py-3 rounded-md">
            {error}
          </Div>
        )}

        {description && (
          <P className="text-sm text-muted-foreground text-center mb-4">{description}</P>
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
                <FormLabel className="text-xs text-muted-foreground">{t.promoCodeLabel}</FormLabel>
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
                {promoIsValid === false && (
                  <P className="text-xs text-destructive">{t.promoCodeInvalid}</P>
                )}
              </FormItem>
            )}
          />
        )}

        <Button
          type="submit"
          disabled={loading || !form.formState.isValid}
          className="w-full cursor-pointer"
          variant="brand"
        >
          {loading ? t.submitting : t.submit}
        </Button>
      </form>
    </Form>
  )
}
