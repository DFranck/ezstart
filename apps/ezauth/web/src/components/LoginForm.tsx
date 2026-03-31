'use client'

import type { LoginRequest } from '@ezstart/auth-sdk'
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
  PasswordInput,
} from '@ezstart/ui/components'
import { callApi } from '@ezstart/fetch-client'
import { logger } from '@ezstart/logger'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

      const result = response.data as { code: string }

      // Redirect with authorization code
      if (redirect_uri) {
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
