/**
 * Public types + localized default texts for `<UserMenu>` (V1). Co-located
 * with the component; re-exported from `../UserMenu.tsx` to preserve the
 * canonical import path.
 */

import { getAuthTexts, type AuthLocale } from '../../i18n/index.js'
import type { LoginButtonProps } from '../LoginButton.js'

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
   * single component for both states (logged-in dropdown + logged-out CTA),
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

/**
 * Build the localized default texts for `<UserMenu>` from the auth-sdk
 * embedded dictionaries. Falls back to English when the locale is missing
 * or not supported.
 *
 * @internal
 */
export function getDefaultTexts(locale: AuthLocale | string | undefined): UserMenuTexts {
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
