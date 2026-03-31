'use client'

import { Card, CardContent, CardHeader, CardTitle, Div, P, Spinner } from '@ezstart/ui/components'
import { callApi } from '@ezstart/fetch-client'
import { logger } from '@ezstart/logger'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useState } from 'react'

type VerifyState = 'verifying' | 'success' | 'already-verified' | 'invalid' | 'error'

function VerifyEmailContent() {
  const t = useTranslations('verifyEmail')
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [state, setState] = useState<VerifyState>(token ? 'verifying' : 'invalid')

  const verifyEmail = useCallback(async () => {
    if (!token) {
      setState('invalid')
      return
    }

    try {
      const response = await callApi('/auth/verify-email', {
        appName: 'ezauth',
        method: 'POST',
        body: { token },
      })

      if (!response.ok) {
        const errorMsg = response.error || ''
        if (errorMsg.includes('already verified')) {
          setState('already-verified')
        } else {
          setState('invalid')
        }
        return
      }

      const result = response.data as { message?: string }
      if (result?.message?.includes('already verified')) {
        setState('already-verified')
      } else {
        setState('success')
      }

      logger.info('Email verified successfully')
    } catch (err) {
      logger.error('Email verification failed:', err)
      setState('error')
    }
  }, [token])

  useEffect(() => {
    if (token) {
      verifyEmail()
    }
  }, [token, verifyEmail])

  return (
    <Card className="max-w-md w-full">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl md:text-2xl font-bold">{t('title')}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {state === 'verifying' && (
          <Div className="flex flex-col items-center gap-4 py-4">
            <Spinner variant="primary" size="lg" />
            <P className="text-sm text-muted-foreground">{t('verifying')}</P>
          </Div>
        )}

        {state === 'success' && (
          <Div className="space-y-4">
            <P className="text-center text-sm text-green-600">{t('success')}</P>
            <Div className="text-center">
              <Link href="/login" className="text-sm text-primary hover:opacity-80 font-medium">
                {t('backToLogin')}
              </Link>
            </Div>
          </Div>
        )}

        {state === 'already-verified' && (
          <Div className="space-y-4">
            <P className="text-center text-sm text-muted-foreground">{t('alreadyVerified')}</P>
            <Div className="text-center">
              <Link href="/login" className="text-sm text-primary hover:opacity-80 font-medium">
                {t('backToLogin')}
              </Link>
            </Div>
          </Div>
        )}

        {state === 'invalid' && (
          <Div className="space-y-4">
            <P className="text-center text-sm text-destructive">{t('invalidToken')}</P>
            <Div className="text-center">
              <Link href="/login" className="text-sm text-primary hover:opacity-80 font-medium">
                {t('backToLogin')}
              </Link>
            </Div>
          </Div>
        )}

        {state === 'error' && (
          <Div className="space-y-4">
            <P className="text-center text-sm text-destructive">{t('error')}</P>
            <Div className="text-center">
              <Link href="/login" className="text-sm text-primary hover:opacity-80 font-medium">
                {t('backToLogin')}
              </Link>
            </Div>
          </Div>
        )}
      </CardContent>
    </Card>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<Spinner variant="primary" size="lg" text="Loading..." />}>
      <VerifyEmailContent />
    </Suspense>
  )
}
