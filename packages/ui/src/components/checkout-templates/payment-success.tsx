'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import React, { Suspense, useEffect, useState } from 'react'
import { Spinner } from '../feedback/spinner'

export interface PaymentSuccessTemplateProps {
  /** Redirect path after successful payment. Defaults to '/' */
  redirectTo?: string
  /**
   * Fallback href used by the error-state "Go Back" button when no `session_id`
   * is present. Defaults to `'/'`. Consumers should pass a locale-prefixed
   * path (e.g. `` `/${locale}` ``) to avoid hitting the non-localized root 404.
   */
  fallbackHref?: string
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
  fallbackHref = '/',
  successMessage = 'Payment successful!',
  redirectMessage = 'Redirecting...',
  errorMessage = 'Payment verification failed',
  errorButtonText = 'Go Back',
  errorButtonClassName = 'px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors',
}: PaymentSuccessTemplateProps): React.ReactElement {
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
          <div className="w-12 h-12 bg-success rounded-full flex items-center justify-center mx-auto mb-4">
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
          </div>
          <p className="text-success font-semibold">{successMessage}</p>
          <p className="text-muted-foreground text-sm">{redirectMessage}</p>
        </div>
      </div>
    )
  }

  // Error state — no session_id found
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 bg-destructive rounded-full flex items-center justify-center mx-auto mb-4">
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
        </div>
        <p className="text-destructive font-semibold">{errorMessage}</p>
        <button onClick={() => router.push(fallbackHref)} className={errorButtonClassName}>
          {errorButtonText}
        </button>
      </div>
    </div>
  )
}

/**
 * Standardized payment success page template for Stripe checkout integration.
 * Drop-in landing page that reads `?session_id=` from the URL, displays
 * success / error state, then auto-redirects after 2 seconds on success.
 *
 * Originally `PaymentSuccessPage` from `@ezstart/pay-sdk` — generalized to
 * `@ezstart/ui` because the primitive has zero payment coupling (it only
 * reads a generic `session_id` query param and renders a status panel).
 *
 * @example
 * ```tsx
 * 'use client'
 * import { PaymentSuccessTemplate } from '@ezstart/ui/components'
 *
 * export default function Page() {
 *   return <PaymentSuccessTemplate redirectTo="/dashboard" />
 * }
 * ```
 *
 * @example with i18n
 * ```tsx
 * 'use client'
 * import { useTranslations } from 'next-intl'
 * import { PaymentSuccessTemplate } from '@ezstart/ui/components'
 *
 * export default function Page() {
 *   const t = useTranslations('payment')
 *   return (
 *     <PaymentSuccessTemplate
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
export function PaymentSuccessTemplate(props: PaymentSuccessTemplateProps): React.ReactElement {
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

PaymentSuccessTemplate.displayName = 'PaymentSuccessTemplate'
