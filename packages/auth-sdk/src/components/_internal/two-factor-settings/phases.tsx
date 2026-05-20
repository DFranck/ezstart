'use client'

import { Button, Div, Input, P } from '@ezstart/ui/components'
import type { TwoFactorSettingsTexts } from './types.js'

/** @internal */
export interface QrPhaseProps {
  texts: TwoFactorSettingsTexts
  qrCode: string
  secret: string
  code: string
  loading: boolean
  onCodeChange: (code: string) => void
  onVerify: () => void
  onCancel: () => void
}

/**
 * QR-enrollment phase: shows the QR image, manual secret, and a 6-digit code
 * input with verify/cancel actions.
 *
 * @internal
 */
export function TwoFactorQrPhase({
  texts,
  qrCode,
  secret,
  code,
  loading,
  onCodeChange,
  onVerify,
  onCancel,
}: QrPhaseProps) {
  return (
    <Div className="space-y-4">
      <P size="sm" className="text-muted-foreground">
        {texts.scanQR}
      </P>

      {qrCode && (
        <Div className="flex justify-center">
          <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 rounded-lg" />
        </Div>
      )}

      <Div className="space-y-1">
        <P size="xs" className="text-muted-foreground">
          {texts.manualEntry}
        </P>
        <P size="sm" className="font-mono bg-muted px-3 py-2 rounded break-all select-all">
          {secret}
        </P>
      </Div>

      <Div className="space-y-2">
        <P size="sm" className="text-muted-foreground">
          {texts.enterCode}
        </P>
        <Input
          type="text"
          required
          aria-required="true"
          aria-label={texts.enterCode}
          autoComplete="one-time-code"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          placeholder={texts.codePlaceholder}
          value={code}
          onChange={e => onCodeChange(e.target.value.replace(/\D/g, ''))}
          className="text-center text-lg tracking-widest"
          autoFocus
        />
        <Button
          onClick={onVerify}
          disabled={loading || code.length !== 6}
          className="w-full"
          variant="default"
        >
          {loading ? texts.verifying : texts.verify}
        </Button>
        <Button onClick={onCancel} variant="ghost" className="w-full">
          {texts.cancel}
        </Button>
      </Div>
    </Div>
  )
}

/** @internal */
export interface BackupPhaseProps {
  texts: TwoFactorSettingsTexts
  backupCodes: string[]
  onCopy: () => void
  onDownload: () => void
  onConfirm: () => void
}

/**
 * Backup-codes phase: lists the one-time recovery codes with copy/download
 * actions and a confirmation CTA.
 *
 * @internal
 */
export function TwoFactorBackupPhase({
  texts,
  backupCodes,
  onCopy,
  onDownload,
  onConfirm,
}: BackupPhaseProps) {
  return (
    <Div className="space-y-4">
      <P size="sm" className="font-medium">
        {texts.backupTitle}
      </P>
      <P size="xs" className="text-muted-foreground">
        {texts.backupDescription}
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
        <Button onClick={onCopy} variant="outline" className="flex-1" type="button">
          {texts.copyBackup}
        </Button>
        <Button onClick={onDownload} variant="outline" className="flex-1" type="button">
          {texts.downloadBackup}
        </Button>
      </Div>
      <Button onClick={onConfirm} className="w-full" variant="default">
        {texts.confirmBackup}
      </Button>
    </Div>
  )
}

/** @internal */
export interface DisablePhaseProps {
  texts: TwoFactorSettingsTexts
  code: string
  disablePassword: string
  loading: boolean
  onCodeChange: (code: string) => void
  onPasswordChange: (password: string) => void
  onDisable: () => void
  onCancel: () => void
}

/**
 * Disable phase: requires the current 2FA code plus account password
 * (defense in depth) before deactivating 2FA.
 *
 * @internal
 */
export function TwoFactorDisablePhase({
  texts,
  code,
  disablePassword,
  loading,
  onCodeChange,
  onPasswordChange,
  onDisable,
  onCancel,
}: DisablePhaseProps) {
  return (
    <Div className="space-y-4">
      <P size="sm" className="text-muted-foreground">
        {texts.disableConfirm}
      </P>
      <Input
        type="text"
        required
        aria-required="true"
        aria-label={texts.disableConfirm}
        autoComplete="one-time-code"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        placeholder={texts.codePlaceholder}
        value={code}
        onChange={e => onCodeChange(e.target.value.replace(/\D/g, ''))}
        className="text-center text-lg tracking-widest"
        autoFocus
      />
      <Div className="space-y-1">
        <P size="xs" className="text-muted-foreground">
          {texts.disablePasswordHint}
        </P>
        <Input
          type="password"
          required
          aria-required="true"
          aria-label={texts.disablePasswordHint}
          autoComplete="current-password"
          placeholder={texts.disablePasswordPlaceholder}
          value={disablePassword}
          onChange={e => onPasswordChange(e.target.value)}
        />
      </Div>
      <Button
        onClick={onDisable}
        disabled={loading || code.length !== 6}
        className="w-full"
        variant="destructive"
      >
        {loading ? texts.verifying : texts.disableButton}
      </Button>
      <Button onClick={onCancel} variant="ghost" className="w-full">
        {texts.cancel}
      </Button>
    </Div>
  )
}
