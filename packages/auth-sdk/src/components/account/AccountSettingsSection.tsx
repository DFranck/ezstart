'use client'

import { Button, Div, H3, Icon, Input, Label, P, Span } from '@ezstart/ui/components'
import { useState } from 'react'
import { toast } from 'sonner'
import type { CoreAuthClient } from '../../core/auth-client.js'
import { isEmailVerificationRequiredError } from '../../core/errors.js'
import { createSsoHandoff } from './sso-handoff.js'
import type { AccountModalTexts } from './types.js'

export interface AccountSettingsSectionProps {
  client: CoreAuthClient
  accessToken: string | null
  /** App name attached to the SSO handoff (when present, the security CTA opens cross-origin via the SSO endpoint). */
  appName: string
  /** Pre-built deep link to the EZAuth `/settings` page — `null` hides the security section. */
  ezauthSettingsUrl: string | null
  texts: AccountModalTexts
  /** Theme controller (passed through from the host app). */
  theme?: { theme?: string; setTheme: (t: string) => void }
  /** Available languages for the locale switcher. */
  languages?: { code: string; label: string }[]
  currentLocale?: string
  onLocaleChange?: (locale: string) => void
}

/**
 * Settings tab of the AccountModal — password change, advanced security
 * deep-link, theme switcher, and language switcher.
 *
 * Internal sub-component of `<AccountModal>`. Extracted to keep each file
 * below the 400-line policy ceiling without changing the public API.
 *
 * @internal
 */
