'use client'

/**
 * Email-change verify page — entry point for the link sent in the
 * verification email.
 *
 * Reads `?token=` from the URL, calls the SDK `useVerifyEmailChange`
 * mutation on mount, and surfaces success / error state.
 */

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useVerifyEmailChange } from '@ezstart/auth-sdk'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Div,
  H1,
  Icon,
  Main,
  P,
  Spinner,
} from '@ezstart/ui/components'
import { Link } from '@/i18n/navigation'

export default function EmailChangeVerifyPage() {
  const params = useSearchParams()
  const token = params.get('token')
  const t = useTranslations('emailChangeVerify')
  const { mutate, isPending, isSuccess, isError, error } = useVerifyEmailChange()
  const [hasFired, setHasFired] = useState(false)

  useEffect(() => {
    if (!token || hasFired) return
    setHasFired(true)
    mutate({ token })
  }, [token, hasFired, mutate])

  const errorMessage = error instanceof Error ? error.message : t('errorGeneric')

  return (
    <Main className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            <H1 size="h3">{t('title')}</H1>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!token && (
            <Div role="alert" className="space-y-3">
              <Div className="flex items-center gap-2 text-destructive">
                <Icon name="lucide:AlertTriangle" className="h-5 w-5" />
                <P className="text-sm font-medium">{t('missingToken')}</P>
              </Div>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/dashboard">{t('backToDashboard')}</Link>
              </Button>
            </Div>
          )}

          {token && isPending && (
            <Div className="flex flex-col items-center gap-3 py-6" role="status" aria-busy="true">
              <Spinner variant="primary" size="lg" />
              <P className="text-sm text-muted-foreground">{t('verifying')}</P>
            </Div>
          )}

          {token && isSuccess && (
            <Div className="space-y-4" role="status" aria-live="polite">
              <Div className="flex items-center gap-2 text-success">
                <Icon name="lucide:CheckCircle2" className="h-5 w-5" />
                <P className="text-sm font-medium">{t('successTitle')}</P>
              </Div>
              <P className="text-sm text-muted-foreground">{t('successMessage')}</P>
              <Button asChild variant="default" className="w-full">
                <Link href="/login">{t('signInAgain')}</Link>
              </Button>
            </Div>
          )}

          {token && isError && (
            <Div className="space-y-4" role="alert">
              <Div className="flex items-center gap-2 text-destructive">
                <Icon name="lucide:AlertTriangle" className="h-5 w-5" />
                <P className="text-sm font-medium">{t('errorTitle')}</P>
              </Div>
              <P className="text-sm text-muted-foreground">{errorMessage}</P>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/dashboard">{t('backToDashboard')}</Link>
              </Button>
            </Div>
          )}
        </CardContent>
      </Card>
    </Main>
  )
}
