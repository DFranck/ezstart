'use client'

import { Button, Div, Input, P } from '@ezstart/ui/components'
import { callApi, parseApiError } from '@ezstart/fetch-client'
import { logger } from '@ezstart/logger'
import { useState } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TwoFactorPromptTexts {
  prompt: string
  codePlaceholder: string
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
  verify: 'Verify',
  verifying: 'Verifying...',
  back: 'Back to login',
  fallbackError: 'An error occurred. Please try again.',
}

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading || code.length < 6) return

    setLoading(true)
    setError('')

    try {
      const response = await callApi('/auth/2fa/validate', {
        appName: 'ezauth',
        method: 'POST',
        body: { tempToken, code },
      })

      if (!response.ok) {
        throw new Error(response.error || parseApiError(response.data) || 'Invalid 2FA code')
      }

      const result = response.data as { code?: string }

      // Redirect with authorization code
      if (redirectUri && result.code) {
        logger.info('2FA validated, redirecting')
        const url = new URL(redirectUri)
        url.searchParams.set('code', result.code)
        window.location.href = url.toString()
        return
      }

      // No redirect — call onSuccess callback
      onSuccess?.(result)
      setLoading(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : t.fallbackError
      setError(message)
      setLoading(false)
    }
  }

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
          pattern="[0-9a-fA-F]*"
          maxLength={8}
          placeholder={t.codePlaceholder}
          value={code}
          onChange={e => setCode(e.target.value)}
          className="text-center text-lg tracking-widest"
          autoFocus
        />

        <Button
          type="submit"
          disabled={loading || code.length < 6}
          className="w-full cursor-pointer"
          variant="brand"
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
