'use client'

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Div,
  H3,
  Icon,
  Input,
  Label,
  P,
  Span,
} from '@ezstart/ui/components'
import { apiCall } from '@ezstart/api-sdk'
import { useState } from 'react'
import { toast } from 'sonner'
import type { AuthUser } from '../../core/types.js'
import { useAuth } from '../../react/hooks.js'
import { useAuthStoreApi } from '../../react/auth-provider.js'
import { DeleteAccountSection } from '../DeleteAccountSection.js'
import { UserAvatar } from '../UserAvatar.js'
import type { EZAuthDashboardTexts } from './types.js'

interface ProfileBlockProps {
  appName?: string
  texts: EZAuthDashboardTexts
  locale: string
}

/**
 * Profile/identity card stack rendered for `?section=account`.
 *
 * Composition (mirrors the AccountModal "Profile" tab without the modal
 * chrome — this is the dashboard inline equivalent):
 *
 * - Avatar + name + edit-profile (firstName / lastName)
 * - Email + verification status badge + resend CTA
 * - Connected accounts (Google, read-only — full management lives in
 *   `<OAuthProvidersSection>` on `?section=settings`)
 * - Member since
 * - Danger zone (`<DeleteAccountSection>` — GDPR account soft-delete)
 *
 * Pure SDK-i18n-agnostic — every user-facing string is sourced from the
 * `texts` prop with English defaults.
 *
 * @internal
 */
