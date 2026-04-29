'use client'

import { Button, Div, Dropdown, type DropdownItem, Icon, Span } from '@ezstart/ui/components'
import { useState } from 'react'
import { getAuthTexts, type AuthLocale } from '../i18n/index.js'
import { useAuth } from '../react/hooks.js'
import { useAuthNavigation } from '../react/useAuthNavigation.js'
import { AccountModal } from './AccountModal.js'
import { LoginButton, type LoginButtonProps } from './LoginButton.js'
import { UserAvatar } from './UserAvatar.js'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UserMenuItem {
  /** Display label */
  label: string
  /** Navigation href (rendered as onClick with window.location) */
  href?: string
  /** Lucide icon name (e.g. 'lucide:Settings') */
  icon?: string
  /** Click handler */
  onClick?: () => void
  /** Renders a separator before this item */
  separator?: boolean
}

export interface UserMenuTexts {
  signIn: string
  signOut: string
  signingOut: string
  signOutSuccess: string
  signOutError: string
  manageAccount: string
  /** "Theme" row label (only rendered when `theme` prop is provided). */
  themeLabel: string
  /** Trailing label shown when current scheme is `'light'`. */
  themeLight: string
  /** Trailing label shown when current scheme is `'dark'`. */
  themeDark: string
  /** Trailing label shown when current scheme is `'system'` / unset. */
  themeSystem: string
}

export interface UserMenuProps {
  /** Available languages for selector */
  languages?: { code: string; label: string }[]
  /** Current locale code */
  currentLocale?: string
  /** Locale change handler */
  onLocaleChange?: (locale: string) => void
  /** Custom menu items injected by the app */
  extraItems?: UserMenuItem[]
  /** Additional class name on the root container */
  className?: string
  /** Override default texts */
  texts?: Partial<UserMenuTexts>
  /** Avatar trigger size */
  avatarSize?: 'sm' | 'md' | 'lg'
  /** Theme getter — pass `useTheme()` result to avoid hard dep on next-themes */
  theme?: { theme?: string; setTheme: (t: string) => void }
  /** Override "Manage account" behavior (e.g. navigate to settings page) */
  onManageAccount?: () => void
  /** Override texts for AccountModal */
  accountModalTexts?: Record<string, string>
  /** Google OAuth URL for "Connect account" button in AccountModal */
  googleOAuthUrl?: string
  /** Dropdown open direction */
  side?: 'top' | 'bottom'
  /** Trigger style: 'icon' = avatar only, 'extended' = avatar + name + email */
  variant?: 'icon' | 'extended'
  /**
   * Where to navigate after a successful logout. Defaults to `'/'`.
   * The SDK calls `window.location.href = redirectAfterLogout` AFTER the
   * server-side `/logout` round-trip completes (cookies cleared, refresh
   * tokens revoked, audit log written) — this guarantees the destination
   * paints in the unauthenticated state, no stale `RequireAuth` flicker.
   * Pass `false` to disable the redirect (the consumer handles navigation).
   */
  redirectAfterLogout?: string | false
  /**
   * Optional callback fired BEFORE the redirect (after store cleanup).
   * Useful for clearing app-specific caches (React Query, SWR, IndexedDB)
   * or showing a toast.
   */
  onLogout?: () => void
  /**
   * Hide the embedded sign-in button rendered when the user is not
   * authenticated. Defaults to `false` — `<UserMenu>` is the canonical
   * single drop-in for both states (logged-in dropdown + logged-out CTA),
   * so consumers don't have to maintain a `{isAuthenticated ? <UserMenu /> :
   * <LoginButton />}` ternary that triggers an unmount/remount cycle on
   * auth state changes.
   *
   * Pass `true` for layouts that mount their own sign-in CTA elsewhere
   * (e.g. a hero "Get started" button that doubles as the auth entry point).
   */
  hideSignIn?: boolean
  /**
   * Override props forwarded to the embedded `<LoginButton>` (sign-in CTA
   * shown when the user is not authenticated). The default visual mirrors
   * the menu's `variant` so the trigger keeps a consistent rhythm
   * (`'icon'` -> ghost icon button, `'extended'` -> default with text).
   */
  signInProps?: Partial<LoginButtonProps>
  /**
   * Locale for embedded dictionaries (en | fr | vi). Defaults to the active
   * locale detected from the URL pathname (e.g. `/fr/dashboard` → `'fr'`).
   * Any keys provided in `texts` take precedence over the localized defaults.
   * Mirrors the auto-i18n pattern used by `<SignInForm>` so consumers don't
   * have to wire `texts` per app.
   */
  locale?: AuthLocale | string
}

