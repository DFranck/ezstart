'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@ezstart/auth-sdk'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { handleCallback } = useAuth()

  useEffect(() => {
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      console.error('Auth error:', error)
      router.push('/')
      return
    }

    if (code) {
      handleCallback(code)
        .then(() => {
          router.push('/')
        })
        .catch((err: Error) => {
          console.error('Callback processing failed:', err)
          router.push('/')
        })
    } else {
      router.push('/')
    }
  }, [searchParams, router, handleCallback])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">Completing authentication...</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}