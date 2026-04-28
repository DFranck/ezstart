'use client'

import { Badge, Button, Div, H3, Icon, Input, Label, P, Span } from '@ezstart/ui/components'
import { apiCall } from '@ezstart/api-sdk'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import type { CoreAuthClient } from '../../core/auth-client.js'
import type { AuthUser } from '../../core/types.js'
import { UserAvatar } from '../UserAvatar.js'
import { type AccountModalTexts, formatAccountDate } from './types.js'

export interface AccountProfileSectionProps {
  user: AuthUser
  client: CoreAuthClient
  accessToken: string | null
  appName: string
  /** Active locale + redirect URI for the resend-verification call. */
  navigation: { app?: string; redirectUri?: string }
  texts: AccountModalTexts
  /** Optional Google OAuth URL — when omitted the connect button stays disabled. */
  googleOAuthUrl?: string
  /** Update the user in the store after profile/avatar mutations. */
  onUserUpdated: (user: AuthUser) => void
  /** Open the avatar cropper with the picked file (data URL). */
  onAvatarFilePicked: (dataUrl: string) => void
  /** Whether an avatar upload is currently in flight (controls overlay spinner). */
  savingAvatar: boolean
}

/**
 * Profile tab of the AccountModal — avatar, name, email + verification,
 * connected accounts and member-since row.
 *
 * Internal sub-component of `<AccountModal>`. Extracted to keep each file
 * below the 400-line policy ceiling without changing the public API.
 *
 * @internal
 */
export function AccountProfileSection({
  user,
  client,
  accessToken,
  appName,
  navigation,
  texts,
  googleOAuthUrl,
  onUserUpdated,
  onAvatarFilePicked,
  savingAvatar,
}: AccountProfileSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [editing, setEditing] = useState(false)
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [sendingVerification, setSendingVerification] = useState(false)

  const isVerified = Boolean((user as { isVerified?: boolean }).isVerified)
  const fullName = user.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`
    : user.username

  const startEditing = () => {
    setEditFirstName(user.firstName || '')
    setEditLastName(user.lastName || '')
    setEditing(true)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onAvatarFilePicked(reader.result as string)
    reader.readAsDataURL(file)
    // Reset input so the same file can be re-selected
    e.target.value = ''
  }

  const saveProfile = async () => {
    setSavingProfile(true)
    try {
      const updatedUser = await client.updateProfile(
        { firstName: editFirstName, lastName: editLastName },
        accessToken || undefined
      )
      onUserUpdated(updatedUser)
      toast.success(texts.profileUpdated)
      setEditing(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleResendVerification = async () => {
    if (!user?.email || sendingVerification) return
    setSendingVerification(true)
    try {
      const effectiveApp = navigation.app || appName
      await apiCall('/auth/send-verification', {
        appName: 'ezauth',
        method: 'POST',
        body: {
          email: user.email,
          ...(effectiveApp && { app: effectiveApp }),
          ...(navigation.redirectUri && { redirect_uri: navigation.redirectUri }),
        },
      })
      toast.success(texts.verificationSent)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : texts.verifyError)
    } finally {
      setSendingVerification(false)
    }
  }

  const handleConnectGoogle = () => {
    if (googleOAuthUrl) window.location.href = googleOAuthUrl
  }

  return (
    <>
      {/* Hidden file input for avatar upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Avatar + name */}
      <Div className="flex items-center gap-4">
        <Div
          className="relative cursor-pointer group shrink-0"
          onClick={() => fileInputRef.current?.click()}
        >
          <UserAvatar size="lg" user={user} />
          <Div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {savingAvatar ? (
              <Icon name="lucide:Loader2" className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Icon name="lucide:Camera" className="w-5 h-5 text-white" />
            )}
          </Div>
        </Div>
        <Div className="flex flex-col gap-1 flex-1">
          {editing ? (
            <>
              <Div className="space-y-2">
                <Div>
                  <Label className="text-xs text-muted-foreground">{texts.firstName}</Label>
                  <Input
                    value={editFirstName}
                    onChange={e => setEditFirstName(e.target.value)}
                    placeholder={texts.firstName}
                    className="mt-1"
                  />
                </Div>
                <Div>
                  <Label className="text-xs text-muted-foreground">{texts.lastName}</Label>
                  <Input
                    value={editLastName}
                    onChange={e => setEditLastName(e.target.value)}
                    placeholder={texts.lastName}
                    className="mt-1"
                  />
                </Div>
              </Div>
              <Div className="flex gap-2 mt-2">
                <Button
                  variant="default"
                  size="sm"
                  className="cursor-pointer"
                  onClick={saveProfile}
                  disabled={savingProfile}
                >
                  {texts.save}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => setEditing(false)}
                  disabled={savingProfile}
                >
                  {texts.cancel}
                </Button>
              </Div>
            </>
          ) : (
            <>
              <H3 className="text-lg font-semibold text-foreground">{fullName}</H3>
              <P className="text-sm text-muted-foreground">{user.username}</P>
              <Button
                variant="outline"
                size="sm"
                className="mt-1 w-fit cursor-pointer"
                onClick={startEditing}
              >
                {texts.updateProfile}
              </Button>
            </>
          )}
        </Div>
      </Div>

      <Div className="h-px bg-border" />

      {/* Email */}
      <Div className="space-y-3">
        <H3 className="text-sm font-semibold text-foreground">{texts.emailSection}</H3>
        <Div className="rounded-md border bg-card p-3 space-y-2">
          <Div className="flex items-center gap-3">
            <Icon name="lucide:Mail" className="w-4 h-4 text-muted-foreground shrink-0" />
            <Span className="text-sm text-foreground flex-1 truncate">{user.email}</Span>
            <Badge variant="secondary" className="text-xs shrink-0">
              {texts.primary}
            </Badge>
            {isVerified ? (
              <Badge
                variant="outline"
                className="text-xs shrink-0 bg-success/15 text-success border-success/30"
              >
                <Icon name="lucide:CheckCircle2" size={12} className="mr-1" />
                {texts.emailVerified}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-xs shrink-0 bg-warning/15 text-warning border-warning/30"
              >
                <Icon name="lucide:AlertTriangle" size={12} className="mr-1" />
                {texts.emailUnverified}
              </Badge>
            )}
          </Div>
          {!isVerified && (
            <Button
              variant="outline"
              size="sm"
              className="w-full cursor-pointer"
              onClick={handleResendVerification}
              disabled={sendingVerification}
            >
              {sendingVerification ? '...' : texts.resendVerification}
            </Button>
          )}
        </Div>
      </Div>

      <Div className="h-px bg-border" />

      {/* Connected accounts */}
      <Div className="space-y-3">
        <H3 className="text-sm font-semibold text-foreground">{texts.connectedAccounts}</H3>
        <Button
          variant="outline"
          className="w-full justify-start gap-3 p-3 h-auto cursor-pointer"
          onClick={handleConnectGoogle}
          disabled={!googleOAuthUrl}
        >
          {googleOAuthUrl ? (
            <Icon name="fa:FaGoogle" className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <Icon name="lucide:Link" className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
          <Span className="text-sm text-muted-foreground">{texts.connectAccount}</Span>
        </Button>
      </Div>

      <Div className="h-px bg-border" />

      {/* Member since */}
      <Div className="space-y-1">
        <H3 className="text-sm font-semibold text-foreground">{texts.memberSince}</H3>
        <P className="text-sm text-muted-foreground">
          {formatAccountDate(user.createdAt, texts.dateLocale)}
        </P>
      </Div>
    </>
  )
}