// ─── Defaults ────────────────────────────────────────────────────────────────

/**
 * Build the localized default texts for `<UserMenu>` from the auth-sdk
 * embedded dictionaries. Falls back to English when the locale is missing
 * or not supported.
 *
 * @internal
 */
function getDefaultTexts(locale: AuthLocale | string | undefined): UserMenuTexts {
  const dict = getAuthTexts(locale, 'userMenu')
  return {
    signIn: dict.signIn,
    signOut: dict.signOut,
    signingOut: dict.signingOut,
    signOutSuccess: dict.signOutSuccess,
    signOutError: dict.signOutError,
    manageAccount: dict.manageAccount,
    themeLabel: dict.themeLabel,
    themeLight: dict.themeLight,
    themeDark: dict.themeDark,
    themeSystem: dict.themeSystem,
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

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

    if (variant === 'icon') {
      return (
        <Button
          variant="default"
          size="icon"
          className={`rounded-full cursor-pointer ${className ?? ''}`.trim()}
          aria-label={texts.signIn}
          onClick={handleSignInClick}
          disabled={isLoggingIn}
        >
          <Icon
            name={isLoggingIn ? 'fa:FaSpinner' : 'fa:FaUser'}
            spin={isLoggingIn}
            className="w-5 h-5"
          />
        </Button>
      )
    }

    // `'extended'` — same horizontal row as the authenticated trigger
    // (avatar circle + label column), with placeholder avatar + "Sign in".
    return (
      <Button
        variant="default"
        className={`w-full justify-start h-auto py-2 px-2 cursor-pointer ${className ?? ''}`.trim()}
        aria-label={texts.signIn}
        onClick={handleSignInClick}
        disabled={isLoggingIn}
      >
        <Div className="flex items-center gap-2 w-full min-w-0">
          <Div
            className={`flex items-center justify-center rounded-full ${
              avatarSize === 'lg' ? 'h-10 w-10' : avatarSize === 'sm' ? 'h-7 w-7' : 'h-8 w-8'
            }`}
          >
            <Icon
              name={isLoggingIn ? 'fa:FaSpinner' : 'fa:FaUser'}
              spin={isLoggingIn}
              className="w-4 h-4"
            />
          </Div>
          <Span className="text-sm font-medium truncate text-left">{texts.signIn}</Span>
        </Div>
      </Button>
    )
  }

  const fullName = user.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`
    : user.username

  // ── Build dropdown items ──
  const items: DropdownItem[] = []

  // 1. Header: avatar + name + email (non-clickable)
  items.push({
    label: (
      <Div className="flex items-center gap-2 pointer-events-none">
        <UserAvatar size="sm" user={user} />
        <Div className="flex flex-col min-w-0">
          <Span className="text-sm font-medium text-foreground truncate">{fullName}</Span>
          <Span className="text-xs text-muted-foreground truncate">{user.email}</Span>
        </Div>
      </Div>
    ),
    value: '_user-info',
    disabled: true,
    divider: true,
  })

  // 2. Manage account
  items.push({
    label: texts.manageAccount,
    value: '_manage-account',
    icon: <Icon name="lucide:Settings" className="w-4 h-4" />,
    onSelect: () => {
      if (onManageAccount) {
        onManageAccount()
      } else {
        setShowAccount(true)
      }
    },
  })

  // 3. Extra items from the app
  if (extraItems && extraItems.length > 0) {
    extraItems.forEach((item, index) => {
      if (item.separator && index > 0) {
        const prevItem = items[items.length - 1]
        if (prevItem) prevItem.divider = true
      }

      items.push({
        label: item.label,
        value: `extra-${index}`,
        icon: item.icon ? (
          <Icon name={item.icon as 'lucide:LogIn'} className="w-4 h-4" />
        ) : undefined,
        onSelect: () => {
          if (item.onClick) item.onClick()
          if (item.href) window.location.href = item.href
        },
      })
    })
  }

  // 4. Embedded personalization switchers — only render when the consumer
  //    passes the matching config props. The SDK ships the UI; the consumer
  //    decides via prop presence whether to expose it. Stripe / Clerk pattern:
  //    user menu ALSO surfaces theme + locale toggles so the consumer never
  //    has to wire these into a custom row beside the dropdown.
  const hasThemeSwitcher = !!theme && typeof theme.setTheme === 'function'
  const hasLocaleSwitcher = Array.isArray(languages) && languages.length > 1 && !!onLocaleChange

  if (hasThemeSwitcher || hasLocaleSwitcher) {
    const prevItem = items[items.length - 1]
    if (prevItem) prevItem.divider = true
  }

  if (hasThemeSwitcher && theme) {
    const currentTheme = theme.theme ?? 'system'
    const nextTheme =
      currentTheme === 'light' ? 'dark' : currentTheme === 'dark' ? 'system' : 'light'
    const themeIcon =
      currentTheme === 'dark'
        ? 'lucide:Moon'
        : currentTheme === 'light'
          ? 'lucide:Sun'
          : 'lucide:Monitor'
    const themeLabel =
      currentTheme === 'dark'
        ? texts.themeDark
        : currentTheme === 'light'
          ? texts.themeLight
          : texts.themeSystem
    items.push({
      label: (
        <Div className="flex items-center justify-between gap-2 w-full">
          <Span className="text-sm">{texts.themeLabel}</Span>
          <Span className="text-xs text-muted-foreground">{themeLabel}</Span>
        </Div>
      ),
      value: '_theme-toggle',
      icon: <Icon name={themeIcon} className="w-4 h-4" />,
      onSelect: () => theme.setTheme(nextTheme),
    })
  }

  if (hasLocaleSwitcher && languages && onLocaleChange) {
    languages.forEach(lang => {
      const isCurrent = lang.code === currentLocale
      items.push({
        label: (
          <Div className="flex items-center justify-between gap-2 w-full">
            <Span className="text-sm">{lang.label}</Span>
            {isCurrent ? <Icon name="lucide:Check" className="w-4 h-4 text-primary" /> : null}
          </Div>
        ),
        value: `_locale-${lang.code}`,
        icon: <Icon name="lucide:Globe" className="w-4 h-4" />,
        onSelect: () => {
          if (!isCurrent) onLocaleChange(lang.code)
        },
      })
    })
  }

  // 5. Divider + Sign out (destructive)
  const lastItem = items[items.length - 1]
  if (lastItem) lastItem.divider = true

  items.push({
    label: (
      <Span className="text-destructive">{isLoggingOut ? texts.signingOut : texts.signOut}</Span>
    ),
    value: '_sign-out',
    icon: (
      <Icon
        name={isLoggingOut ? 'fa:FaSpinner' : 'lucide:LogOut'}
        spin={isLoggingOut}
        className="w-4 h-4 text-destructive"
      />
    ),
    disabled: isLoggingOut,
    onSelect: handleLogout,
  })

  // ── Render ──
  return (
    <>
      <Dropdown
        trigger={
          variant === 'extended' ? (
            <Button
              variant="ghost"
              className="w-full justify-start h-auto py-2 px-2 cursor-pointer"
              aria-label="User menu"
            >
              <Div className="flex items-center gap-2 w-full min-w-0">
                <UserAvatar size={avatarSize} user={user} />
                <Div className="flex flex-col min-w-0 text-left">
                  <Span className="text-sm font-medium truncate">{fullName}</Span>
                  <Span className="text-xs text-muted-foreground truncate">{user.email}</Span>
                </Div>
              </Div>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full cursor-pointer"
              aria-label="User menu"
            >
              <UserAvatar size={avatarSize} user={user} />
            </Button>
          )
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
