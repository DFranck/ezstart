'use client'

import { Button, Div, Input, P } from '@ezstart/ui/components'
import { callApi } from '@ezstart/fetch-client'
import { logger } from '@ezstart/logger'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

interface TwoFactorPromptProps {
  tempToken: string
  redirect_uri?: string | null
  onBack: () => void
}

export function TwoFactorPrompt({ tempToken, redirect_uri, onBack }: TwoFactorPromptProps) {
  const t = useTranslations('twoFactor')
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
        throw new Error((response.data as { error?: string } | null)?.error || 'Invalid 2FA code')
      }

      const result = response.data as { code?: string }

      if (redirect_uri && result.code) {
        logger.info('2FA validated, redirecting')
        const url = new URL(redirect_uri)
        url.searchParams.set('code', result.code)
        window.location.href = url.toString()
        return
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
      setLoading(false)
    }
  }

  return (
    <Div className="space-y-4">
      <P className="text-sm text-center text-muted-foreground">{t('loginPrompt')}</P>

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
          placeholder={t('codePlaceholder')}
          value={code}
          onChange={e => setCode(e.target.value)}
          className="text-center text-lg tracking-widest"
          autoFocus
        />

        <Button
          type="submit"
          disabled={loading || code.length < 6}
          className="w-full"
          variant="brand"
        >
          {loading ? t('loginVerifying') : t('loginVerify')}
        </Button>
      </form>

      <Div className="text-center">
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-muted-foreground hover:text-foreground underline"
        >
          {t('useBackupCode')}
        </button>
      </Div>
    </Div>
  )
}
