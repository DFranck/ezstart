'use client'

import { Button, Card, CardContent, Div, Icon, Main, P, Spinner } from '@ezstart/ui/components'
import { type AuthUser, useAuthStore } from '@ezstart/auth-sdk'
import { callApi, parseApiError } from '@ezstart/fetch-client'
import { logger } from '@ezstart/logger'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

type Status = 'loading' | 'error'

/**
 * Guards against open-redirect / XSS via crafted `?next=` values.
 * Only accepts same-origin relative paths starting with a single `/`.
 * Blocks protocol-relative URLs (`//evil.com`) and schemes (`javascript:`, `data:`).
 */
function isSafeRelativePath(path: string): boolean {
  if (!path || typeof path !== 'string') return false
  if (!path.startsWith('/')) return false
  if (path.startsWith('//')) return false
  const firstSlash = path.indexOf('/', 1)
  const colonIdx = path.indexOf(':')
  if (colonIdx !== -1 && (firstSlash === -1 || colonIdx < firstSlash)) return false
  return true
}

function SsoCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('ssoCallback')
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string>('')
  const [app, setApp] = useState<string>('ezauth')
  const setAuth = useAuthStore(state => state.setAuth)
  const processedRef = useRef(false)

  useEffect(() => {
    if (processedRef.current) return
    processedRef.current = true

    const code = searchParams.get('code')
    const next = searchParams.get('next') || '/'

    if (!code) {
      setStatus('error')
      setError(t('missingCode'))
      return
    }

    // Parse the `app` from the `next` URL's query string (it's a path+search, so
    // prepend a dummy origin to parse it).
    let parsedApp: string | null = null
    try {
      const nextUrl = new URL(next, window.location.origin)
      parsedApp = nextUrl.searchParams.get('app')
    } catch {
      parsedApp = null
    }

    if (!parsedApp) {
      setStatus('error')
      setError(t('missingApp'))
      return
    }

    setApp(parsedApp)

    const exchange = async () => {
      try {
        const response = await callApi<{
          user: AuthUser
          refreshToken?: string
          redirect: string
        }>('/auth/sso/exchange', {
          appName: 'ezauth',
          method: 'POST',
          body: { code, app: parsedApp },
        })

        if (!response.ok) {
          throw new Error(response.error || parseApiError(response.data) || t('exchangeFailed'))
        }

        if (!response.data) {
          throw new Error(t('exchangeFailed'))
        }

        // Persist user to auth store so `useAuth().user` resolves on downstream pages
        // (e.g. settings email-verification section). Access token lives in an httpOnly
        // cookie set by the backend, so we pass `undefined` for it and use 'httpOnly' mode.
        if (response.data.user) {
          setAuth(response.data.user, undefined, 'httpOnly', response.data.refreshToken)
        }

        // Backend returns a safe redirect path — prefer it over the client-supplied `next`.
        // Validate it client-side to block open-redirect / XSS via crafted values.
        const finalRedirect = response.data.redirect || next
        const safeRedirect = isSafeRelativePath(finalRedirect) ? finalRedirect : '/'
        router.replace(safeRedirect)
      } catch (err) {
        logger.error(
          '[SSOCallback] Exchange failed:',
          err instanceof Error ? err.message : String(err)
        )
        setStatus('error')
        setError(err instanceof Error ? err.message : t('exchangeFailed'))
      }
    }

    exchange()
  }, [searchParams, router, t, setAuth])

  if (status === 'loading') {
    return (
      <Main className="min-h-screen flex items-center justify-center" data-app={app}>
        <Div className="flex flex-col items-center gap-4">
          <Spinner />
          <P className="text-muted-foreground">{t('completing')}</P>
        </Div>
      </Main>
    )
  }

  // Error state
  return (
    <Main className="min-h-screen flex items-center justify-center px-4" data-app={app}>
      <Card variant="floating" className="max-w-md w-full" data-app={app}>
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <Div className="w-12 h-12 rounded-full bg-destructive/15 flex items-center justify-center">
            <Icon name="lucide:AlertCircle" className="w-6 h-6 text-destructive" />
          </Div>
          <P className="font-semibold text-foreground">{t('signInFailed')}</P>
          <P className="text-sm text-muted-foreground">{error}</P>
          <Button variant="default" onClick={() => router.replace('/login')}>
            {t('backToSignIn')}
          </Button>
        </CardContent>
      </Card>
    </Main>
  )
}

export default function SsoCallbackPage() {
  return (
    <Suspense
      fallback={
        <Main className="min-h-screen flex items-center justify-center">
          <Spinner />
        </Main>
      }
    >
      <SsoCallbackContent />
    </Suspense>
  )
}
