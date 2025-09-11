'use client'
import { Icon } from '@ezstart/ui/components'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { useAuth } from './provider.js'

interface AuthCallbackPageProps {
  /** Redirect path after successful authentication. Defaults to '/' */
  redirectTo?: string
  /** Custom success message. Defaults to 'Authentication successful!' */
  successMessage?: string
  /** Custom redirect message. Defaults to 'Redirecting...' */
  redirectMessage?: string
  /** Custom error button text. Defaults to 'Go Back' */
  errorButtonText?: string
  /** Custom error button className */
  errorButtonClassName?: string
}

function CallbackContent({
  redirectTo = '/',
  successMessage = 'Authentication successful!',
  redirectMessage = 'Redirecting...',
  errorButtonText = 'Go Back',
  errorButtonClassName = 'px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors',
}: AuthCallbackPageProps) {
  const { handleCallback } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string>('')
  const [code, setCode] = useState<string | null>(null)

  // Extract and clean URL immediately on first render
  useEffect(() => {
    console.log('🚀 [AuthCallbackPage] URL extraction useEffect triggered')
    console.log('🚀 [AuthCallbackPage] Current URL:', window.location.href)
    console.log('🚀 [AuthCallbackPage] searchParams:', Object.fromEntries(searchParams.entries()))
    console.log('🚀 [AuthCallbackPage] Current code state:', code)

    const authCode = searchParams.get('code')

    if (authCode && !code) {
      console.log('🔗 [AuthCallbackPage] Extracted auth code:', authCode)
      setCode(authCode)

      // Clean URL immediately to prevent any re-processing
      window.history.replaceState({}, document.title, window.location.pathname)
      console.log('🧹 [AuthCallbackPage] URL cleaned, code saved for processing')
      console.log('🧹 [AuthCallbackPage] New URL:', window.location.href)
    } else if (!authCode && !code) {
      console.log('❌ [AuthCallbackPage] No authorization code found in URL')
      setStatus('error')
      setError('No authorization code found')
    } else {
      console.log(
        '⏭️ [AuthCallbackPage] Skipping extraction - authCode:',
        !!authCode,
        'code state:',
        !!code
      )
    }
  }, [searchParams, code])

  // Process the saved code with global lock to prevent race conditions
  useEffect(() => {
    console.log('🔧 Processing effect triggered. code:', code, 'status:', status)

    if (!code || status !== 'loading') {
      console.log('⏭️ Skipping processing. code:', !!code, 'status:', status)
      return
    }

    // Global lock key based on the code to prevent multiple instances
    const lockKey = `auth_processing_${code}`

    // Check if another instance is already processing this code
    if (typeof window !== 'undefined' && (window as any)[lockKey]) {
      console.log('🔒 Another instance already processing this code, skipping')
      return
    }

    const processCallback = async () => {
      // Set global lock
      if (typeof window !== 'undefined') {
        ;(window as any)[lockKey] = true
        console.log('🔒 Lock acquired for code processing')
      }

      try {
        console.log('🔄 Processing callback with saved code:', code)
        await handleCallback(code)
        console.log('✅ Callback processed successfully')

        setStatus('success')
        // Redirect after successful auth
        setTimeout(() => router.push(redirectTo), 1500)
      } catch (err) {
        console.error('❌ Auth callback error:', err)
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Authentication failed')
      } finally {
        // Release global lock
        if (typeof window !== 'undefined') {
          delete (window as any)[lockKey]
          console.log('🔓 Lock released for code processing')
        }
      }
    }

    // Add a small delay to avoid race conditions with AuthProvider
    const timeoutId = setTimeout(() => {
      processCallback()
    }, 100)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [code, handleCallback, router, status, redirectTo])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Icon name="lucide:Loader2" className="w-18 h-18 bg-ezstart animate-spin" />
          <p className="text-muted-foreground">Processing authentication...</p>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p className="text-green-600 font-semibold">{successMessage}</p>
          <p className="text-muted-foreground text-sm">{redirectMessage}</p>
        </div>
      </div>
    )
  }

  // Error state
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <p className="text-red-600 font-semibold">Authentication failed</p>
        <p className="text-muted-foreground text-sm mb-4">{error}</p>
        <button onClick={() => router.push('/')} className={errorButtonClassName}>
          {errorButtonText}
        </button>
      </div>
    </div>
  )
}

/**
 * Standardized OAuth callback page component for EZAuth integration.
 * Part of @ezstart/auth-sdk - works with AuthProvider and useAuth.
 *
 * @example
 * ```tsx
 * // Basic usage
 * export default function CallbackPage() {
 *   return <AuthCallbackPage />
 * }
 *
 * // With custom redirect and messages
 * export default function CallbackPage() {
 *   return (
 *     <AuthCallbackPage
 *       redirectTo="/dashboard"
 *       successMessage="Welcome back!"
 *       redirectMessage="Taking you to dashboard..."
 *     />
 *   )
 * }
 *
 * // With custom Button component
 * import { Button } from '@ezstart/ui/components'
 *
 * export default function CallbackPage() {
 *   return <AuthCallbackPage ButtonComponent={Button} />
 * }
 * ```
 */
export function AuthCallbackPage(props: AuthCallbackPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
      }
    >
      <CallbackContent {...props} />
    </Suspense>
  )
}
