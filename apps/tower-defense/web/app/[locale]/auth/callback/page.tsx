'use client'

import { useAuth } from '@ezstart/auth-sdk'
import { Icon, Main } from '@ezstart/ui/components'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { handleCallback } = useAuth()

  useEffect(() => {
    const processCallback = async () => {
      try {
        const code = searchParams.get('code')
        if (!code) {
          throw new Error('No authorization code provided')
        }

        await handleCallback(code)
        router.push('/')
      } catch (error) {
        console.error('OAuth callback error:', error)
        router.push('/?error=auth_failed')
      }
    }

    processCallback()
  }, [handleCallback, router, searchParams])

  return (
    <Main>
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Icon name="fa:FaSpinner" spin className="w-8 h-8 mb-4 mx-auto" />
          <p className="text-gray-600">Completing authentication...</p>
        </div>
      </div>
    </Main>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <Main>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Icon name="fa:FaSpinner" spin className="w-8 h-8 mb-4 mx-auto" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </Main>
    }>
      <CallbackContent />
    </Suspense>
  )
}