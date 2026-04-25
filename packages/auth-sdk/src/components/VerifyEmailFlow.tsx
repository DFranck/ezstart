'use client'

import { Div, P, Spinner } from '@ezstart/ui/components'
import { apiCall, ApiError } from '@ezstart/api-sdk'
import { logger } from './internal-logger.js'
import { useCallback, useEffect, useState } from 'react'
import { useAuthNavigation } from '../react/useAuthNavigation.js'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface VerifyEmailFlowTexts {
  verifying: string
  verifyingDescription: string
  success: string
  successDescription: string
  alreadyVerified: string
  alreadyVerifiedDescription: string
  invalid: string
  invalidDescription: string
  error: string
  errorDescription: string
  backToLogin: string
  tryAgain: string
}

export interface VerifyEmailFlowProps {
  /** Verification token from email link */
  token: string | null | undefined
  /** Back to login href (defaults to useAuthNavigation().loginHref) */
  backHref?: string
  /** Register href for "try again" when token invalid (defaults to useAuthNavigation().registerHref) */
  registerHref?: string
  /** Called when verification completes (success or already-verified) */
  onSuccess?: () => void
  texts?: Partial<VerifyEmailFlowTexts>
}

type VerifyState = 'verifying' | 'success' | 'already-verified' | 'invalid' | 'error'

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_TEXTS: VerifyEmailFlowTexts = {
  verifying: 'Verifying your email...',
  verifyingDescription: 'Please wait while we verify your email address.',
  success: 'Email verified successfully!',
  successDescription: 'You can now sign in to your account.',
  alreadyVerified: 'Email already verified',
  alreadyVerifiedDescription: 'Your email is already verified. You can sign in.',
  invalid: 'Invalid or expired link',
  invalidDescription: 'This verification link is invalid or has expired. Please request a new one.',
  error: 'Verification failed',
  errorDescription: 'An error occurred while verifying your email. Please try again.',
  backToLogin: 'Back to login',
  tryAgain: 'Request a new link',
}

// ─── Component ──────────────────────────────────────────────────────────────

export function VerifyEmailFlow({
  token,
  backHref,
  registerHref,
  onSuccess,
  texts,
}: VerifyEmailFlowProps) {
  const t = { ...DEFAULT_TEXTS, ...texts }
  const navigation = useAuthNavigation()
  const resolvedBackHref = backHref ?? navigation.loginHref
  const resolvedRegisterHref = registerHref ?? navigation.registerHref

  const [state, setState] = useState<VerifyState>(token ? 'verifying' : 'invalid')

  const verifyEmail = useCallback(async () => {
    if (!token) {
      setState('invalid')
      return
    }

    try {
      const result = await apiCall<{ message?: string }>('/auth/verify-email', {
        appName: 'ezauth',
        method: 'POST',
        body: { token },
      })

      if (result?.message?.includes('already verified')) {
        setState('already-verified')
      } else {
        setState('success')
      }
      onSuccess?.()

      logger.info('Email verified successfully')
    } catch (err) {
      if (ApiError.isApiError(err)) {
        if (err.message.includes('already verified')) {
          setState('already-verified')
          onSuccess?.()
        } else {
          setState('invalid')
        }
        return
      }
      logger.error('Email verification failed:', err)
      setState('error')
    }
  }, [token, onSuccess])

  useEffect(() => {
    if (token) {
      verifyEmail()
    }
  }, [token, verifyEmail])

  if (state === 'verifying') {
    return (
      <Div className="flex flex-col items-center gap-4 py-4">
        <Spinner variant="primary" size="lg" />
        <P className="text-sm text-muted-foreground">{t.verifying}</P>
      </Div>
    )
  }

  if (state === 'success') {
    return (
      <Div className="space-y-4">
        <P className="text-center text-sm text-success">{t.success}</P>
        <Div className="text-center">
          <a
            href={resolvedBackHref}
            className="text-sm text-muted-foreground hover:text-foreground font-medium underline-offset-4 hover:underline"
          >
            {t.backToLogin}
          </a>
        </Div>
      </Div>
    )
  }

  if (state === 'already-verified') {
    return (
      <Div className="space-y-4">
        <P className="text-center text-sm text-muted-foreground">{t.alreadyVerified}</P>
        <Div className="text-center">
          <a
            href={resolvedBackHref}
            className="text-sm text-muted-foreground hover:text-foreground font-medium underline-offset-4 hover:underline"
          >
            {t.backToLogin}
          </a>
        </Div>
      </Div>
    )
  }

  if (state === 'invalid') {
    return (
      <Div className="space-y-4">
        <P className="text-center text-sm text-destructive">{t.invalid}</P>
        <Div className="text-center space-y-2">
          <Div>
            <a
              href={resolvedRegisterHref}
              className="text-sm text-muted-foreground hover:text-foreground font-medium underline-offset-4 hover:underline"
            >
              {t.tryAgain}
            </a>
          </Div>
          <Div>
            <a
              href={resolvedBackHref}
              className="text-sm text-muted-foreground hover:text-foreground font-medium underline-offset-4 hover:underline"
            >
              {t.backToLogin}
            </a>
          </Div>
        </Div>
      </Div>
    )
  }

  // state === 'error'
  return (
    <Div className="space-y-4">
      <P className="text-center text-sm text-destructive">{t.error}</P>
      <Div className="text-center">
        <a
          href={resolvedBackHref}
          className="text-sm text-muted-foreground hover:text-foreground font-medium underline-offset-4 hover:underline"
        >
          {t.backToLogin}
        </a>
      </Div>
    </Div>
  )
}
