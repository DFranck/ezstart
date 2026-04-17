'use client'
import { parseApiError } from '@ezstart/api-sdk'
import { Button, Div, P, Spinner } from '@ezstart/ui/components'
import { logger } from '@ezstart/logger'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { Suspense, useEffect, useState } from 'react'
import { useAuth } from '../react/hooks.js'

/** Module-level lock to prevent duplicate OAuth code exchanges. */
const processingLocks = new Set<string>()

/**
 * Extract a human-readable message from an unknown auth error.
 *
 * Handles: envelope `{ error: { message, code } }`, flat `{ error: string }`,
 * native `Error`, `Error` whose message is `[object Object]` (the bug this fixes),
 * plain strings, and unknown/undefined shapes.
 */
function extractAuthErrorMessage(err: unknown, fallback: string): string {
  // 1. Try API envelope parser first (handles { error: { message } }, details[], etc.)
  const parsed = parseApiError(err)
  if (parsed && parsed !== '[object Object]') return parsed

  // 2. If native Error, check its `.message` but reject `[object Object]` (the bug)
  if (err instanceof Error && err.message && err.message !== '[object Object]') {
    return err.message
  }

  // 3. Try to pull a message from common nested shapes on Error.cause or similar
  if (err instanceof Error && err.cause !== undefined) {
    const fromCause = parseApiError(err.cause)
    if (fromCause && fromCause !== '[object Object]') return fromCause
  }

  // 4. Plain string
  if (typeof err === 'string' && err.length > 0 && err !== '[object Object]') return err

  // 5. Last resort
  return fallback
}

interface AuthCallbackPageProps {
  /** Redirect path after successful authentication. Defaults to '/' */
  redirectTo?: string
  /** Custom success message. Defaults to 'Authentication successful!' */
  successMessage?: string
  /** Custom redirect message. Defaults to 'Redirecting...' */
  redirectMessage?: string
  /** Custom processing message. Defaults to 'Processing authentication...' */
  processingMessage?: string
  /** Custom error title. Defaults to 'Authentication failed' */
  errorTitle?: string
  /** Custom no-code error message. Defaults to 'No authorization code found' */
  noCodeMessage?: string
  /** Custom error button text. Defaults to 'Go Back' */
  errorButtonText?: string
}

function CallbackContent({
  redirectTo = '/',
  successMessage = 'Authentication successful!',
  redirectMessage = 'Redirecting...',
  processingMessage = 'Processing authentication...',
  errorTitle = 'Authentication failed',
  noCodeMessage = 'No authorization code found',
  errorButtonText = 'Go Back',
}: AuthCallbackPageProps): React.ReactElement {
  const { handleCallback } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string>('')

  // Use a ref to capture the code synchronously on first render, before any
  // URL cleanup or re-render can remove it from `searchParams`. This avoids
  // the race condition where `window.history.replaceState` causes
  // `useSearchParams` to re-render with an empty query string before the
  // React state update from `setCode` has committed.
  const codeRef = React.useRef<string | null>(null)

  if (codeRef.current === null) {
    // Try searchParams first (Next.js hook), then fall back to raw URL
    // in case the hook hasn't synced yet.
    const fromHook = searchParams.get('code')
    const fromUrl =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('code')
        : null
    codeRef.current = fromHook || fromUrl || ''
  }

  const code = codeRef.current || null

  // Clean URL once we've captured the code (fire-and-forget, no deps on searchParams)
  useEffect(() => {
    if (code && typeof window !== 'undefined') {
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [code])

  // Process the saved code with global lock to prevent race conditions
  useEffect(() => {
    if (!code) {
      setStatus('error')
      setError(noCodeMessage)
      return
    }

    if (status !== 'loading') {
      return
    }

    // Module-level lock to prevent multiple instances processing the same code
    const lockKey = `auth_processing_${code}`

    if (processingLocks.has(lockKey)) {
      return
    }

    const processCallback = async () => {
      processingLocks.add(lockKey)

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
        const message = extractAuthErrorMessage(err, 'Authentication failed. Please try again.')
        logger.error('[AuthCallback] Authentication failed:', message)
        setStatus('error')
        setError(message)
      } finally {
        processingLocks.delete(lockKey)
      }
    }

    // Add a small delay to avoid race conditions with AuthProvider
    const timeoutId = setTimeout(() => {
      processCallback()
    }, 100)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [code, handleCallback, router, status, redirectTo, noCodeMessage])

  if (status === 'loading') {
    return (
      <Div className="min-h-screen flex items-center justify-center">
        <Div className="flex flex-col items-center gap-4">
          <Spinner />
          <P className="text-muted-foreground">{processingMessage}</P>
        </Div>
      </Div>
    )
  }

  if (status === 'success') {
    return (
      <Div className="min-h-screen flex items-center justify-center">
        <Div className="text-center">
          <Div className="w-12 h-12 bg-success rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-success-foreground"
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
          </Div>
          <P className="text-success font-semibold">{successMessage}</P>
          <P className="text-muted-foreground text-sm">{redirectMessage}</P>
        </Div>
      </Div>
    )
  }

  // Error state
  return (
    <Div className="min-h-screen flex items-center justify-center">
      <Div className="text-center">
        <Div className="w-12 h-12 bg-destructive rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-6 h-6 text-destructive-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </Div>
        <P className="text-destructive font-semibold">{errorTitle}</P>
        <P className="text-muted-foreground text-sm mb-4">{error}</P>
        <Button onClick={() => router.push('/')} variant="default">
          {errorButtonText}
        </Button>
      </Div>
    </Div>
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
 *       errorTitle="Login failed"
 *       noCodeMessage="Missing authorization code"
 *     />
 *   )
 * }
 * ```
 */
export function AuthCallbackPage(props: AuthCallbackPageProps): React.ReactElement {
  return (
    <Suspense
      fallback={
        <Div className="min-h-screen flex items-center justify-center">
          <Spinner />
        </Div>
      }
    >
      <CallbackContent {...props} />
    </Suspense>
  )
}
