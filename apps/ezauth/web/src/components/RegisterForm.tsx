'use client'

import type { RegisterRequest } from '@ezstart/auth-sdk'
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
  PasswordInput,
} from '@ezstart/ui/components'
import { callApi } from '@ezstart/fetch-client'
import { logger } from '@ezstart/logger'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { PasswordStrength } from './PasswordStrength'

interface RegisterFormProps {
  app: string
  redirect_uri?: string | null
}

interface FormData {
  email: string
  username: string
  password: string
  confirmPassword: string
  firstName: string
  lastName: string
}

export function RegisterForm({ app, redirect_uri }: RegisterFormProps) {
  const t = useTranslations('register')
  const tv = useTranslations('verifyEmail')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [registered, setRegistered] = useState(false)
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const emailTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const usernameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const form = useForm<FormData>({
    defaultValues: {
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
    },
    mode: 'onChange',
  })

  const watchPassword = form.watch('password')

  // Debounced availability check
  const checkAvailability = useCallback(async (field: 'email' | 'username', value: string) => {
    if (!value || value.length < 3) {
      if (field === 'email') setEmailAvailable(null)
      else setUsernameAvailable(null)
      return
    }

    try {
      const params = new URLSearchParams({ [field]: value })
      const response = await callApi(`/auth/check-availability?${params.toString()}`, {
        appName: 'ezauth',
        method: 'GET',
      })

      if (response.ok) {
        const data = response.data as {
          emailAvailable?: boolean
          usernameAvailable?: boolean
        }
        if (field === 'email') setEmailAvailable(data.emailAvailable ?? null)
        else setUsernameAvailable(data.usernameAvailable ?? null)
      }
    } catch {
      // Silently fail — availability check is non-critical
    }
  }, [])

  const watchEmail = form.watch('email')
  const watchUsername = form.watch('username')

  useEffect(() => {
    if (emailTimerRef.current) clearTimeout(emailTimerRef.current)
    setEmailAvailable(null)
    emailTimerRef.current = setTimeout(() => checkAvailability('email', watchEmail), 500)
    return () => {
      if (emailTimerRef.current) clearTimeout(emailTimerRef.current)
    }
  }, [watchEmail, checkAvailability])

  useEffect(() => {
    if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current)
    setUsernameAvailable(null)
    usernameTimerRef.current = setTimeout(() => checkAvailability('username', watchUsername), 500)
    return () => {
      if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current)
    }
  }, [watchUsername, checkAvailability])

  const onSubmit = async (formData: FormData) => {
    setLoading(true)
    setError('')

    try {
      const registerData: RegisterRequest = {
        email: formData.email,
        username: formData.username,
        password: formData.password,
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
        app,
        redirect_uri: redirect_uri || undefined,
      }

      const response = await callApi('/auth/register', {
        appName: 'ezauth',
        method: 'POST',
        body: registerData,
      })

      if (!response.ok) {
        throw new Error(
          response.error ||
            (response.data as { error?: string } | null)?.error ||
            'Registration failed'
        )
      }

      // Show "check your email" message
      setRegistered(true)
      logger.info('Registration successful, verification email sent')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (registered) {
    return (
      <Div className="space-y-4 text-center py-4">
        <Div className="text-4xl">&#9993;</Div>
        <P className="font-semibold text-lg">{tv('checkEmail')}</P>
        <P className="text-sm text-muted-foreground">{tv('checkEmailDescription')}</P>
        <Div className="pt-2">
          <Link href="/login" className="text-sm text-primary hover:opacity-80 font-medium">
            {tv('backToLogin')}
          </Link>
        </Div>
      </Div>
    )
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('email')}</FormLabel>
              <FormControl>
                <Input type="email" required placeholder={t('emailPlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
              {emailAvailable === false && (
                <P size="xs" className="text-destructive">
                  {t('emailTaken')}
                </P>
              )}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('username')}</FormLabel>
              <FormControl>
                <Input type="text" required placeholder={t('usernamePlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
              {usernameAvailable === false && (
                <P size="xs" className="text-destructive">
                  {t('usernameTaken')}
                </P>
              )}
            </FormItem>
          )}
        />

        <Div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs md:text-sm">{t('firstName')}</FormLabel>
                <FormControl>
                  <Input type="text" placeholder={t('firstNamePlaceholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs md:text-sm">{t('lastName')}</FormLabel>
                <FormControl>
                  <Input type="text" placeholder={t('lastNamePlaceholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </Div>

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('password')}</FormLabel>
              <FormControl>
                <PasswordInput
                  required
                  minLength={6}
                  placeholder={t('passwordPlaceholder')}
                  {...field}
                />
              </FormControl>
              <FormMessage />
              <PasswordStrength password={watchPassword} />
              <P className="mt-1 text-xs text-muted-foreground">{t('passwordHint')}</P>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          rules={{
            validate: (value: string) =>
              value === form.getValues('password') || t('passwordMismatch'),
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('confirmPassword')}</FormLabel>
              <FormControl>
                <PasswordInput
                  required
                  minLength={6}
                  placeholder={t('confirmPasswordPlaceholder')}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={loading} className="w-full" variant={'brand'}>
          {loading ? t('submitting') : t('submit')}
        </Button>
      </form>
    </Form>
  )
}
