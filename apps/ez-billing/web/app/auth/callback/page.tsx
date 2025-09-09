'use client'
import { useAuth } from '@ezstart/auth-sdk'
import { Button } from '@ezstart/ui/components'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'

function CallbackContent() {
  const { handleCallback } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string>('')
  const [code, setCode] = useState<string | null>(null)

  // Extract and clean URL immediately on first render
  useEffect(() => {
    const authCode = searchParams.get('code')
    
    if (authCode && !code) {
      console.log('🔗 Extracted auth code:', authCode)
      setCode(authCode)
      
      // Clean URL immediately to prevent any re-processing
      window.history.replaceState(
        {}, 
        document.title, 
        window.location.pathname
      )
      console.log('🧹 URL cleaned, code saved for processing')
    } else if (!authCode && !code) {
      console.log('❌ No authorization code found in URL')
      setStatus('error')
      setError('No authorization code found')
    }
  }, [searchParams, code])

  // Process the saved code
  useEffect(() => {
    console.log('🔧 Processing effect triggered. code:', code, 'status:', status)
    
    if (!code || status !== 'loading') {
      console.log('⏭️ Skipping processing. code:', !!code, 'status:', status)
      return
    }

    let isProcessing = false

    const processCallback = async () => {
      if (isProcessing) return
      isProcessing = true

      try {
        console.log('🔄 Processing callback with saved code:', code)
        await handleCallback(code)
        console.log('✅ Callback processed successfully')
        
        setStatus('success')
        // Redirect to dashboard after successful auth
        setTimeout(() => router.push('/dashboard'), 1500)
      } catch (err) {
        console.error('❌ Auth callback error:', err)
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Authentication failed')
      }
    }

    // Add a small delay to avoid race conditions with AuthProvider
    const timeoutId = setTimeout(() => {
      processCallback()
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      isProcessing = false
    }
  }, [code, handleCallback, router, status])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Processing authentication...</p>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
        <div className="text-center">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-green-600 font-semibold">Authentication successful!</p>
          <p className="text-gray-600 text-sm">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      <div className="text-center">
        <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <p className="text-red-600 font-semibold">Authentication failed</p>
        <p className="text-gray-600 text-sm mb-4">{error}</p>
        <Button 
          onClick={() => router.push('/')}
        >
          Go Back
        </Button>
      </div>
    </div>
  )
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  )
}