'use client'

import { Dropdown } from '@ezstart/ui/components'
import { useDeprecationWarning } from '@ezstart/ui/hooks'
import { useState } from 'react'
import { useAuth } from '../react/hooks.js'
import { useAuthNavigation } from '../react/useAuthNavigation.js'
import { AccountModal } from './AccountModal.js'
import { LoginButton } from './LoginButton.js'
import { UserMenuAuthenticatedTrigger } from './user-menu/authenticated-trigger.js'
import { buildUserMenuItems } from './user-menu/items.js'
import { UserMenuSignedOutTrigger } from './user-menu/signed-out-trigger.js'
import { getDefaultTexts, type UserMenuProps, type UserMenuTexts } from './user-menu/types.js'

// Public types live in `./user-menu/types.ts`; re-exported here to preserve the
// canonical `@ezstart/auth-sdk` import path (the barrel re-exports from here).
export type { UserMenuItem, UserMenuProps, UserMenuTexts } from './user-menu/types.js'

/**
 * V1 user dropdown menu (compact list pattern) showing avatar, account info,
 * theme switcher, language switcher, and sign-out action. Renders a sign-in
 * CTA when the user is not authenticated.
 *
 * @deprecated Use `UserMenuV2` for the modern dropdown panel pattern (avatar
 * + identity card + email-verified badge + plan badge + notifications +
 * sign-out-all). `UserMenu` will be removed 2026-08-01. See migration guide.
 *
 * @example
 * ```tsx
 * <UserMenu
 *   languages={[{ code: 'en', label: 'EN' }, { code: 'fr', label: 'FR' }]}
 * />
 * ```
 */
export function UserMenu({
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
  side = 'bottom',
  variant = 'icon',
  redirectAfterLogout = '/',
  onLogout,
  hideSignIn = false,
  signInProps,
  locale: propLocale,
}: UserMenuProps) {
  useDeprecationWarning(
    'UserMenu (V1) from @ezstart/auth-sdk',
    'UserMenuV2 from @ezstart/auth-sdk/components'
  )
  const { user, isAuthenticated, login, logout, isLoggingIn, setLoggingIn, isLoggingOut } =
    useAuth()
  const navigation = useAuthNavigation()
  const locale = propLocale ?? navigation.locale
  const texts: UserMenuTexts = { ...getDefaultTexts(locale), ...textOverrides }
  const [showAccount, setShowAccount] = useState(false)

  // Logout flow — delegated to `useAuth().logout()` which runs the full
  // 8-step orchestration (cf. standard-sdk-dx.md §11ter). The component
  // forwards its per-instance overrides (redirect target + onLogout hook
  // + localized toast text) so the SDK pipeline does the heavy lifting.
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

  // ── Not authenticated: render the SAME visual trigger shape as the
  // authenticated state, just with a generic placeholder (UserCircle icon
  // for `'icon'` variant, "Sign in" row for `'extended'`) and `onClick =
  // login()`. Mirroring the authenticated trigger keeps the chrome stable
  // across auth state changes — the consumer mounts `<UserMenu />` once and
  // visits both states without an unmount/remount that would interrupt
  // in-flight toasts (e.g. the post-logout success toast).
  //
  // Override the visual via `signInProps`: pass any `LoginButtonProps`
  // (`variant`, `size`, `icon`, `loginText`, ...) — when present, we
  // delegate to `<LoginButton>` instead of the matching round / extended
  // shape. Useful when the design wants a colored CTA in the not-auth state.
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
      // `useAuth().login()` performs a hard `window.location.href` redirect
      // and never sets `isLoggingIn` itself — the caller is responsible for
      // flipping the flag so subscribers (this button's spinner / disabled
      // state, RequireAuth's loader, etc.) reflect the in-flight redirect.
      // Mirror what `<LoginButton>` does to keep the spinner visible from
      // click → cross-app navigation.
      setLoggingIn(true)
      void login()
    }

    return (
      <UserMenuSignedOutTrigger
        variant={variant}
        avatarSize={avatarSize}
        signInLabel={texts.signIn}
        isLoggingIn={isLoggingIn}
        className={className}
        onClick={handleSignInClick}
      />
    )
  }

  // ── Build dropdown items ──
  const items = buildUserMenuItems({
    user,
    texts,
    isLoggingOut,
    extraItems,
    theme,
    languages,
    currentLocale,
    onLocaleChange,
    onManageAccount,
    onOpenAccount: () => setShowAccount(true),
    onLogout: handleLogout,
  })

  // ── Render ──
  return (
    <>
      <Dropdown
        trigger={
          <UserMenuAuthenticatedTrigger user={user} variant={variant} avatarSize={avatarSize} />
        }
        items={items}
        align="end"
        side={side}
        menuClassName="min-w-[240px]"
        className={className}
      />
      <AccountModal
        open={showAccount}
        onClose={() => setShowAccount(false)}
        texts={accountModalTexts}
        theme={theme}
        languages={languages}
        currentLocale={currentLocale}
        onLocaleChange={onLocaleChange}
        googleOAuthUrl={googleOAuthUrl}
      />
    </>
  )
}