export function AccountSettingsSection({
  client,
  accessToken,
  appName,
  ezauthSettingsUrl,
  texts,
  theme,
  languages,
  currentLocale,
  onLocaleChange,
}: AccountSettingsSectionProps) {
  const [editingPassword, setEditingPassword] = useState(false)
  const [currentPasswordValue, setCurrentPasswordValue] = useState('')
  const [newPasswordValue, setNewPasswordValue] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  const handleChangePassword = async () => {
    if (!newPasswordValue || newPasswordValue.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setSavingPassword(true)
    try {
      await client.changePassword(
        {
          currentPassword: currentPasswordValue || undefined,
          newPassword: newPasswordValue,
        },
        accessToken || undefined
      )
      toast.success(texts.passwordChanged)
      setCurrentPasswordValue('')
      setNewPasswordValue('')
      setEditingPassword(false)
    } catch (error) {
      // Privileged action gated behind email verification — surface the
      // dedicated, actionable message instead of the generic server text so
      // the user knows exactly what to do next (verify their email).
      if (isEmailVerificationRequiredError(error)) {
        toast.error(texts.emailVerificationRequired)
      } else {
        toast.error(error instanceof Error ? error.message : 'Failed to change password')
      }
    } finally {
      setSavingPassword(false)
    }
  }

  const handleSecurityClick = async () => {
    if (!ezauthSettingsUrl || redirecting) return
    setRedirecting(true)
    try {
      const url = await createSsoHandoff({ targetUrl: ezauthSettingsUrl, app: appName })
      window.location.href = url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to open security settings')
      setRedirecting(false)
    }
  }

  return (
    <>
      {/* Password */}
      <Div className="space-y-3">
        <H3 className="text-sm font-semibold text-foreground">{texts.passwordSection}</H3>
        {!editingPassword ? (
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={() => setEditingPassword(true)}
          >
            <Icon name="lucide:Lock" className="w-4 h-4 mr-1.5" />
            {texts.changePassword}
          </Button>
        ) : (
          <Div className="space-y-2">
            <Div>
              <Label className="text-xs text-muted-foreground">{texts.currentPassword}</Label>
              <Input
                type="password"
                value={currentPasswordValue}
                onChange={e => setCurrentPasswordValue(e.target.value)}
                placeholder={texts.currentPassword}
                className="mt-1"
              />
            </Div>
            <Div>
              <Label className="text-xs text-muted-foreground">{texts.newPassword}</Label>
              <Input
                type="password"
                value={newPasswordValue}
                onChange={e => setNewPasswordValue(e.target.value)}
                placeholder={texts.newPassword}
                className="mt-1"
              />
            </Div>
            <Div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                className="cursor-pointer"
                onClick={handleChangePassword}
                disabled={savingPassword || !newPasswordValue}
              >
                {texts.changePassword}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => {
                  setEditingPassword(false)
                  setCurrentPasswordValue('')
                  setNewPasswordValue('')
                }}
              >
                {texts.cancel}
              </Button>
            </Div>
          </Div>
        )}
      </Div>

      <Div className="h-px bg-border" />

      {/* Advanced security — link to ezauth settings (2FA, sessions, delete).
          Hidden entirely when no EZAuth web URL is configured. */}
      {ezauthSettingsUrl && (
        <>
          <Div className="space-y-2">
            <H3 className="text-sm font-semibold text-foreground">{texts.securitySection}</H3>
            {appName ? (
              <Button
                variant="outline"
                className="w-full justify-between cursor-pointer"
                onClick={handleSecurityClick}
                disabled={redirecting}
              >
                <Span>{texts.manageSecurity}</Span>
                {redirecting ? (
                  <Icon name="lucide:Loader2" size={14} className="animate-spin" />
                ) : (
                  <Icon name="lucide:ExternalLink" size={14} />
                )}
              </Button>
            ) : (
              <Button asChild variant="outline" className="w-full justify-between cursor-pointer">
                <a href={ezauthSettingsUrl} target="_blank" rel="noopener noreferrer">
                  <Span>{texts.manageSecurity}</Span>
                  <Icon name="lucide:ExternalLink" size={14} />
                </a>
              </Button>
            )}
          </Div>

          <Div className="h-px bg-border" />
        </>
      )}

      {/* Theme */}
      {theme && (
        <Div className="space-y-3">
          <H3 className="text-sm font-semibold text-foreground">{texts.themeSection}</H3>
          <Div className="flex gap-2">
            <Button
              variant={theme.theme === 'light' ? 'default' : 'outline'}
              size="sm"
              className="cursor-pointer"
              onClick={() => theme.setTheme('light')}
            >
              <Icon name="lucide:Sun" className="w-4 h-4 mr-1.5" />
              {texts.themeLight}
            </Button>
            <Button
              variant={theme.theme === 'dark' ? 'default' : 'outline'}
              size="sm"
              className="cursor-pointer"
              onClick={() => theme.setTheme('dark')}
            >
              <Icon name="lucide:Moon" className="w-4 h-4 mr-1.5" />
              {texts.themeDark}
            </Button>
            <Button
              variant={theme.theme === 'system' || !theme.theme ? 'default' : 'outline'}
              size="sm"
              className="cursor-pointer"
              onClick={() => theme.setTheme('system')}
            >
              <Icon name="lucide:Monitor" className="w-4 h-4 mr-1.5" />
              {texts.themeSystem}
            </Button>
          </Div>
        </Div>
      )}

      {/* Language */}
      {languages && languages.length > 0 && onLocaleChange && (
        <>
          {theme && <Div className="h-px bg-border" />}
          <Div className="space-y-3">
            <H3 className="text-sm font-semibold text-foreground">{texts.languageSection}</H3>
            <Div className="flex gap-2 flex-wrap">
              {languages.map(lang => (
                <Button
                  key={lang.code}
                  variant={currentLocale === lang.code ? 'default' : 'outline'}
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => onLocaleChange(lang.code)}
                >
                  {lang.label}
                </Button>
              ))}
            </Div>
          </Div>
        </>
      )}

      {!theme && (!languages || languages.length === 0) && (
        <Div className="flex items-center justify-center h-32">
          <P className="text-muted-foreground text-sm">No settings available</P>
        </Div>
      )}
    </>
  )
}
