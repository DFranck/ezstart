'use client'

import { Button, Div, P, Spinner } from '@ezstart/ui/components'
import { apiCall } from '@ezstart/api-sdk'
import { logger } from './internal-logger.js'
import { useCallback, useEffect, useState } from 'react'
import { useAuthNavigation } from '../react/useAuthNavigation.js'
import {
  resolveTwoFactorSettingsTexts,
  type TwoFactorSettingsPhase,
  type TwoFactorSettingsProps,
} from './_internal/two-factor-settings/types.js'
import {
  TwoFactorBackupPhase,
  TwoFactorDisablePhase,
  TwoFactorQrPhase,
} from './_internal/two-factor-settings/phases.js'

export type {
  TwoFactorSettingsProps,
  TwoFactorSettingsTexts,
} from './_internal/two-factor-settings/types.js'

/**
 * Settings panel for enrolling in 2FA, viewing recovery codes, and
 * disabling 2FA on the authenticated user's account.
 *
 * @example
 * ```tsx
 * <TwoFactorSettings />
 * ```
 */
export function TwoFactorSettings({
  locale: propLocale,
  texts,
  onStatusChange,
}: TwoFactorSettingsProps) {
  const navigation = useAuthNavigation()
  const locale = propLocale ?? navigation.locale
  const t = resolveTwoFactorSettingsTexts(locale, texts)

  const [is2FAEnabled, setIs2FAEnabled] = useState<boolean | null>(null)
  const [phase, setPhase] = useState<TwoFactorSettingsPhase>('idle')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [disablePassword, setDisablePassword] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchStatus = useCallback(async () => {
    try {
      const data = await apiCall<{ isEnabled: boolean }>('/auth/2fa/status', {
        appName: 'ezauth',
        method: 'GET',
      })
      setIs2FAEnabled(data.isEnabled)
    } catch (err) {
      logger.warn('Failed to fetch 2FA status:', err)
      setIs2FAEnabled(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleSetup = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await apiCall<{ qrCode: string; secret: string }>('/auth/2fa/setup', {
        appName: 'ezauth',
        method: 'POST',
      })
      setQrCode(data.qrCode)
      setSecret(data.secret)
      setPhase('qr')
    } catch (err) {
      setError(err instanceof Error ? err.message : t.fallbackError)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    if (code.length !== 6) return
    setLoading(true)
    setError('')
    try {
      const data = await apiCall<{ backupCodes: string[] }>('/auth/2fa/verify', {
        appName: 'ezauth',
        method: 'POST',
        body: { code },
      })
      setBackupCodes(data.backupCodes)
      setPhase('backup')
      setIs2FAEnabled(true)
      onStatusChange?.(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.invalidCode)
    } finally {
      setLoading(false)
    }
  }

  const handleDisable = async () => {
    if (code.length !== 6) return
    setLoading(true)
    setError('')
    try {
      // Defense in depth: send the password when the user has typed
      // one. The API treats it as optional during the deprecation
      // window but verifies it when present.
      const body: { code: string; password?: string } = { code }
      const trimmedPassword = disablePassword.trim()
      if (trimmedPassword.length > 0) {
        body.password = trimmedPassword
      }

      await apiCall('/auth/2fa/disable', {
        appName: 'ezauth',
        method: 'POST',
        body,
      })
      setIs2FAEnabled(false)
      setPhase('idle')
      setCode('')
      setDisablePassword('')
      onStatusChange?.(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.fallbackError)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyBackup = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'))
    } catch (err) {
      logger.warn('Failed to copy backup codes:', err)
    }
  }

  const handleDownloadBackup = () => {
    try {
      const blob = new Blob([backupCodes.join('\n')], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = '2fa-backup-codes.txt'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      logger.warn('Failed to download backup codes:', err)
    }
  }

  if (is2FAEnabled === null) {
    return (
      <Div className="flex items-center justify-center py-8">
        <Spinner variant="primary" size="lg" />
      </Div>
    )
  }

  return (
    <Div className="space-y-4">
      <Div className="flex items-center justify-between">
        <P className="font-medium">{is2FAEnabled ? t.disableDescription : t.enableDescription}</P>
        <P
          size="sm"
          className={is2FAEnabled ? 'text-success font-medium' : 'text-muted-foreground'}
        >
          {is2FAEnabled ? t.enabled : t.disabled}
        </P>
      </Div>

      {error && (
        <Div className="bg-destructive/15 border border-destructive/50 text-destructive px-4 py-3 rounded-md text-sm">
          {error}
        </Div>
      )}

      {phase === 'idle' && !is2FAEnabled && (
        <Button onClick={handleSetup} disabled={loading} className="w-full" variant="default">
          {loading ? <Spinner size="sm" /> : t.enableButton}
        </Button>
      )}

      {phase === 'idle' && is2FAEnabled && (
        <Button
          onClick={() => {
            setPhase('disable')
            setCode('')
            setError('')
          }}
          variant="destructive"
          className="w-full"
        >
          {t.disableButton}
        </Button>
      )}

      {phase === 'qr' && (
        <TwoFactorQrPhase
          texts={t}
          qrCode={qrCode}
          secret={secret}
          code={code}
          loading={loading}
          onCodeChange={setCode}
          onVerify={handleVerify}
          onCancel={() => {
            setPhase('idle')
            setCode('')
            setError('')
          }}
        />
      )}

      {phase === 'backup' && (
        <TwoFactorBackupPhase
          texts={t}
          backupCodes={backupCodes}
          onCopy={handleCopyBackup}
          onDownload={handleDownloadBackup}
          onConfirm={() => {
            setPhase('idle')
            setCode('')
            setBackupCodes([])
          }}
        />
      )}

      {phase === 'disable' && (
        <TwoFactorDisablePhase
          texts={t}
          code={code}
          disablePassword={disablePassword}
          loading={loading}
          onCodeChange={setCode}
          onPasswordChange={setDisablePassword}
          onDisable={handleDisable}
          onCancel={() => {
            setPhase('idle')
            setCode('')
            setDisablePassword('')
            setError('')
          }}
        />
      )}
    </Div>
  )
}
