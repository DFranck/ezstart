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
import { useState } from 'react'
import { useForm } from 'react-hook-form'

interface RegisterFormProps {
  app: string
  redirect_uri?: string | null
}

interface FormData {
  email: string
  username: string
  password: string
  firstName: string
  lastName: string
}

export function RegisterForm({ app, redirect_uri }: RegisterFormProps) {
  const t = useTranslations('register')
  const tv = useTranslations('verifyEmail')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [registered, setRegistered] = useState(false)

  const form = useForm<FormData>({
    defaultValues: {
      email: '',
      username: '',
      password: '',
      firstName: '',
      lastName: '',
    },
  })

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
              <P className="mt-1 text-xs text-muted-foreground">{t('passwordHint')}</P>
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
