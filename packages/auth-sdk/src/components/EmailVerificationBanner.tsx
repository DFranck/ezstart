'use client'

/**
 * Persistent top-of-page banner shown when the active user is signed in
 * but has NOT verified their email address.
 *
 * Composable, opt-in (Clerk / Vercel pattern) — drop it in the consumer
 * app's root layout once and it surfaces a single, dismissible warning
 * banner across every page until the user verifies. Login itself is
 * never blocked.
 *
 * @example
 * ```tsx
 * // In the consumer app's [locale]/layout.tsx
 * <EmailVerificationBanner sticky />
 * <main>{children}</main>
 * ```
 */

import { useState } from 'react'
import { Button, Div, Icon, P, Span } from '@ezstart/ui/components'
import { apiCall } from '@ezstart/api-sdk'
import { logger } from './internal-logger.js'
import { useAuth } from '../react/hooks.js'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EmailVerificationBannerTexts {
  /** Headline shown at the start of the banner. */
  heading: string
  /**
   * Body text. The user's email address is appended in `<Span className="font-medium">{email}</Span>`
   * after the heading — keep this short.
   */
  description: string
  /** CTA button label. */
  resend: string
  /** Label while the resend request is in-flight. */
  resending: string
  /** Headline shown after the resend request succeeds. */
  sentHeading: string
  /** Body shown after the resend request succeeds. */
  sentDescription: string
  /** Aria-label for the dismiss button. */
  dismissAriaLabel: string
  /** Generic fallback error message when the resend request fails. */
  fallbackError: string
}

export interface EmailVerificationBannerProps {
  /**
   * When true, the banner is rendered with `position: sticky; top: 0` so it
   * stays visible while users scroll. Defaults to `false` (rendered as a
   * normal block element — caller controls placement).
   */
  sticky?: boolean
  /** Optional className appended to the root banner. */
  className?: string
  /** Partial texts override — falls back to English defaults. */
  texts?: Partial<EmailVerificationBannerTexts>
}

// ─── Defaults ───────────────────────────────────────────────────────────────

export const DEFAULT_EMAIL_VERIFICATION_BANNER_TEXTS: EmailVerificationBannerTexts = {
  heading: 'Please verify your email',
  description:
    "We sent a verification link to your inbox. Verify your address to unlock the full experience — your account works in the meantime, but some features stay locked until you confirm it's really you.",
  resend: 'Resend email',
  resending: 'Sending...',
  sentHeading: 'Verification email sent',
  sentDescription:
    'A new verification link has been sent. Please check your inbox (and spam folder).',
  dismissAriaLabel: 'Dismiss banner',
  fallbackError: 'Failed to send verification email. Please try again.',
}

// ─── Component ──────────────────────────────────────────────────────────────

export function EmailVerificationBanner({
  sticky = false,
  className,
  texts,
}: EmailVerificationBannerProps) {
  const t: EmailVerificationBannerTexts = {
    ...DEFAULT_EMAIL_VERIFICATION_BANNER_TEXTS,
    ...texts,
  }
  const { user } = useAuth()

  const [dismissed, setDismissed] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  // Hide entirely when not logged in, already verified, or session-dismissed.
  if (!user || user.isVerified === true || dismissed) {
    return null
  }

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
      setError(err instanceof Error ? err.message : t.fallbackError)
    } finally {
      setSending(false)
    }
  }

  const classNames = [
    'w-full border-b border-warning/40 bg-warning/15 text-warning-foreground px-4 py-3 text-sm',
    sticky ? 'sticky top-0 z-50' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Div role="alert" aria-live="polite" className={classNames}>
      <Div className="mx-auto flex max-w-7xl items-start gap-3">
        <Icon
          name={sent ? 'lucide:MailCheck' : 'lucide:MailWarning'}
          className="mt-0.5 h-5 w-5 shrink-0"
          ariaHidden
        />
        <Div className="flex-1 space-y-1">
          <P className="font-medium">{sent ? t.sentHeading : t.heading}</P>
          {sent ? (
            <P className="text-sm opacity-90">{t.sentDescription}</P>
          ) : (
            <>
              <P className="text-sm opacity-90">
                {t.description} <Span className="font-medium">{user.email}</Span>
              </P>
              {error && (
                <P className="text-sm text-destructive" role="status">
                  {error}
                </P>
              )}
            </>
          )}
        </Div>
        <Div className="flex shrink-0 items-center gap-2">
          {!sent && (
            <Button
              onClick={handleResend}
              disabled={sending}
              variant="outline"
              size="sm"
              className="border-warning/40 text-warning-foreground hover:bg-warning/20"
            >
              {sending ? t.resending : t.resend}
            </Button>
          )}
          <Button
            onClick={() => setDismissed(true)}
            variant="ghost"
            size="icon"
            aria-label={t.dismissAriaLabel}
            className="text-warning-foreground hover:bg-warning/20"
          >
            <Icon name="lucide:X" className="h-4 w-4" ariaHidden />
          </Button>
        </Div>
      </Div>
    </Div>
  )
}
