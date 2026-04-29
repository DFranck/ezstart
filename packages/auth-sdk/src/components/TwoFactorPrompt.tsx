'use client'

import { Button, Div, Input, P } from '@ezstart/ui/components'
import { apiCall } from '@ezstart/api-sdk'
import { logger } from './internal-logger.js'
import { useEffect, useRef, useState } from 'react'
import { detectCurrentThemePreference } from './themePreference.js'
import { buildPostLoginRedirect } from './postLoginRedirect.js'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TwoFactorPromptTexts {
  prompt: string
  codePlaceholder: string
  backupCodeHint: string
  verify: string
  verifying: string
  back: string
  fallbackError: string
}

export interface TwoFactorPromptProps {
  /** Temporary token from the login response */
  tempToken: string
  /** Redirect URI after successful 2FA verification */
  redirectUri?: string
  /** Called when user wants to go back to the login form */
  onBack?: () => void
  /** Called after successful 2FA (if not using redirect) */
  onSuccess?: (result: { code?: string }) => void
  /** Override texts */
  texts?: Partial<TwoFactorPromptTexts>
}

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_TEXTS: TwoFactorPromptTexts = {
  prompt: 'Enter the code from your authenticator app',
  codePlaceholder: '000000',
  backupCodeHint: 'Or enter an 8-character backup code',
  verify: 'Verify',
  verifying: 'Verifying...',
  back: 'Back to login',
  fallbackError: 'An error occurred. Please try again.',
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * A 6-digit TOTP code looks like `123456`. Backup codes are 8 hex
 * characters (`a1b2c3d4`). We accept either format in the same input
 * but auto-submit ONLY for TOTP (the natural UX — backup codes are
 * pasted then explicitly clicked to confirm).
 */
const TOTP_PATTERN = /^\d{6}$/

// ─── Component ──────────────────────────────────────────────────────────────

export function TwoFactorPrompt({
  tempToken,
  redirectUri,
  onBack,
  onSuccess,
  texts,
}: TwoFactorPromptProps) {
  const t = { ...DEFAULT_TEXTS, ...texts }
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Auto-submit guard so we don't fire twice if React re-renders mid-state
  const autoSubmittedRef = useRef(false)

  const submit = async (codeToSubmit: string) => {
    if (loading) return
    setLoading(true)
    setError('')

    try {
      const result = await apiCall<{ code?: string }>('/auth/2fa/validate', {
        appName: 'ezauth',
        method: 'POST',
        body: { tempToken, code: codeToSubmit },
      })

      // Redirect with authorization code.
      //
      // Same logic as `SignInForm` — see `buildPostLoginRedirect` for the
      // full rationale. Cross-origin → SSO code flow (append `?code=` and
      // `?theme=`). Same-origin → direct redirect (cookie already set by
      // the API response, no callback handler on the destination page).
      if (redirectUri && result.code) {
        logger.info('2FA validated, redirecting')
        const themePref = detectCurrentThemePreference()
        const target = buildPostLoginRedirect(
          redirectUri,
          result.code,
          themePref,
          window.location.origin
        )
        window.location.href = target
        return
      }

      // No redirect — call onSuccess callback
      onSuccess?.(result)
      setLoading(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : t.fallbackError
      setError(message)
      setLoading(false)
      // Allow another auto-submit attempt after a manual edit
      autoSubmittedRef.current = false
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = code.trim()
    if (trimmed.length < 6) return
    void submit(trimmed)
  }

  const handleChange = (raw: string) => {
    // Strip whitespace from both ends; keep internal chars (paste safety)
    const next = raw.replace(/\s+/g, '')
    setCode(next)
    if (error) setError('')
    // Reset guard whenever the user manually edits the value
    if (next.length < 6) autoSubmittedRef.current = false
  }

  // Auto-submit at the natural TOTP boundary (6 digits). Backup codes
  // (8 hex) require explicit click — they are typically pasted, and a
  // pasted 6-digit prefix would be a frustrating false trigger.
  useEffect(() => {
    if (autoSubmittedRef.current) return
    if (loading) return
    if (TOTP_PATTERN.test(code)) {
      autoSubmittedRef.current = true
      void submit(code)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, loading])

  return (
    <Div className="space-y-4">
      <P className="text-sm text-center text-muted-foreground">{t.prompt}</P>

      {error && (
        <Div className="bg-destructive/15 border border-destructive/50 text-destructive px-4 py-3 rounded-md text-sm">
          {error}
        </Div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="text"
          inputMode="numeric"
          // Permit digits (TOTP) OR hex (backup codes). The visual
          // placeholder `000000` plus the `backupCodeHint` below tells
          // the user both are accepted.
          pattern="[0-9a-fA-F]*"
          maxLength={8}
          autoComplete="one-time-code"
          placeholder={t.codePlaceholder}
          value={code}
          onChange={e => handleChange(e.target.value)}
          className="text-center text-lg tracking-widest"
          autoFocus
        />

        <P size="xs" className="text-center text-muted-foreground">
          {t.backupCodeHint}
        </P>

        <Button
          type="submit"
          disabled={loading || code.trim().length < 6}
          className="w-full cursor-pointer"
          variant="default"
        >
          {loading ? t.verifying : t.verify}
        </Button>
      </form>

      {onBack && (
        <Div className="text-center">
          <Button
            type="button"
            variant="link"
            className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={onBack}
          >
            {t.back}
          </Button>
        </Div>
      )}
    </Div>
  )
}
