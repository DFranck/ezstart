'use client'

import { Div, Spinner } from '@ezstart/ui/components'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'
import { useTranslations } from 'next-intl'

function HomeContent() {
  const t = useTranslations('home')
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const app = searchParams.get('app')
    const redirect_uri = searchParams.get('redirect_uri')

    // Auto-redirect to login with query params
    const loginParams = new URLSearchParams()
    if (app) loginParams.set('app', app)
    if (redirect_uri) loginParams.set('redirect_uri', redirect_uri)

    router.replace(`/login?${loginParams.toString()}`)
  }, [router, searchParams])

  return (
    <Div className="text-center">
      <Spinner variant="primary" size="lg" text={t('redirecting')} textSize="sm" />
    </Div>
  )
}

export default function HomePage() {
  const t = useTranslations('home')

  return (
    <Suspense
      fallback={
        <Div className="text-center">
          <Spinner variant="primary" size="md" text={t('loading')} />
        </Div>
      }
    >
      <HomeContent />
    </Suspense>
  )
}
