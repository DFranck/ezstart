'use client'

import { Div } from '@ezstart/ui/components'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, type ReactNode } from 'react'

function AuthLayoutInner({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams()
  const app = searchParams.get('app') || undefined

  useEffect(() => {
    if (app) {
      document.documentElement.dataset.app = app
    }
    return () => {
      // Restore to ezauth when leaving auth pages
      document.documentElement.dataset.app = 'ezauth'
    }
  }, [app])

  return (
    <Div className="min-h-screen flex items-center justify-center bg-background" data-app={app}>
      {children}
    </Div>
  )
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <Div className="min-h-screen flex items-center justify-center bg-background">
          {children}
        </Div>
      }
    >
      <AuthLayoutInner>{children}</AuthLayoutInner>
    </Suspense>
  )
}
