'use client'

import type { LoginRequest } from '@ezstart/auth-sdk'
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
  PasswordInput,
} from '@ezstart/ui/components'
import { callApi } from '@ezstart/fetch-client'
import { logger } from '@ezstart/logger'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { TwoFactorPrompt } from './TwoFactorPrompt'

interface LoginFormProps {
  app: string
  redirect_uri?: string | null
}

type FormData = {
  email: string
  password: string
}

export function LoginForm({ app, redirect_uri }: LoginFormProps) {
  const t = useTranslations('login')
  const tForgot = useTranslations('forgotPassword')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [twoFactorState, setTwoFactorState] = useState<{
    tempToken: string
  } | null>(null)

  const form = useForm<FormData>({
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (formData: FormData) => {
    if (loading) return // Prevent double submission

    setLoading(true)
    setError('')

    try {
      const loginData: LoginRequest = {
        email: formData.email,
        password: formData.password,
        app,
        redirect_uri: redirect_uri || undefined,
      }

      const response = await callApi('/auth/login', {
        appName: 'ezauth',
        method: 'POST',
        body: loginData,
      })

      if (!response.ok) {
        throw new Error(
          response.error || (response.data as { error?: string } | null)?.error || 'Login failed'
        )
      }

      const result = response.data as {
        code?: string
        requires2FA?: boolean
        tempToken?: string
      }

      // Handle 2FA requirement
      if (result.requires2FA && result.tempToken) {
        setTwoFactorState({ tempToken: result.tempToken })
        setLoading(false)
        return
      }

      // Redirect with authorization code
      if (redirect_uri && result.code) {
        logger.info('Redirecting to:', redirect_uri)
        const url = new URL(redirect_uri)
        url.searchParams.set('code', result.code)
        window.location.href = url.toString()
        // Don't set loading to false here since we're redirecting
        return
      } else {
        logger.error('No redirect_uri provided! Cannot redirect after login.')
        throw new Error('No redirect URL configured. Please provide redirect_uri parameter.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  // Show 2FA prompt if needed
  if (twoFactorState) {
    return (
      <TwoFactorPrompt
        tempToken={twoFactorState.tempToken}
        redirect_uri={redirect_uri}
        onBack={() => setTwoFactorState(null)}
      />
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
          rules={{
            required: 'Email or username is required',
            minLength: { value: 3, message: 'Must be at least 3 characters' },
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('emailOrUsername')}</FormLabel>
              <FormControl>
                <Input type="text" placeholder={t('emailOrUsernamePlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          rules={{
            required: 'Password is required',
            minLength: { value: 6, message: 'Must be at least 6 characters' },
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('password')}</FormLabel>
              <FormControl>
                <PasswordInput placeholder={t('passwordPlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Div className="text-right">
          <P size="xs">
            <Link href="/forgot-password" className="text-primary hover:opacity-80 font-medium">
              {tForgot('link')}
            </Link>
          </P>
        </Div>

        <Button
          type="submit"
          disabled={loading || !form.formState.isValid}
          className="w-full"
          variant={'brand'}
        >
          {loading ? t('submitting') : t('submit')}
        </Button>
      </form>
    </Form>
  )
}
