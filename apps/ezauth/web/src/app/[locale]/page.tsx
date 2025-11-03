'use client'

import { Icon, Spinner } from '@ezstart/ui/components'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'

function HomeContent() {
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
    <div className="text-center">
      <Spinner variant="primary" size="lg" text="Redirecting to login..." textSize="sm" />
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="text-center">
          <Spinner variant="primary" size="md" text="Loading..." />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  )
}
