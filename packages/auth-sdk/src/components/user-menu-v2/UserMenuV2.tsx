'use client'

import { Dropdown } from '@ezstart/ui/components'
import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '../../react/hooks.js'
import { useAuthNavigation } from '../../react/useAuthNavigation.js'
import { LoginButton } from '../LoginButton.js'
import { AccountModalV2 } from './AccountModalV2.js'
import { getDefaultTextsV2 } from './internal.js'
import { buildUserMenuV2Items } from './items.js'
import { type UserMenuV2Props, type UserMenuV2Texts } from './types.js'
import { UserMenuV2Trigger } from './UserMenuV2Trigger.js'

// Re-exported for unit tests + backwards compatibility (the badge resolver
// lives in `./internal.ts` but its canonical import path is this component).
export { resolvePlanBadge, type PlanBadgeDescriptor } from './internal.js'

/**
 * User dropdown menu with avatar, profile sections, and account actions —
 * opens a panel rather than a list.
 *
 * V2 over `<UserMenu>` adds:
 * - Identity card with email-verified badge + plan badge
 * - Optional notifications row (with unread counter on the trigger)
 * - Help / shortcuts / status / changelog rows (each gated by a prop)
 * - Sign out from all devices (gated)
 * - Manage account opens `<AccountModalV2>` (left-Sheet nav on mobile,
 *   static sidebar on tablet/desktop)
 * - Same trigger shape across both auth states (icon | extended)
 *
 * Both `<UserMenu>` (V1) and `<UserMenuV2>` can be mounted side-by-side in
 * the app shell to compare A/B before retiring V1.
 *
 * @example
 * ```tsx
 * <UserMenuV2
 *   variant="icon"
 *   theme={{ theme, setTheme }}
 *   languages={[{ code: 'en', label: 'EN' }, { code: 'fr', label: 'FR' }]}
 *   currentLocale={locale}
 *   onLocaleChange={setLocale}
 *   planLabel="Pro"
 *   helpHref="/docs"
 *   statusHref="https://status.example.com"
 *   showSignOutAll
 * />
 * ```
 */
export function UserMenuV2({
  languages,
  currentLocale,
  onLocaleChange,
  extraItems,
  className,
  texts: textOverrides,
  avatarSize = 'md',
  theme,
  onManageAccount,
  accountModalTexts,
  googleOAuthUrl,
  ezauthWebUrl,
  side = 'bottom',
  variant = 'icon',
  redirectAfterLogout = '/',
  onLogout,
  hideSignIn = false,
  signInProps,
  planLabel,
  onPlanClick,
  unreadCount,
  onNotificationsClick,
  helpHref,
  onCommandPalette,
  commandPaletteHint,
  statusHref,
  changelogHref,
  showSignOutAll = false,
  locale: propLocale,
}: UserMenuV2Props) {
  const { user, isAuthenticated, login, logout, isLoggingIn, setLoggingIn, isLoggingOut } =
    useAuth()
  const navigation = useAuthNavigation()
  const locale = propLocale ?? currentLocale ?? navigation.locale
  const texts: UserMenuV2Texts = { ...getDefaultTextsV2(locale), ...textOverrides }
  const [showAccount, setShowAccount] = useState(false)
  const [signingOutAll, setSigningOutAll] = useState(false)

  // ── Sign-out flow (current device, default) ──
  // Delegate the full 8-step orchestration to `useAuth().logout()`
  // (cf. standard-sdk-dx.md §11ter). The component just forwards its
  // per-instance overrides — redirect target, consumer cleanup hook,
  // localized toast labels.
  const handleLogout = () => {
    void logout({
      redirectAfterLogout,
      onLogout,
      texts: {
        signOutSuccess: texts.signOutSuccess,
        signOutError: texts.signOutError,
      },
    })
  }

  // ── Sign out from all devices ──
  // The ezauth API revokes ALL refresh tokens for the user when no
  // refreshToken is passed (cf apps/ezauth/api/src/routes/auth/logout.ts),
  // so we route through the same `useAuth().logout()` path which already
  // omits the refreshToken when called without arguments. Equivalent to
  // hitting the dedicated `DELETE /api/sessions` endpoint server-side.
  // We tag the call with `silent` and emit our own "signed out from all
  // devices" toast so the message reflects the multi-session intent.
  const handleSignOutAll = async () => {
    if (signingOutAll) return
    setSigningOutAll(true)
    try {
      await logout({
        redirectAfterLogout,
        onLogout,
        silent: true, // we surface our own multi-device toast below
      })
      // Reached only when redirectAfterLogout === false (the redirect
      // happens INSIDE logout() otherwise and unmounts this component).
      toast.success(texts.signOutAllSuccess)
    } catch {
      toast.error(texts.signOutAllError)
    } finally {
      setSigningOutAll(false)
    }
  }

  // ── Not authenticated: render the same trigger shape as authenticated ──
  if (!isAuthenticated || !user) {
    if (hideSignIn) return null

    if (signInProps) {
      return (
        <LoginButton
          loginText={texts.signIn}
          {...signInProps}
          className={signInProps.className ?? className}
        />
      )
    }

    const handleSignInClick = () => {
      if (isLoggingIn) return
      setLoggingIn(true)
      void login()
    }

    return (
      <UserMenuV2Trigger
        user={null}
        isAuthenticated={false}
        isLoggingIn={isLoggingIn}
        variant={variant}
        avatarSize={avatarSize}
        signInLabel={texts.signIn}
        notificationsBadgeLabel={texts.notificationsBadgeLabel}
        className={className}
        onClick={handleSignInClick}
      />
    )
  }

  // ── Build dropdown items ──
  // Personalization (theme + locale) lives in `<AccountModalV2>` →
  // "Personalization" tab — NOT in the dropdown. The dropdown stays
  // compact (identity + key actions + help + sign out) ; theme/locale
  // are wired through to `<AccountModalV2>` via the same `theme` /
  // `languages` / `onLocaleChange` props forwarded below.
  const items = buildUserMenuV2Items({
    user,
    texts,
    isLoggingOut,
    signingOutAll,
    planLabel,
    extraItems,
    unreadCount,
    helpHref,
    statusHref,
    changelogHref,
    commandPaletteHint,
    showSignOutAll,
    onManageAccount,
    onOpenAccount: () => setShowAccount(true),
    onPlanClick,
    onNotificationsClick,
    onCommandPalette,
    onLogout: handleLogout,
    onSignOutAll: () => {
      void handleSignOutAll()
    },
  })

  // ── Render ──
  return (
    <>
      <Dropdown
        trigger={
          <UserMenuV2Trigger
            user={user}
            isAuthenticated={true}
            isLoggingIn={isLoggingIn}
            variant={variant}
            avatarSize={avatarSize}
            signInLabel={texts.signIn}
            unreadCount={unreadCount}
            notificationsBadgeLabel={texts.notificationsBadgeLabel}
          />
        }
        items={items}
        align="end"
        side={side}
        menuClassName="min-w-[260px] max-w-[320px]"
        className={className}
      />
      <AccountModalV2
        open={showAccount}
        onClose={() => setShowAccount(false)}
        texts={accountModalTexts}
        theme={theme}
        languages={languages}
        currentLocale={currentLocale}
        onLocaleChange={onLocaleChange}
        googleOAuthUrl={googleOAuthUrl}
        ezauthWebUrl={ezauthWebUrl}
        helpHref={helpHref}
      />
    </>
  )
}
