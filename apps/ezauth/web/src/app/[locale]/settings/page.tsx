'use client'

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Div,
  Input,
  P,
  Spinner,
} from '@ezstart/ui/components'
import { BackButton } from '@ezstart/ui/components'
import { ThemeSwitcher } from '@ezstart/next-theme/components'
import { callApi, parseApiError } from '@ezstart/fetch-client'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

type SetupPhase = 'idle' | 'qr' | 'backup' | 'disable'

export default function SettingsPage() {
  const t = useTranslations('twoFactor')
  const ts = useTranslations('settings')
  const [is2FAEnabled, setIs2FAEnabled] = useState<boolean | null>(null)
  const [phase, setPhase] = useState<SetupPhase>('idle')
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
      }
    } catch {
      // Non-critical
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
        throw new Error(response.error || parseApiError(response.data) || 'Setup failed')
      }
      const data = response.data as { qrCode: string; secret: string }
      setQrCode(data.qrCode)
      setSecret(data.secret)
      setPhase('qr')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed')
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
        throw new Error(response.error || parseApiError(response.data) || 'Verification failed')
      }
      const data = response.data as { backupCodes: string[] }
      setBackupCodes(data.backupCodes)
      setPhase('backup')
      setIs2FAEnabled(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
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
        throw new Error(response.error || parseApiError(response.data) || 'Disable failed')
      }
      setIs2FAEnabled(false)
      setPhase('idle')
      setCode('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disable failed')
    } finally {
      setLoading(false)
    }
  }

  if (is2FAEnabled === null) {
    return (
      <Div className="flex items-center justify-center min-h-[50vh]">
        <Spinner variant="primary" size="lg" />
      </Div>
    )
  }

  return (
    <Card className="max-w-md w-full relative">
      <Div className="absolute top-4 left-4">
        <BackButton />
      </Div>
      <Div className="absolute top-4 right-4">
        <ThemeSwitcher />
      </Div>

      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl md:text-2xl font-bold">{ts('title')}</CardTitle>
        <CardDescription>{ts('security')}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 2FA Status */}
        <Div className="space-y-4">
          <Div className="flex items-center justify-between">
            <P className="font-medium">{t('title')}</P>
            <P
              size="sm"
              className={is2FAEnabled ? 'text-success font-medium' : 'text-muted-foreground'}
            >
              {is2FAEnabled ? t('enabled') : t('disabled')}
            </P>
          </Div>

          {error && (
            <Div className="bg-destructive/15 border border-destructive/50 text-destructive px-4 py-3 rounded-md text-sm">
              {error}
            </Div>
          )}

          {/* Idle state — show setup or disable button */}
          {phase === 'idle' && !is2FAEnabled && (
            <Button onClick={handleSetup} disabled={loading} className="w-full" variant="brand">
              {loading ? <Spinner size="sm" /> : t('setup')}
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
              {t('disable')}
            </Button>
          )}

          {/* QR Code phase */}
          {phase === 'qr' && (
            <Div className="space-y-4">
              <P size="sm" className="text-muted-foreground">
                {t('scanQrCode')}
              </P>

              {qrCode && (
                <Div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 rounded-lg" />
                </Div>
              )}

              <Div className="space-y-1">
                <P size="xs" className="text-muted-foreground">
                  {t('manualEntry')}
                </P>
                <P size="sm" className="font-mono bg-muted px-3 py-2 rounded break-all select-all">
                  {secret}
                </P>
              </Div>

              <Div className="space-y-2">
                <P size="sm" className="text-muted-foreground">
                  {t('enterCode')}
                </P>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder={t('codePlaceholder')}
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-lg tracking-widest"
                  autoFocus
                />
                <Button
                  onClick={handleVerify}
                  disabled={loading || code.length !== 6}
                  className="w-full"
                  variant="brand"
                >
                  {loading ? t('verifying') : t('verify')}
                </Button>
              </Div>
            </Div>
          )}

          {/* Backup codes phase */}
          {phase === 'backup' && (
            <Div className="space-y-4">
              <P size="sm" className="font-medium">
                {t('backupCodes')}
              </P>
              <P size="xs" className="text-muted-foreground">
                {t('backupCodesDescription')}
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
              <Button
                onClick={() => {
                  setPhase('idle')
                  setCode('')
                  setBackupCodes([])
                }}
                className="w-full"
                variant="brand"
              >
                {t('backupCodesSaved')}
              </Button>
            </Div>
          )}

          {/* Disable phase */}
          {phase === 'disable' && (
            <Div className="space-y-4">
              <P size="sm" className="text-muted-foreground">
                {t('disableConfirm')}
              </P>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder={t('codePlaceholder')}
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
                {loading ? t('disabling') : t('disableButton')}
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
                Cancel
              </Button>
            </Div>
          )}
        </Div>

        {/* Sessions link */}
        <Div className="border-t pt-4">
          <Link href="/settings/sessions">
            <Button variant="outline" className="w-full">
              {ts('sessions')}
            </Button>
          </Link>
        </Div>
      </CardContent>
    </Card>
  )
}
