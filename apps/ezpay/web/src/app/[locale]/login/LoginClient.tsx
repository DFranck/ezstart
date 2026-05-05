'use client'

import { useAuthContext } from '@ezstart/auth-sdk'
import { Card, CardContent, CardHeader, Div, H1, Main, P, Spinner } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { useEffect } from 'react'

const EZAUTH_KEY = process.env.NEXT_PUBLIC_EZAUTH_KEY

interface LoginClientProps {
  locale: string
}

/**
 * Client side of `/login` for EZPay — only reached when the SSR auth check
 * confirmed the user is anonymous. Bounces the browser to the EZAuth hosted
 * `/login` with `key` + `redirect_uri` so the SDK can exchange the code on
 * the way back via `/auth/callback`.
 *
 * Phase A1 ENV-DIET (2026-05-05) — `webUrl` is read from `useAuthContext()`
 * which auto-resolves it from `/keys/config.webUrl`. The legacy
 * `NEXT_PUBLIC_EZAUTH_WEB_URL` env var is no longer required.
 */
export default function LoginClient({ locale }: LoginClientProps) {
  const t = useTranslations('login')
  const { webUrl } = useAuthContext()

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!webUrl) return

    const callbackUrl = `${window.location.origin}/${locale}/auth/callback`
    const params = new URLSearchParams({ redirect_uri: callbackUrl })
    if (EZAUTH_KEY) params.set('key', EZAUTH_KEY)
    window.location.assign(`${webUrl}/${locale}/login?${params.toString()}`)
  }, [locale, webUrl])

  return (
    <Main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <H1 size="h2">{t('title')}</H1>
        </CardHeader>
        <CardContent>
          <Div className="flex flex-col items-center gap-4 py-6">
            <Spinner variant="primary" size="lg" />
            <P className="text-center text-muted-foreground">{t('redirecting')}</P>
          </Div>
        </CardContent>
      </Card>
    </Main>
  )
}
