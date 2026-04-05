'use client'

import { Spinner } from '@ezstart/ui/components'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { Suspense, useEffect, useState } from 'react'

export interface PaymentSuccessPageProps {
  /** Redirect path after successful payment. Defaults to '/' */
  redirectTo?: string
  /** Custom success message. Defaults to 'Payment successful!' */
  successMessage?: string
  /** Custom redirect message. Defaults to 'Redirecting...' */
  redirectMessage?: string
  /** Custom error message. Defaults to 'Payment verification failed' */
  errorMessage?: string
  /** Custom error button text. Defaults to 'Go Back' */
  errorButtonText?: string
  /** Custom error button className */
  errorButtonClassName?: string
}

function SuccessContent({
  redirectTo = '/',
  successMessage = 'Payment successful!',
  redirectMessage = 'Redirecting...',
  errorMessage = 'Payment verification failed',
  errorButtonText = 'Go Back',
  errorButtonClassName = 'px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors',
}: PaymentSuccessPageProps): React.ReactElement {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      setStatus('error')
      return
    }

    // Payment was completed via Stripe checkout — session_id present means success
    setStatus('success')

    // Clean URL to remove session_id
    window.history.replaceState({}, document.title, window.location.pathname)

    // Auto-redirect after 2 seconds
    const timeoutId = setTimeout(() => router.push(redirectTo), 2000)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [searchParams, router, redirectTo])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner />
          <p className="text-muted-foreground">{redirectMessage}</p>
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

  // Error state — no session_id found
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
        <p className="text-red-600 font-semibold">{errorMessage}</p>
        <button onClick={() => router.push('/')} className={errorButtonClassName}>
          {errorButtonText}
        </button>
      </div>
    </div>
  )
}

/**
 * Standardized payment success page component for Stripe checkout integration.
 * Part of @ezstart/pay-sdk - displays success/error after Stripe checkout redirect.
 *
 * @example
 * ```tsx
 * // Basic usage
 * export default function PaymentSuccessPage() {
 *   return <PaymentSuccessPage />
 * }
 *
 * // With i18n
 * export default function PaymentSuccessPage() {
 *   const t = useTranslations('payment')
 *   return (
 *     <PaymentSuccessPage
 *       redirectTo="/dashboard"
 *       successMessage={t('success')}
 *       redirectMessage={t('redirecting')}
 *       errorMessage={t('error')}
 *       errorButtonText={t('goBack')}
 *     />
 *   )
 * }
 * ```
 */
export function PaymentSuccessPage(props: PaymentSuccessPageProps): React.ReactElement {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <SuccessContent {...props} />
    </Suspense>
  )
}
