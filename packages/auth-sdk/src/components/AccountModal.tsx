'use client'

import {
  Button,
  Div,
  H3,
  Icon,
  Modal,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@ezstart/ui/components'
import { useDeprecationWarning } from '@ezstart/ui/hooks'
import { ImageCropper } from '@ezstart/capture-sdk'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '../react/hooks.js'
import { useAuthContext, useAuthStoreApi } from '../react/auth-provider.js'
import { useAuthNavigation } from '../react/useAuthNavigation.js'
import { AccountProfileSection } from './account/AccountProfileSection.js'
import { AccountSettingsSection } from './account/AccountSettingsSection.js'
import { type AccountModalTexts, type AccountTab, DEFAULT_ACCOUNT_TEXTS } from './account/types.js'

// Re-export the texts type so consumers continue to import it from the
// AccountModal module (keeps the public API stable across the split).
export type { AccountModalTexts } from './account/types.js'

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
  /**
   * Base URL of the EZAuth web app. Used to deep-link the user to the
   * advanced security settings (2FA, sessions, account deletion).
   * REQUIRED to render the "Manage 2FA & sessions" CTA — when omitted,
   * the section is hidden. Pass the same URL the consumer already uses
   * in its `<AuthProvider webUrl=...>` config.
   *
   * @example 'https://auth.example.com'
   */
  ezauthWebUrl?: string
}

/**
 * V1 account management modal (simple tab modal pattern) split into two tabs:
 * - **Profile** — avatar, name, email + verification, connected accounts
 * - **Settings** — password, advanced security (SSO handoff to EZAuth web),
 *   theme switcher, language switcher
 *
 * The component is a pure abstraction over `<Modal>` from `@ezstart/ui` —
 * the consumer controls open/close state and provides the optional theme
 * and locale handlers. Internal sections live in
 * `./account/AccountProfileSection.tsx` and
 * `./account/AccountSettingsSection.tsx` to keep each file under the
 * 400-line policy ceiling.
 *
 * @deprecated Use `AccountModalV2` for the modern modal with sidebar nav
 * (collapses to Sheet on mobile, sidebar on tablet/desktop). Matches modern
 * account management UX. `AccountModal` will be removed 2026-08-01.
 *
 * @example
 * ```tsx
 * <AccountModal
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   ezauthWebUrl="https://auth.example.com"
 *   googleOAuthUrl="https://auth.example.com/api/auth/google?app=myapp"
 *   theme={{ theme, setTheme }}
 *   languages={[{ code: 'en', label: 'EN' }, { code: 'fr', label: 'FR' }]}
 *   currentLocale="en"
 *   onLocaleChange={code => router.push(`/${code}`)}
 * />
 * ```
 */
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
  ezauthWebUrl,
}: AccountModalProps) {
  useDeprecationWarning(
    'AccountModal (V1) from @ezstart/auth-sdk',
    'AccountModalV2 from @ezstart/auth-sdk/components'
  )
  const { user, accessToken } = useAuth()
  const { client, appName, webUrl: contextWebUrl } = useAuthContext()
  const storeApi = useAuthStoreApi()
  // Resolve the EZAuth web URL: explicit prop > AuthProvider context value.
  // The component never imports `@ezstart/config` so it stays agnostic.
  const resolvedEzauthWebUrl = ezauthWebUrl ?? contextWebUrl
  const texts: AccountModalTexts = { ...DEFAULT_ACCOUNT_TEXTS, ...textOverrides }
  const [activeTab, setActiveTab] = useState<AccountTab>('profile')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Avatar cropping state lives at the parent so the cropper modal can sit
  // alongside the main modal without duplicating state in both sections.
  const [avatarFile, setAvatarFile] = useState<string | null>(null)
  const [showCropper, setShowCropper] = useState(false)
  const [savingAvatar, setSavingAvatar] = useState(false)
  const navigation = useAuthNavigation()
  const modalContainerRef = useRef<HTMLDivElement>(null)

  if (!user) return null

  // Build deep link to ezauth settings (2FA, sessions, delete account).
  // Returns null when no `ezauthWebUrl` is configured so the section can
  // be hidden gracefully.
  const ezauthSettingsLocale = currentLocale || 'en'
  const ezauthSettingsUrl = (() => {
    if (!resolvedEzauthWebUrl) return null
    const base = `${resolvedEzauthWebUrl.replace(/\/+$/, '')}/${ezauthSettingsLocale}/settings`
    return appName ? `${base}?app=${encodeURIComponent(appName)}` : base
  })()

  const handleAvatarFilePicked = (dataUrl: string) => {
    setAvatarFile(dataUrl)
    setShowCropper(true)
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
      storeApi.getState().updateUser(updatedUser)
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

  const tabs: { id: AccountTab; label: string; icon: string }[] = [
    { id: 'profile', label: texts.profileTab, icon: 'lucide:User' },
    { id: 'settings', label: texts.settingsTab, icon: 'lucide:Settings' },
  ]

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
            {activeTab === 'profile' && (
              <AccountProfileSection
                user={user}
                client={client}
                accessToken={accessToken}
                appName={appName}
                navigation={{ app: navigation.app, redirectUri: navigation.redirectUri }}
                texts={texts}
                googleOAuthUrl={googleOAuthUrl}
                onUserUpdated={updated => storeApi.getState().updateUser(updated)}
                onAvatarFilePicked={handleAvatarFilePicked}
                savingAvatar={savingAvatar}
              />
            )}
            {activeTab === 'settings' && (
              <AccountSettingsSection
                client={client}
                accessToken={accessToken}
                appName={appName}
                ezauthSettingsUrl={ezauthSettingsUrl}
                texts={texts}
                theme={theme}
                languages={languages}
                currentLocale={currentLocale}
                onLocaleChange={onLocaleChange}
              />
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
