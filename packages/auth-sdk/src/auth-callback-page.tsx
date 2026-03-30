'use client'
import { Spinner } from '@ezstart/ui/components'
import { logger } from '@ezstart/logger'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { Suspense, useEffect, useState } from 'react'
import { useAuth } from './provider.js'

interface AuthCallbackPageProps {
  /** Redirect path after successful authentication. Defaults to '/' */
  redirectTo?: string
  /** Custom success message. Defaults to 'Authentication successful!' */
  successMessage?: string
  /** Custom redirect message. Defaults to 'Redirecting...' */
  redirectMessage?: string
  /** Custom processing message. Defaults to 'Processing authentication...' */
  processingMessage?: string
  /** Custom error button text. Defaults to 'Go Back' */
  errorButtonText?: string
  /** Custom error button className */
  errorButtonClassName?: string
}

function CallbackContent({
  redirectTo = '/',
  successMessage = 'Authentication successful!',
  redirectMessage = 'Redirecting...',
  processingMessage = 'Processing authentication...',
  errorButtonText = 'Go Back',
  errorButtonClassName = 'px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors',
}: AuthCallbackPageProps): React.ReactElement {
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
      setCode(authCode)
      // Clean URL immediately to prevent any re-processing
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (!authCode && !code) {
      setStatus('error')
      setError('No authorization code found')
    }
  }, [searchParams, code])

  // Process the saved code with global lock to prevent race conditions
  useEffect(() => {
    if (!code || status !== 'loading') {
      return
    }

    // Global lock key based on the code to prevent multiple instances
    const lockKey = `auth_processing_${code}`

    // Check if another instance is already processing this code
    if (typeof window !== 'undefined' && (window as unknown as Record<string, boolean>)[lockKey]) {
      return
    }

    const processCallback = async () => {
      // Set global lock
      if (typeof window !== 'undefined') {
        ;(window as unknown as Record<string, boolean>)[lockKey] = true
      }

      try {
        await handleCallback(code)
        setStatus('success')

        // Get saved redirect URL from localStorage (set by redirectToLogin)
        const savedRedirect =
          typeof window !== 'undefined' ? localStorage.getItem('ezauth_redirect_after_login') : null

        // Use saved redirect if available, otherwise use prop default
        const finalRedirect = savedRedirect || redirectTo

        // Clear saved redirect
        if (typeof window !== 'undefined' && savedRedirect) {
          localStorage.removeItem('ezauth_redirect_after_login')
        }

        // Redirect after successful auth
        setTimeout(() => router.push(finalRedirect), 1500)
      } catch (err) {
        logger.error(
          '[AuthCallback] Authentication failed:',
          err instanceof Error ? err.message : String(err)
        )
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Authentication failed')
      } finally {
        // Release global lock
        if (typeof window !== 'undefined') {
          delete (window as unknown as Record<string, boolean>)[lockKey]
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
          <Spinner />
          <p className="text-muted-foreground">{processingMessage}</p>
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
export function AuthCallbackPage(props: AuthCallbackPageProps): React.ReactElement {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <CallbackContent {...props} />
    </Suspense>
  )
}
