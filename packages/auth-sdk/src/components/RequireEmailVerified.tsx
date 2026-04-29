'use client'

/**
 * Client-side guard that gates a subtree behind an email-verification check.
 *
 * Mirrors the server-side `requireEmailVerified` Express middleware so the
 * UX stays consistent across the boundary :
 *
 *   - if the active user's email is verified → render `children`
 *   - otherwise → render `fallback` (default : a polite Card with a CTA to
 *     resend the verification email)
 *   - if no user is authenticated → render `null` (the surrounding
 *     `<RequireAuth>` is expected to handle that case)
 *
 * Composable / opt-in (Clerk / Vercel pattern) — login itself is never
 * blocked. Wrap individual critical features only.
 *
 * @example
 * ```tsx
 * <RequireEmailVerified>
 *   <RefundButton />
 * </RequireEmailVerified>
 * ```
 *
 * @example Custom fallback :
 * ```tsx
 * <RequireEmailVerified fallback={<CustomVerifyPrompt />}>
 *   <BillingDashboard />
 * </RequireEmailVerified>
 * ```
 */

import { useState, type ReactNode } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Div,
  Icon,
  P,
  Spinner,
} from '@ezstart/ui/components'
import { apiCall } from '@ezstart/api-sdk'
import { logger } from './internal-logger.js'
import { useAuth } from '../react/hooks.js'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RequireEmailVerifiedTexts {
  /** Card heading shown in the default fallback. */
  title: string
  /** Card description shown in the default fallback. */
  description: string
  /** CTA label for the resend button. */
  resend: string
  /** Label while the resend request is in-flight. */
  resending: string
  /** Confirmation shown after the resend request succeeds. */
  sentTitle: string
  /** Body shown after the resend request succeeds. */
  sentDescription: string
  /** Generic fallback error message when the resend request fails. */
  fallbackError: string
}

export interface RequireEmailVerifiedProps {
  /** Subtree rendered when `user.isVerified === true`. */
  children: ReactNode
  /**
   * Custom UI rendered when the user is authenticated but has NOT verified
   * their email. Defaults to a polite Card with a "Resend verification
   * email" button.
   */
  fallback?: ReactNode
  /** Partial texts override — falls back to English defaults. */
  texts?: Partial<RequireEmailVerifiedTexts>
}

// ─── Defaults ───────────────────────────────────────────────────────────────

export const DEFAULT_REQUIRE_EMAIL_VERIFIED_TEXTS: RequireEmailVerifiedTexts = {
  title: 'Verify your email',
  description:
    'This feature is locked until you confirm your email address. Check your inbox for the verification link, or resend it below.',
  resend: 'Resend verification email',
  resending: 'Sending...',
  sentTitle: 'Verification email sent',
  sentDescription:
    'A new verification link has been sent to your inbox. Please check your spam folder if you do not see it within a few minutes.',
  fallbackError: 'Failed to send verification email. Please try again.',
}

// ─── Default fallback Card ──────────────────────────────────────────────────

interface DefaultFallbackProps {
  texts: RequireEmailVerifiedTexts
}

function DefaultFallback({ texts }: DefaultFallbackProps) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleResend = async () => {
    setSending(true)
    setError('')
    try {
      await apiCall('/auth/send-verification', {
        appName: 'ezauth',
        method: 'POST',
        body: {},
      })
      setSent(true)
    } catch (err) {
      logger.warn('Failed to resend verification email:', err)
      setError(err instanceof Error ? err.message : texts.fallbackError)
    } finally {
      setSending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <Div className="flex items-center gap-2">
          <Icon name="lucide:MailWarning" className="h-5 w-5 text-warning" ariaHidden />
          <CardTitle>{sent ? texts.sentTitle : texts.title}</CardTitle>
        </Div>
        <CardDescription>{sent ? texts.sentDescription : texts.description}</CardDescription>
      </CardHeader>
      {!sent && (
        <CardContent className="space-y-3">
          {error && (
            <Div
              role="alert"
              className="bg-destructive/15 border border-destructive/50 text-destructive px-4 py-3 rounded-md text-sm"
            >
              <P className="text-sm">{error}</P>
            </Div>
          )}
          <Button onClick={handleResend} disabled={sending} variant="outline" size="sm">
            {sending ? (
              <>
                <Spinner size="sm" />
                <span className="ml-2">{texts.resending}</span>
              </>
            ) : (
              texts.resend
            )}
          </Button>
        </CardContent>
      )}
    </Card>
  )
}

// ─── Component ──────────────────────────────────────────────────────────────

export function RequireEmailVerified({ children, fallback, texts }: RequireEmailVerifiedProps) {
  const { user } = useAuth()
  const t: RequireEmailVerifiedTexts = { ...DEFAULT_REQUIRE_EMAIL_VERIFIED_TEXTS, ...texts }

  // Surrounding `<RequireAuth>` (or equivalent) is expected to handle the
  // not-logged-in case. Don't double-render a CTA here.
  if (!user) return null

  if (user.isVerified === true) {
    return <>{children}</>
  }

  if (fallback !== undefined) {
    return <>{fallback}</>
  }

  return <DefaultFallback texts={t} />
}
