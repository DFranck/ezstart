'use client'

import { Button, Div, Input, P, Spinner } from '@ezstart/ui/components'
import { callApi, parseApiError } from '@ezstart/fetch-client'
import { logger } from '@ezstart/logger'
import { useCallback, useEffect, useState } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TwoFactorSettingsTexts {
  // Status
  enabled: string
  disabled: string
  enableDescription: string
  disableDescription: string
  enableButton: string
  disableButton: string
  // Setup flow
  setupTitle: string
  setupDescription: string
  scanQR: string
  manualEntry: string
  enterCode: string
  codePlaceholder: string
  verify: string
  verifying: string
  cancel: string
  // Backup codes
  backupTitle: string
  backupDescription: string
  copyBackup: string
  downloadBackup: string
  confirmBackup: string
  done: string
  // Disable flow
  disableTitle: string
  disableConfirm: string
  // Errors
  fallbackError: string
  invalidCode: string
}

export interface TwoFactorSettingsProps {
  texts?: Partial<TwoFactorSettingsTexts>
  /** Called when 2FA is enabled or disabled */
  onStatusChange?: (enabled: boolean) => void
}

type Phase = 'idle' | 'qr' | 'backup' | 'disable'

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_TEXTS: TwoFactorSettingsTexts = {
  enabled: 'Enabled',
  disabled: 'Disabled',
  enableDescription: 'Protect your account with two-factor authentication.',
  disableDescription: 'Two-factor authentication is currently active.',
  enableButton: 'Enable 2FA',
  disableButton: 'Disable 2FA',
  setupTitle: 'Set up two-factor authentication',
  setupDescription: 'Scan the QR code with your authenticator app.',
  scanQR: 'Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)',
  manualEntry: 'Or enter this code manually:',
  enterCode: 'Enter the 6-digit code from your authenticator app',
  codePlaceholder: '000000',
  verify: 'Verify & Enable',
  verifying: 'Verifying...',
  cancel: 'Cancel',
  backupTitle: 'Backup Codes',
  backupDescription: 'Save these backup codes in a safe place. Each code can only be used once.',
  copyBackup: 'Copy codes',
  downloadBackup: 'Download codes',
  confirmBackup: "I've saved my backup codes",
  done: 'Done',
  disableTitle: 'Disable two-factor authentication',
  disableConfirm: 'Enter your current 2FA code to disable two-factor authentication',
  fallbackError: 'An error occurred. Please try again.',
  invalidCode: 'Invalid code. Please try again.',
}

// ─── Component ──────────────────────────────────────────────────────────────

export function TwoFactorSettings({ texts, onStatusChange }: TwoFactorSettingsProps) {
  const t = { ...DEFAULT_TEXTS, ...texts }

  const [is2FAEnabled, setIs2FAEnabled] = useState<boolean | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchStatus = useCallback(async () => {
    try {
      const response = await callApi('/auth/2fa/status', {
        appName: 'ezauth',
        method: 'GET',
      })
      if (response.ok) {
        const data = response.data as { isEnabled: boolean }
        setIs2FAEnabled(data.isEnabled)
      } else {
        setIs2FAEnabled(false)
      }
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
      const response = await callApi('/auth/2fa/setup', {
        appName: 'ezauth',
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error(response.error || parseApiError(response.data) || t.fallbackError)
      }
      const data = response.data as { qrCode: string; secret: string }
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
      const response = await callApi('/auth/2fa/verify', {
        appName: 'ezauth',
        method: 'POST',
        body: { code },
      })
      if (!response.ok) {
        throw new Error(response.error || parseApiError(response.data) || t.invalidCode)
      }
      const data = response.data as { backupCodes: string[] }
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
      const response = await callApi('/auth/2fa/disable', {
        appName: 'ezauth',
        method: 'POST',
        body: { code },
      })
      if (!response.ok) {
        throw new Error(response.error || parseApiError(response.data) || t.fallbackError)
      }
      setIs2FAEnabled(false)
      setPhase('idle')
      setCode('')
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
        <Div className="space-y-4">
          <P size="sm" className="text-muted-foreground">
            {t.scanQR}
          </P>

          {qrCode && (
            <Div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 rounded-lg" />
            </Div>
          )}

          <Div className="space-y-1">
            <P size="xs" className="text-muted-foreground">
              {t.manualEntry}
            </P>
            <P size="sm" className="font-mono bg-muted px-3 py-2 rounded break-all select-all">
              {secret}
            </P>
          </Div>

          <Div className="space-y-2">
            <P size="sm" className="text-muted-foreground">
              {t.enterCode}
            </P>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder={t.codePlaceholder}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              className="text-center text-lg tracking-widest"
              autoFocus
            />
            <Button
              onClick={handleVerify}
              disabled={loading || code.length !== 6}
              className="w-full"
              variant="default"
            >
              {loading ? t.verifying : t.verify}
            </Button>
            <Button
              onClick={() => {
                setPhase('idle')
                setCode('')
                setError('')
              }}
              variant="ghost"
              className="w-full"
            >
              {t.cancel}
            </Button>
          </Div>
        </Div>
      )}

      {phase === 'backup' && (
        <Div className="space-y-4">
          <P size="sm" className="font-medium">
            {t.backupTitle}
          </P>
          <P size="xs" className="text-muted-foreground">
            {t.backupDescription}
          </P>
          <Div className="grid grid-cols-2 gap-2">
            {backupCodes.map((bc, i) => (
              <P
                key={i}
                size="sm"
                className="font-mono bg-muted px-3 py-2 rounded text-center select-all"
              >
                {bc}
              </P>
            ))}
          </Div>
          <Div className="flex gap-2">
            <Button onClick={handleCopyBackup} variant="outline" className="flex-1" type="button">
              {t.copyBackup}
            </Button>
            <Button
              onClick={handleDownloadBackup}
              variant="outline"
              className="flex-1"
              type="button"
            >
              {t.downloadBackup}
            </Button>
          </Div>
          <Button
            onClick={() => {
              setPhase('idle')
              setCode('')
              setBackupCodes([])
            }}
            className="w-full"
            variant="default"
          >
            {t.confirmBackup}
          </Button>
        </Div>
      )}

      {phase === 'disable' && (
        <Div className="space-y-4">
          <P size="sm" className="text-muted-foreground">
            {t.disableConfirm}
          </P>
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder={t.codePlaceholder}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            className="text-center text-lg tracking-widest"
            autoFocus
          />
          <Button
            onClick={handleDisable}
            disabled={loading || code.length !== 6}
            className="w-full"
            variant="destructive"
          >
            {loading ? t.verifying : t.disableButton}
          </Button>
          <Button
            onClick={() => {
              setPhase('idle')
              setCode('')
              setError('')
            }}
            variant="ghost"
            className="w-full"
          >
            {t.cancel}
          </Button>
        </Div>
      )}
    </Div>
  )
}
