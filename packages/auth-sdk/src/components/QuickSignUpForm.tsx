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
} from '@ezstart/ui/components'
import { toast } from 'sonner'
import { logger } from '@ezstart/logger'
import { useAuthContext } from '../provider.js'
import { useAuthStore } from '../store.js'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

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
}

export interface QuickSignUpFormProps {
  /** App name for the quick signup request */
  appName: string
  /** Pre-filled promo code (not shown as input, just sent with signup) */
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
}

// ─── Component ──────────────────────────────────────────────────────────────

type FormData = {
  username: string
  email: string
}

export function QuickSignUpForm({
  appName,
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

  const form = useForm<FormData>({
    defaultValues: {
      username: '',
      email: '',
    },
  })

  const onSubmit = async (formData: FormData) => {
    if (loading) return

    setLoading(true)
    setError('')

    try {
      const result = await client.quickSignUp({
        username: formData.username,
        email: formData.email,
        app: appName,
        ...(promoCode ? { promoCode } : {}),
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
