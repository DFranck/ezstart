'use client'

import { useAuth } from '@ezstart/auth-sdk'
import {
  Card,
  CardContent,
  CardHeader,
  Div,
  H1,
  Main,
  P,
  Section,
  Spinner,
} from '@ezstart/ui/components'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const EZAUTH_WEB_URL = process.env.NEXT_PUBLIC_EZAUTH_WEB_URL ?? 'http://localhost:6111'
const EZAUTH_KEY = process.env.NEXT_PUBLIC_EZAUTH_KEY

/**
 * `/login` route for EZStart hub.
 *
 * EZStart does not host its own login form — it delegates auth to EZAuth
 * (Tier 1 SaaS service, cf. `standard-architecture.md`). This page :
 *
 * 1. If the user is already authenticated, redirects them to `/`.
 * 2. Otherwise, redirects to the EZAuth hosted `/login` with the consumer
 *    `key` (publishable) and a `redirect_uri` back to `/auth/callback` of
 *    this app, so the SDK can exchange the code and seed the session.
 */
export default function LoginRoute() {
  const t = useTranslations('login')
  const { isAuthenticated, isAuthReady } = useAuth()
  const router = useRouter()
  const locale = useLocale()

  useEffect(() => {
    if (!isAuthReady) return

    if (isAuthenticated) {
      router.replace(`/${locale}`)
      return
    }

    if (typeof window === 'undefined') return

    const callbackUrl = `${window.location.origin}/${locale}/auth/callback`
    const params = new URLSearchParams({ redirect_uri: callbackUrl })
    if (EZAUTH_KEY) params.set('key', EZAUTH_KEY)
    window.location.assign(`${EZAUTH_WEB_URL}/${locale}/login?${params.toString()}`)
  }, [isAuthenticated, isAuthReady, locale, router])

  return (
    <Main withHeaderOffset>
      <Section className="flex flex-1 items-center justify-center p-6">
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
      </Section>
    </Main>
  )
}
