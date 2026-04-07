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
import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth, useAuthContext } from '../provider.js'
import { useAuthStore } from '../store.js'
import { UserAvatar } from './UserAvatar.js'

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
  // Password
  passwordSection: string
  currentPassword: string
  newPassword: string
  changePassword: string
  createPassword: string
  passwordChanged: string
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
  // Password
  passwordSection: 'Password',
  currentPassword: 'Current password',
  newPassword: 'New password',
  changePassword: 'Change password',
  createPassword: 'Create password',
  passwordChanged: 'Password changed successfully',
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
  const { client } = useAuthContext()
  const store = useAuthStore()
  const texts = { ...DEFAULT_TEXTS, ...textOverrides }
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Profile editing state
  const [editing, setEditing] = useState(false)
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  // Password state
  const [currentPasswordValue, setCurrentPasswordValue] = useState('')
  const [newPasswordValue, setNewPasswordValue] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  if (!user) return null

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

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      size="xl"
      scrollBehavior="inside"
      title={texts.title}
      className={className}
    >
      {/* Desktop: sidebar + content — Mobile: burger + sheet nav */}
      <Div className="flex flex-row gap-4 min-h-[400px]">
        {/* ── Desktop sidebar — hidden on mobile ── */}
        <Div className="hidden md:flex flex-col gap-1 w-40 shrink-0 border-r pr-4">
          {tabs.map(tab => (
            <Button
              key={tab.id}
              variant="ghost"
              size="sm"
              className={`justify-start cursor-pointer ${
                activeTab === tab.id ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon name={tab.icon as 'lucide:User'} className="w-4 h-4 mr-2" />
              {tab.label}
            </Button>
          ))}
        </Div>

        {/* ── Mobile burger — shown only on mobile ── */}
        <Div className="flex md:hidden items-start pt-1">
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer"
            onClick={() => setMobileNavOpen(true)}
          >
            <Icon name="lucide:Menu" className="w-5 h-5" />
          </Button>
        </Div>

        {/* ── Mobile Sheet nav ── */}
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="w-48 p-4">
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
              {/* Avatar + name */}
              <Div className="flex items-center gap-4">
                <UserAvatar size="lg" user={user} />
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
                <Div className="flex items-center gap-3 rounded-md border bg-card p-3">
                  <Icon name="lucide:Mail" className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Span className="text-sm text-foreground flex-1 truncate">{user.email}</Span>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {texts.primary}
                  </Badge>
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
                  <Icon name="lucide:Link" className="w-4 h-4 text-muted-foreground shrink-0" />
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer mt-1"
                    onClick={handleChangePassword}
                    disabled={savingPassword || !newPasswordValue}
                  >
                    {texts.changePassword}
                  </Button>
                </Div>
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
    </Modal>
  )
}
