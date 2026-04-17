'use client'

import {
  Badge,
  Button,
  Div,
  H3,
  Icon,
  Input,
  Label,
  Modal,
  P,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Span,
} from '@ezstart/ui/components'
import { ImageCropper } from '@ezstart/capture-sdk'
import { getWebUrl } from '@ezstart/config'
import { apiCall } from '@ezstart/api-sdk'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { useAuth, useAuthContext } from '../provider.js'
import { useAuthStore } from '../store.js'
import { useAuthNavigation } from '../hooks/useAuthNavigation.js'
import { UserAvatar } from './UserAvatar.js'
import { ApiError } from '@ezstart/api-sdk'

// ─── SSO Handoff Helper ─────────────────────────────────────────────────────

/**
 * Create a cross-domain SSO handoff URL.
 * Calls the EZAuth SSO authorize endpoint and builds a callback URL.
 */
async function createSsoHandoff({
  targetUrl,
  app,
}: {
  targetUrl: string
  app: string
}): Promise<string> {
  if (typeof window !== 'undefined') {
    const sameOriginTarget = new URL(targetUrl)
    if (sameOriginTarget.origin === window.location.origin) {
      return targetUrl
    }
  }

  let data: { code: string; expiresIn: number }
  try {
    data = await apiCall<{ code: string; expiresIn: number }>('/auth/sso/authorize', {
      appName: 'ezauth',
      method: 'POST',
      body: { app, redirectUri: targetUrl },
    })
  } catch (err) {
    if (ApiError.isApiError(err)) {
      throw new Error(err.message || 'Failed to initiate SSO handoff')
    }
    throw err
  }

  const target = new URL(targetUrl)
  const locale = target.pathname.split('/')[1] || 'en'
  const callbackPath = `/${locale}/auth/sso-callback`
  const next = target.pathname + target.search
  const callbackUrl = new URL(callbackPath, target.origin)
  callbackUrl.searchParams.set('code', data.code)
  callbackUrl.searchParams.set('next', next)
  return callbackUrl.toString()
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AccountModalTexts {
  title: string
  profileTab: string
  settingsTab: string
  updateProfile: string
  emailSection: string
  primary: string
  connectedAccounts: string
  connectAccount: string
  themeSection: string
  themeLight: string
  themeDark: string
  themeSystem: string
  languageSection: string
  memberSince: string
  // Edit profile
  firstName: string
  lastName: string
  save: string
  cancel: string
  profileUpdated: string
  // Avatar
  changeAvatar: string
  cropAvatar: string
  // Password
  passwordSection: string
  currentPassword: string
  newPassword: string
  changePassword: string
  createPassword: string
  passwordChanged: string
  // Advanced security (link to ezauth settings)
  securitySection: string
  manageSecurity: string
  // Email verification
  emailVerified: string
  emailUnverified: string
  resendVerification: string
  verificationSent: string
  verifyError: string
}

export interface AccountModalProps {
  open: boolean
  onClose: () => void
  texts?: Partial<AccountModalTexts>
  className?: string
  theme?: { theme?: string; setTheme: (t: string) => void }
  languages?: { code: string; label: string }[]
  currentLocale?: string
  onLocaleChange?: (locale: string) => void
  /** Google OAuth URL for "Connect account" button. If not provided, button stays disabled. */
  googleOAuthUrl?: string
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_TEXTS: AccountModalTexts = {
  title: 'Account',
  profileTab: 'Profile',
  settingsTab: 'Settings',
  updateProfile: 'Update profile',
  emailSection: 'Email addresses',
  primary: 'Primary',
  connectedAccounts: 'Connected accounts',
  connectAccount: 'Connect account',
  themeSection: 'Theme',
  themeLight: 'Light',
  themeDark: 'Dark',
  themeSystem: 'System',
  languageSection: 'Language',
  memberSince: 'Member since',
  // Edit profile
  firstName: 'First name',
  lastName: 'Last name',
  save: 'Save',
  cancel: 'Cancel',
  profileUpdated: 'Profile updated successfully',
  // Avatar
  changeAvatar: 'Change avatar',
  cropAvatar: 'Crop avatar',
  // Password
  passwordSection: 'Password',
  currentPassword: 'Current password',
  newPassword: 'New password',
  changePassword: 'Change password',
  createPassword: 'Create password',
  passwordChanged: 'Password changed successfully',
  // Advanced security (link to ezauth settings)
  securitySection: 'Advanced security',
  manageSecurity: 'Manage 2FA & sessions',
  // Email verification
  emailVerified: 'Verified',
  emailUnverified: 'Unverified',
  resendVerification: 'Resend verification email',
  verificationSent: 'Verification email sent. Check your inbox.',
  verifyError: 'Failed to send verification email',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

type Tab = 'profile' | 'settings'

// ─── Component ───────────────────────────────────────────────────────────────

export function AccountModal({
  open,
  onClose,
  texts: textOverrides,
  className,
  theme,
  languages,
  currentLocale,
  onLocaleChange,
  googleOAuthUrl,
}: AccountModalProps) {
  const { user, accessToken } = useAuth()
  const { client, appName } = useAuthContext()
  const store = useAuthStore()
  const texts = { ...DEFAULT_TEXTS, ...textOverrides }
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Profile editing state
  const [editing, setEditing] = useState(false)
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  // Avatar upload state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarFile, setAvatarFile] = useState<string | null>(null)
  const [showCropper, setShowCropper] = useState(false)
  const [savingAvatar, setSavingAvatar] = useState(false)

  // Password state
  const [editingPassword, setEditingPassword] = useState(false)
  const [currentPasswordValue, setCurrentPasswordValue] = useState('')
  const [newPasswordValue, setNewPasswordValue] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  // Email verification state
  const [sendingVerification, setSendingVerification] = useState(false)
  const navigation = useAuthNavigation()

  // Advanced security (SSO handoff) state
  const [redirecting, setRedirecting] = useState(false)

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

  if (!user) return null

  const isVerified = Boolean((user as { isVerified?: boolean }).isVerified)

  // Build deep link to ezauth settings (2FA, sessions, delete account)
  const ezauthSettingsLocale = currentLocale || 'en'
  const ezauthSettingsUrl = (() => {
    const base = `${getWebUrl('ezauth')}/${ezauthSettingsLocale}/settings`
    return appName ? `${base}?app=${encodeURIComponent(appName)}` : base
  })()

  const fullName = user.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`
    : user.username

  const startEditing = () => {
    setEditFirstName(user.firstName || '')
    setEditLastName(user.lastName || '')
    setEditing(true)
  }

  const cancelEditing = () => {
    setEditing(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setAvatarFile(reader.result as string)
      setShowCropper(true)
    }
    reader.readAsDataURL(file)
    // Reset input so the same file can be re-selected
    e.target.value = ''
  }

  const handleCropComplete = async (croppedDataUrl: string) => {
    setShowCropper(false)
    setAvatarFile(null)
    setSavingAvatar(true)
    try {
      const updatedUser = await client.updateProfile(
        { avatar: croppedDataUrl },
        accessToken || undefined
      )
      store.updateUser(updatedUser)
      toast.success(texts.profileUpdated)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update avatar')
    } finally {
      setSavingAvatar(false)
    }
  }

  const handleCropCancel = () => {
    setShowCropper(false)
    setAvatarFile(null)
  }

  const saveProfile = async () => {
    setSavingProfile(true)
    try {
      const updatedUser = await client.updateProfile(
        { firstName: editFirstName, lastName: editLastName },
        accessToken || undefined
      )
      store.updateUser(updatedUser)
      toast.success(texts.profileUpdated)
      setEditing(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

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
      toast.error(error instanceof Error ? error.message : 'Failed to change password')
    } finally {
      setSavingPassword(false)
    }
  }

  const handleConnectGoogle = () => {
    if (googleOAuthUrl) {
      window.location.href = googleOAuthUrl
    }
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'profile', label: texts.profileTab, icon: 'lucide:User' },
    { id: 'settings', label: texts.settingsTab, icon: 'lucide:Settings' },
  ]

  const modalContainerRef = useRef<HTMLDivElement>(null)

  return (
    <Modal isOpen={open} onClose={onClose} size="xl" scrollBehavior="inside" className={className}>
      {/* Ref wraps everything so Sheet covers full modal height */}
      <Div ref={modalContainerRef} className="relative flex flex-col h-full">
        {/* ── Header with burger on mobile ── */}
        <Div className="flex items-center gap-2 pb-4 border-b mb-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden cursor-pointer -ml-2"
            onClick={() => setMobileNavOpen(true)}
          >
            <Icon name="lucide:Menu" className="w-5 h-5" />
          </Button>
          <H3 className="text-lg font-semibold">{texts.title}</H3>
        </Div>

        {/* ── Body: sidebar + content ── */}
        <Div className="flex flex-row gap-4 flex-1 min-h-[350px]">
          {/* ── Desktop sidebar — hidden on mobile ── */}
          <Div className="hidden md:flex flex-col gap-1 w-40 shrink-0 border-r pr-4">
            {tabs.map(tab => (
              <Button
                key={tab.id}
                variant="ghost"
                size="sm"
                className={`justify-start cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon name={tab.icon as 'lucide:User'} className="w-4 h-4 mr-2" />
                {tab.label}
              </Button>
            ))}
          </Div>

          {/* ── Mobile Sheet nav — contained within modal ── */}
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetContent side="left" className="w-48 p-4" container={modalContainerRef.current}>
              <SheetHeader>
                <SheetTitle>{texts.title}</SheetTitle>
              </SheetHeader>
              <Div className="flex flex-col gap-1 mt-4">
                {tabs.map(tab => (
                  <Button
                    key={tab.id}
                    variant="ghost"
                    size="sm"
                    className={`justify-start cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground'
                    }`}
                    onClick={() => {
                      setActiveTab(tab.id)
                      setMobileNavOpen(false)
                    }}
                  >
                    <Icon name={tab.icon as 'lucide:User'} className="w-4 h-4 mr-2" />
                    {tab.label}
                  </Button>
                ))}
              </Div>
            </SheetContent>
          </Sheet>

          {/* ── Content ── */}
          <Div className="flex-1 space-y-6">
            {/* ── Profile ── */}
            {activeTab === 'profile' && (
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
                            <Label className="text-xs text-muted-foreground">
                              {texts.firstName}
                            </Label>
                            <Input
                              value={editFirstName}
                              onChange={e => setEditFirstName(e.target.value)}
                              placeholder={texts.firstName}
                              className="mt-1"
                            />
                          </Div>
                          <Div>
                            <Label className="text-xs text-muted-foreground">
                              {texts.lastName}
                            </Label>
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
                            onClick={cancelEditing}
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
                  <H3 className="text-sm font-semibold text-foreground">
                    {texts.connectedAccounts}
                  </H3>
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
                  <P className="text-sm text-muted-foreground">{formatDate(user.createdAt)}</P>
                </Div>
              </>
            )}

            {/* ── Settings ── */}
            {activeTab === 'settings' && (
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
                        <Label className="text-xs text-muted-foreground">
                          {texts.currentPassword}
                        </Label>
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

                {/* Advanced security — link to ezauth settings (2FA, sessions, delete) */}
                <Div className="space-y-2">
                  <H3 className="text-sm font-semibold text-foreground">{texts.securitySection}</H3>
                  {appName ? (
                    <Button
                      variant="outline"
                      className="w-full justify-between cursor-pointer"
                      onClick={async () => {
                        if (redirecting) return
                        setRedirecting(true)
                        try {
                          const url = await createSsoHandoff({
                            targetUrl: ezauthSettingsUrl,
                            app: appName,
                          })
                          window.location.href = url
                        } catch (err) {
                          toast.error(
                            err instanceof Error ? err.message : 'Failed to open security settings'
                          )
                          setRedirecting(false)
                        }
                      }}
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
                    <Button
                      asChild
                      variant="outline"
                      className="w-full justify-between cursor-pointer"
                    >
                      <a href={ezauthSettingsUrl} target="_blank" rel="noopener noreferrer">
                        <Span>{texts.manageSecurity}</Span>
                        <Icon name="lucide:ExternalLink" size={14} />
                      </a>
                    </Button>
                  )}
                </Div>

                <Div className="h-px bg-border" />

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
                      <H3 className="text-sm font-semibold text-foreground">
                        {texts.languageSection}
                      </H3>
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
            )}
          </Div>
        </Div>
      </Div>

      {/* Avatar Cropper Modal */}
      <Modal isOpen={showCropper} onClose={handleCropCancel} size="md" title={texts.cropAvatar}>
        {avatarFile && (
          <ImageCropper
            src={avatarFile}
            mode="round"
            aspectRatio={1}
            onCropComplete={croppedDataUrl => handleCropComplete(croppedDataUrl)}
            onCancel={handleCropCancel}
            maxOutputWidth={256}
            outputQuality={0.85}
            outputFormat="image/jpeg"
            labels={{
              apply: texts.save,
              cancel: texts.cancel,
            }}
          />
        )}
      </Modal>
    </Modal>
  )
}
