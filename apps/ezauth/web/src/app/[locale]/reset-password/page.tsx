'use client'

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Div,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  P,
  PasswordInput,
} from '@ezstart/ui/components'
import { callApi } from '@ezstart/fetch-client'
import { logger } from '@ezstart/logger'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

type FormData = {
  newPassword: string
  confirmPassword: string
}

function ResetPasswordContent() {
  const t = useTranslations('resetPassword')
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const form = useForm<FormData>({
    defaultValues: { newPassword: '', confirmPassword: '' },
  })

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        router.push('/login')
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [success, router])

  const onSubmit = async (formData: FormData) => {
    if (loading) return

    if (formData.newPassword !== formData.confirmPassword) {
      form.setError('confirmPassword', { message: t('passwordMismatch') })
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await callApi('/auth/reset-password', {
        appName: 'ezauth',
        method: 'POST',
        body: { token, newPassword: formData.newPassword },
      })

      if (!response.ok) {
        throw new Error(response.error || 'Request failed')
      }

      setSuccess(true)
      logger.info('Password reset successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 space-y-4">
          <P className="text-center text-sm text-destructive">{t('invalidToken')}</P>
          <Div className="text-center">
            <Link
              href="/forgot-password"
              className="text-sm text-primary hover:opacity-80 font-medium"
            >
              {t('tryAgain')}
            </Link>
          </Div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-md w-full">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl md:text-2xl font-bold">{t('title')}</CardTitle>
        <CardDescription className="text-xs md:text-sm">{t('description')}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {success ? (
          <Div className="space-y-4">
            <P className="text-center text-sm text-green-600">{t('success')}</P>
            <Div className="text-center">
              <Link href="/login" className="text-sm text-primary hover:opacity-80 font-medium">
                {t('backToLogin')}
              </Link>
            </Div>
          </Div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 md:space-y-4">
              {error && (
                <Div className="bg-destructive/15 border border-destructive/50 text-destructive px-4 py-3 rounded-md text-sm">
                  {error}
                  <Div className="mt-2">
                    <Link href="/forgot-password" className="text-sm underline hover:opacity-80">
                      {t('tryAgain')}
                    </Link>
                  </Div>
                </Div>
              )}

              <FormField
                control={form.control}
                name="newPassword"
                rules={{
                  required: 'Password is required',
                  minLength: { value: 6, message: 'Must be at least 6 characters' },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('newPassword')}</FormLabel>
                    <FormControl>
                      <PasswordInput placeholder={t('newPasswordPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                rules={{
                  required: 'Please confirm your password',
                  minLength: { value: 6, message: 'Must be at least 6 characters' },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('confirmPassword')}</FormLabel>
                    <FormControl>
                      <PasswordInput placeholder={t('confirmPasswordPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={loading || !form.formState.isValid}
                className="w-full"
                variant="brand"
              >
                {loading ? t('submitting') : t('submit')}
              </Button>

              <Div className="text-center">
                <Link href="/login" className="text-sm text-primary hover:opacity-80 font-medium">
                  {t('backToLogin')}
                </Link>
              </Div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Div className="animate-pulse bg-muted rounded h-32" />}>
      <ResetPasswordContent />
    </Suspense>
  )
}
