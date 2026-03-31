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
  Input,
  P,
} from '@ezstart/ui/components'
import { callApi } from '@ezstart/fetch-client'
import { logger } from '@ezstart/logger'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { useForm } from 'react-hook-form'

type FormData = {
  email: string
}

function ForgotPasswordContent() {
  const t = useTranslations('forgotPassword')
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const form = useForm<FormData>({
    defaultValues: { email: '' },
  })

  const onSubmit = async (formData: FormData) => {
    if (loading) return

    setLoading(true)
    setError('')

    try {
      const response = await callApi('/auth/forgot-password', {
        appName: 'ezauth',
        method: 'POST',
        body: { email: formData.email },
      })

      if (!response.ok) {
        throw new Error(response.error || 'Request failed')
      }

      setSuccess(true)
      logger.info('Password reset email requested')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
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
            <P className="text-center text-sm text-muted-foreground">{t('success')}</P>
            <Div className="text-center">
              <Link
                href={`/login?${searchParams.toString()}`}
                className="text-sm text-primary hover:opacity-80 font-medium"
              >
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
                </Div>
              )}

              <FormField
                control={form.control}
                name="email"
                rules={{
                  required: 'Email is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Invalid email format',
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('email')}</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder={t('emailPlaceholder')} {...field} />
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
                <Link
                  href={`/login?${searchParams.toString()}`}
                  className="text-sm text-primary hover:opacity-80 font-medium"
                >
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

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<Div className="animate-pulse bg-muted rounded h-32" />}>
      <ForgotPasswordContent />
    </Suspense>
  )
}