export function ProfileBlock({ appName, texts, locale }: ProfileBlockProps) {
  const { user, accessToken } = useAuth()
  const storeApi = useAuthStoreApi()

  const [editing, setEditing] = useState(false)
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [sendingVerification, setSendingVerification] = useState(false)

  if (!user) return null

  const isVerified = Boolean(user.isVerified)
  const fullName = user.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`
    : user.username
  const isGoogleConnected =
    typeof user.avatar === 'string' &&
    (user.avatar.includes('googleusercontent.com') || user.avatar.includes('google.com'))

  const startEditing = () => {
    setEditFirstName(user.firstName ?? '')
    setEditLastName(user.lastName ?? '')
    setEditing(true)
  }

  const saveProfile = async () => {
    setSavingProfile(true)
    try {
      // Hit /profile via apiCall to mirror EmailVerificationStatus /
      // OAuthProvidersSection style used elsewhere in the dashboard subtree
      // (the AccountModal threads `client.updateProfile()` from
      // useAuthContext, but apiCall is the canonical pattern for new
      // dashboard mutations).
      const result = await apiCall<{ user: AuthUser }>('/auth/profile', {
        appName: 'ezauth',
        method: 'PUT',
        body: { firstName: editFirstName, lastName: editLastName },
        ...(accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {}),
      })
      storeApi.getState().updateUser(result.user)
      toast.success(texts.profileSaveSuccess)
      setEditing(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : texts.profileSaveError)
    } finally {
      setSavingProfile(false)
    }
  }

  const handleResendVerification = async () => {
    if (!user.email || sendingVerification) return
    setSendingVerification(true)
    try {
      await apiCall('/auth/send-verification', {
        appName: 'ezauth',
        method: 'POST',
        body: {
          email: user.email,
          ...(appName ? { app: appName } : {}),
        },
      })
      toast.success(texts.profileVerificationSent)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : texts.profileVerificationError)
    } finally {
      setSendingVerification(false)
    }
  }

  const memberSince = (() => {
    try {
      return new Date(user.createdAt).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return user.createdAt
    }
  })()

  return (
    <Div className="space-y-6 w-full max-w-lg mx-auto">
      {/* Profile header — avatar + name + edit form */}
      <Card>
        <CardHeader>
          <H3 className="text-sm font-medium text-foreground">{texts.profileSectionTitle}</H3>
        </CardHeader>
        <CardContent>
          <Div className="flex items-center gap-4">
            <UserAvatar size="lg" user={user} />
            <Div className="flex flex-col gap-1 flex-1 min-w-0">
              {editing ? (
                <>
                  <Div className="space-y-2">
                    <Div>
                      <Label className="text-xs text-muted-foreground">
                        {texts.profileFirstNameLabel}
                      </Label>
                      <Input
                        value={editFirstName}
                        onChange={e => setEditFirstName(e.target.value)}
                        placeholder={texts.profileFirstNameLabel}
                        className="mt-1"
                      />
                    </Div>
                    <Div>
                      <Label className="text-xs text-muted-foreground">
                        {texts.profileLastNameLabel}
                      </Label>
                      <Input
                        value={editLastName}
                        onChange={e => setEditLastName(e.target.value)}
                        placeholder={texts.profileLastNameLabel}
                        className="mt-1"
                      />
                    </Div>
                  </Div>
                  <Div className="flex gap-2 mt-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => void saveProfile()}
                      disabled={savingProfile}
                    >
                      {texts.profileSaveButton}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(false)}
                      disabled={savingProfile}
                    >
                      {texts.profileCancelButton}
                    </Button>
                  </Div>
                </>
              ) : (
                <>
                  <H3 className="text-lg font-semibold text-foreground truncate">{fullName}</H3>
                  <P className="text-sm text-muted-foreground truncate">@{user.username}</P>
                  <Button variant="outline" size="sm" className="mt-2 w-fit" onClick={startEditing}>
                    {texts.profileEditButton}
                  </Button>
                </>
              )}
            </Div>
          </Div>
        </CardContent>
      </Card>

      {/* Email + verification */}
      <Card>
        <CardHeader>
          <H3 className="text-sm font-medium text-foreground">{texts.profileEmailSection}</H3>
        </CardHeader>
        <CardContent>
          <Div className="space-y-3">
            <Div className="rounded-md border bg-card p-3 space-y-2">
              <Div className="flex items-center gap-3 flex-wrap">
                <Icon name="lucide:Mail" className="w-4 h-4 text-muted-foreground shrink-0" />
                <Span className="text-sm text-foreground flex-1 truncate min-w-0">
                  {user.email}
                </Span>
                <Badge variant="secondary" size="xs">
                  {texts.profileEmailPrimary}
                </Badge>
                {isVerified ? (
                  <Badge variant="success" size="xs">
                    <Icon name="lucide:CheckCircle2" size={12} className="mr-1" />
                    {texts.profileEmailVerified}
                  </Badge>
                ) : (
                  <Badge variant="warning" size="xs">
                    <Icon name="lucide:AlertTriangle" size={12} className="mr-1" />
                    {texts.profileEmailUnverified}
                  </Badge>
                )}
              </Div>
              {!isVerified && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => void handleResendVerification()}
                  disabled={sendingVerification}
                >
                  {sendingVerification ? '…' : texts.profileResendVerification}
                </Button>
              )}
            </Div>
          </Div>
        </CardContent>
      </Card>

      {/* Connected accounts (read-only — full management in /settings) */}
      <Card>
        <CardHeader>
          <H3 className="text-sm font-medium text-foreground">
            {texts.profileConnectedAccountsSection}
          </H3>
        </CardHeader>
        <CardContent>
          <Div className="flex items-center gap-3">
            <Icon name="fa:FaGoogle" className="w-5 h-5 text-muted-foreground shrink-0" />
            <Div className="flex-1 min-w-0">
              <P className="text-sm font-medium text-foreground">{texts.profileConnectedGoogle}</P>
              <P className="text-xs text-muted-foreground truncate">
                {isGoogleConnected ? user.email : texts.profileConnectedNone}
              </P>
            </Div>
            {isGoogleConnected && (
              <Icon name="lucide:Check" className="w-4 h-4 text-primary shrink-0" />
            )}
          </Div>
        </CardContent>
      </Card>

      {/* Member since */}
      <Card>
        <CardContent className="py-4">
          <Div className="flex items-center gap-3">
            <Icon name="lucide:Calendar" className="w-4 h-4 text-muted-foreground shrink-0" />
            <Div className="flex-1 min-w-0">
              <P className="text-xs text-muted-foreground">{texts.profileMemberSinceLabel}</P>
              <P className="text-sm text-foreground">{memberSince}</P>
            </Div>
          </Div>
        </CardContent>
      </Card>

      {/* Danger zone — account deletion */}
      <DeleteAccountSection texts={texts.deleteAccount} />
    </Div>
  )
}
