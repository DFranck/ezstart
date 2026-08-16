import { getAuthTexts } from '../../../i18n/index.js'

/**
 * User-facing strings consumed by `<TwoFactorSettings>`. English defaults are
 * provided via {@link TWO_FACTOR_SETTINGS_DEFAULT_TEXTS}; consumer overrides
 * via the `texts` prop take precedence over the localized dictionary.
 *
 * @internal
 */
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
  disablePasswordLabel: string
  disablePasswordPlaceholder: string
  disablePasswordHint: string
  // Errors
  fallbackError: string
  invalidCode: string
}

/** @internal */
export interface TwoFactorSettingsProps {
  /**
   * Locale for embedded dictionaries (en | fr | vi). Defaults to the active
   * locale detected from the URL pathname (e.g. `/fr/settings` → `'fr'`).
   * Any keys provided in `texts` take precedence over the localized defaults.
   */
  locale?: import('../../../i18n/index.js').AuthLocale | string
  /** Override texts (merged on top of the localized defaults). */
  texts?: Partial<TwoFactorSettingsTexts>
  /** Called when 2FA is enabled or disabled */
  onStatusChange?: (enabled: boolean) => void
}

/** Setup/disable flow phase. @internal */
export type TwoFactorSettingsPhase = 'idle' | 'qr' | 'backup' | 'disable'

/** @internal */
export const TWO_FACTOR_SETTINGS_DEFAULT_TEXTS: TwoFactorSettingsTexts = {
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
  disablePasswordLabel: 'Password',
  disablePasswordPlaceholder: 'Enter your password',
  disablePasswordHint: 'Confirm with your account password (defense in depth)',
  fallbackError: 'An error occurred. Please try again.',
  invalidCode: 'Invalid code. Please try again.',
}

/**
 * Resolve the active text bundle from the shared `twoFactor` namespace.
 *
 * The shared `twoFactor` namespace covers both prompt + settings keys. For
 * `<TwoFactorSettings>` the canonical "Verify & Enable" copy lives under
 * `settingsVerify` (the bare `verify` key is the shorter "Verify" label
 * rendered by `<TwoFactorPrompt>`). Map back into the local shape, then
 * layer any consumer overrides on top.
 *
 * @internal
 */
export function resolveTwoFactorSettingsTexts(
  locale: TwoFactorSettingsProps['locale'],
  overrides?: Partial<TwoFactorSettingsTexts>
): TwoFactorSettingsTexts {
  const d = TWO_FACTOR_SETTINGS_DEFAULT_TEXTS
  const dict = getAuthTexts(locale, 'twoFactor') as Record<string, string>
  return {
    enabled: dict.enabled ?? d.enabled,
    disabled: dict.disabled ?? d.disabled,
    enableDescription: dict.enableDescription ?? d.enableDescription,
    disableDescription: dict.disableDescription ?? d.disableDescription,
    enableButton: dict.enableButton ?? d.enableButton,
    disableButton: dict.disableButton ?? d.disableButton,
    setupTitle: dict.setupTitle ?? d.setupTitle,
    setupDescription: dict.setupDescription ?? d.setupDescription,
    scanQR: dict.scanQR ?? d.scanQR,
    manualEntry: dict.manualEntry ?? d.manualEntry,
    enterCode: dict.enterCode ?? d.enterCode,
    codePlaceholder: dict.codePlaceholder ?? d.codePlaceholder,
    verify: dict.settingsVerify ?? d.verify,
    verifying: dict.verifying ?? d.verifying,
    cancel: dict.cancel ?? d.cancel,
    backupTitle: dict.backupTitle ?? d.backupTitle,
    backupDescription: dict.backupDescription ?? d.backupDescription,
    copyBackup: dict.copyBackup ?? d.copyBackup,
    downloadBackup: dict.downloadBackup ?? d.downloadBackup,
    confirmBackup: dict.confirmBackup ?? d.confirmBackup,
    done: dict.done ?? d.done,
    disableTitle: dict.disableTitle ?? d.disableTitle,
    disableConfirm: dict.disableConfirm ?? d.disableConfirm,
    disablePasswordLabel: dict.disablePasswordLabel ?? d.disablePasswordLabel,
    disablePasswordPlaceholder: dict.disablePasswordPlaceholder ?? d.disablePasswordPlaceholder,
    disablePasswordHint: dict.disablePasswordHint ?? d.disablePasswordHint,
    fallbackError: dict.fallbackError ?? d.fallbackError,
    invalidCode: dict.invalidCode ?? d.invalidCode,
    ...overrides,
  }
}
