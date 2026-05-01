'use client'

import { useState } from 'react'
import { Badge, Button, Div, Icon, P, Span, Spinner } from '@ezstart/ui/components'
import { apiCall } from '@ezstart/api-sdk'
import { logger } from './internal-logger.js'
import { useAuth } from '../react/hooks.js'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EmailVerificationStatusTexts {
  verified: string
  notVerified: string
  verifiedDescription: string
  notVerifiedDescription: string
  resend: string
  resending: string
  sent: string
  sentDescription: string
  fallbackError: string
}

export interface EmailVerificationStatusProps {
  texts?: Partial<EmailVerificationStatusTexts>
}

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_TEXTS: EmailVerificationStatusTexts = {
  verified: 'Verified',
  notVerified: 'Not verified',
  verifiedDescription: 'Your email address has been verified.',
  notVerifiedDescription: 'Your email address has not been verified yet.',
  resend: 'Resend verification email',
  resending: 'Sending...',
  sent: 'Email sent',
  sentDescription: 'A verification email has been sent. Please check your inbox.',
  fallbackError: 'Failed to send verification email. Please try again.',
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Status card showing the authenticated user's email verification state
 * with a resend action when the email is unverified.
 *
 * @example
 * ```tsx
 * <EmailVerificationStatus />
 * ```
 */
export function EmailVerificationStatus({ texts }: EmailVerificationStatusProps) {
  const t = { ...DEFAULT_TEXTS, ...texts }
  const { user } = useAuth()

  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  if (!user) return null

  const isVerified = user.isVerified ?? false

  const handleResend = async () => {
    setSending(true)
    setError('')
    try {
      await apiCall('/auth/send-verification', {
        appName: 'ezauth',
        method: 'POST',
        body: { email: user.email },
      })
      setSent(true)
    } catch (err) {
      logger.warn('Failed to resend verification email:', err)
      setError(err instanceof Error ? err.message : t.fallbackError)
    } finally {
      setSending(false)
    }
  }

  return (
    <Div className="space-y-3">
      <Div className="flex items-center justify-between">
        <Div className="flex items-center gap-2">
          <Icon
            name={isVerified ? 'lucide:CheckCircle' : 'lucide:AlertCircle'}
            className={isVerified ? 'h-4 w-4 text-success' : 'h-4 w-4 text-warning'}
          />
          <Span className="text-sm font-medium text-foreground">{user.email}</Span>
        </Div>
        <Badge variant={isVerified ? 'success' : 'warning'} size="xs">
          {isVerified ? t.verified : t.notVerified}
        </Badge>
      </Div>

      <P className="text-xs text-muted-foreground">
        {isVerified ? t.verifiedDescription : t.notVerifiedDescription}
      </P>

      {error && (
        <Div className="bg-destructive/15 border border-destructive/50 text-destructive px-4 py-3 rounded-md text-sm">
          {error}
        </Div>
      )}

      {sent && (
        <Div className="bg-success/15 border border-success/50 text-success px-4 py-3 rounded-md text-sm">
          {t.sentDescription}
        </Div>
      )}

      {!isVerified && !sent && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleResend}
          disabled={sending}
          className="w-full"
        >
          {sending ? <Spinner size="sm" /> : t.resend}
        </Button>
      )}
    </Div>
  )
}
