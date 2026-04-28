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
import { ImageCropper } from '@ezstart/capture-sdk'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '../../react/hooks.js'
import { useAuthContext, useAuthStoreApi } from '../../react/auth-provider.js'
import { useAuthNavigation } from '../../react/useAuthNavigation.js'
import { AccountProfileSection } from '../account/AccountProfileSection.js'
import { AccountSettingsSection } from '../account/AccountSettingsSection.js'
import { type AccountModalTexts, type AccountTab, DEFAULT_ACCOUNT_TEXTS } from '../account/types.js'

// V2 extends V1 texts with optional pro-level labels (no behavior change for
// callers that pass the V1 texts shape — V2 falls back to V1 defaults).
export interface AccountModalV2Texts extends AccountModalTexts {
  /** Aria-label for the mobile burger that toggles the navigation Sheet. */
  toggleNavigation: string
  /** Footer link label (when `helpHref` is provided). */
  needHelp: string
}

export const DEFAULT_ACCOUNT_MODAL_V2_TEXTS: AccountModalV2Texts = {
  ...DEFAULT_ACCOUNT_TEXTS,
  toggleNavigation: 'Toggle navigation',
  needHelp: 'Need help?',
}

export interface AccountModalV2Props {
  open: boolean
  onClose: () => void
  texts?: Partial<AccountModalV2Texts>
  className?: string
  theme?: { theme?: string; setTheme: (t: string) => void }
  languages?: { code: string; label: string }[]
  currentLocale?: string
  onLocaleChange?: (locale: string) => void
  /** Google OAuth URL for "Connect account" button. If not provided, button stays disabled. */
  googleOAuthUrl?: string
  /**
   * Base URL of the EZAuth web app — required to render the "Manage 2FA &
   * sessions" deep link. When omitted, the section is hidden gracefully.
   */
  ezauthWebUrl?: string
  /** Optional footer help link (rendered at the bottom of the sidebar). */
  helpHref?: string
}

/**
 * V2 account modal — full-screen-ish (max-w-4xl) Modal with a left sidebar
 * navigation that collapses to a Sheet (mounted INSIDE the modal container)
 * on mobile (< md). The Sheet slides in from the LEFT and contains the same
 * tabs as the desktop sidebar — clicking an item closes the Sheet and
 * switches the active tab.
 *
 * Reuses the existing `<AccountProfileSection>` and `<AccountSettingsSection>`
 * sections from V1 — only the shell + navigation is new.
 *
 * Mobile contract:
 * - The dropdown that opens this modal stays a Modal even on mobile (NOT a
 *   bottom Sheet) — explicit user requirement.
 * - The internal navigation IS a left Sheet on mobile, toggled by a burger
 *   in the sticky header.
 * - Esc closes the Sheet first if open, otherwise the Modal (delegated to
 *   Radix focus trap).
 */
export function AccountModalV2({
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
  helpHref,
}: AccountModalV2Props) {
  const { user, accessToken } = useAuth()
  const { client, appName, webUrl: contextWebUrl } = useAuthContext()
  const storeApi = useAuthStoreApi()
  const resolvedEzauthWebUrl = ezauthWebUrl ?? contextWebUrl
  const texts: AccountModalV2Texts = { ...DEFAULT_ACCOUNT_MODAL_V2_TEXTS, ...textOverrides }
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

  const handleTabClick = (tab: AccountTab) => {
    setActiveTab(tab)
    setMobileNavOpen(false)
  }

  return (
    <Modal isOpen={open} onClose={onClose} size="xl" scrollBehavior="inside" className={className}>
      <Div ref={modalContainerRef} className="relative flex flex-col h-full">
        {/* ── Sticky header with burger on mobile ── */}
        <Div className="sticky top-0 z-10 flex items-center gap-2 pb-4 border-b mb-4 bg-background">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:hidden cursor-pointer -ml-2"
            onClick={() => setMobileNavOpen(true)}
            aria-label={texts.toggleNavigation}
          >
            <Icon name="lucide:Menu" className="w-5 h-5" />
          </Button>
          <H3 className="text-lg font-semibold">{texts.title}</H3>
        </Div>

        {/* ── Body: sidebar + content ── */}
        <Div className="flex flex-row gap-4 flex-1 min-h-[350px]">
          {/* ── Desktop sidebar — hidden on mobile, ALWAYS visible on md+ ── */}
          <Div className="hidden md:flex flex-col gap-1 w-48 shrink-0 border-r pr-4">
            {tabs.map(tab => (
              <Button
                key={tab.id}
                type="button"
                variant="ghost"
                size="sm"
                className={`justify-start cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground'
                }`}
                onClick={() => setActiveTab(tab.id)}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                <Icon name={tab.icon as 'lucide:User'} className="w-4 h-4 mr-2" />
                {tab.label}
              </Button>
            ))}
            {helpHref && (
              <>
                <Div className="flex-1" />
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="justify-start text-muted-foreground cursor-pointer"
                >
                  <a href={helpHref} target="_blank" rel="noopener noreferrer">
                    <Icon name="lucide:HelpCircle" className="w-4 h-4 mr-2" />
                    {texts.needHelp}
                  </a>
                </Button>
              </>
            )}
          </Div>

          {/* ── Mobile Sheet nav (slides from LEFT, contained in modal) ── */}
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetContent
              side="left"
              className="w-3/4 max-w-xs p-4"
              container={modalContainerRef.current}
            >
              <SheetHeader>
                <SheetTitle>{texts.title}</SheetTitle>
              </SheetHeader>
              <Div className="flex flex-col gap-1 mt-4">
                {tabs.map(tab => (
                  <Button
                    key={tab.id}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={`justify-start cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground'
                    }`}
                    onClick={() => handleTabClick(tab.id)}
                    aria-current={activeTab === tab.id ? 'page' : undefined}
                  >
                    <Icon name={tab.icon as 'lucide:User'} className="w-4 h-4 mr-2" />
                    {tab.label}
                  </Button>
                ))}
                {helpHref && (
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="justify-start text-muted-foreground cursor-pointer mt-4"
                  >
                    <a href={helpHref} target="_blank" rel="noopener noreferrer">
                      <Icon name="lucide:HelpCircle" className="w-4 h-4 mr-2" />
                      {texts.needHelp}
                    </a>
                  </Button>
                )}
              </Div>
            </SheetContent>
          </Sheet>

          {/* ── Active panel ── */}
          <Div className="flex-1 space-y-6 min-w-0">
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

      {/* Avatar Cropper Modal (sibling, opens on top) */}
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
