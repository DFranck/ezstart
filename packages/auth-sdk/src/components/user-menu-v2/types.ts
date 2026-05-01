/**
 * Shared types for UserMenuV2 — SaaS-pro user dropdown + AccountModalV2 shell.
 *
 * @internal
 */

import type { LoginButtonProps } from '../LoginButton.js'
import type { AccountModalV2Texts } from './AccountModalV2.js'

// ─── Item shape (extra items injected by the consumer app) ───────────────────

export interface UserMenuV2Item {
  /** Display label (already translated by consumer). */
  label: string
  /** Optional href — when set, clicking the item performs `window.location.href = href`. */
  href?: string
  /** Lucide / FA icon name (e.g. 'lucide:LayoutDashboard'). */
  icon?: string
  /** Click handler (runs alongside `href`, both are supported). */
  onClick?: () => void
  /** Renders a divider BEFORE this item. */
  separator?: boolean
}

// ─── User-facing strings — every label has an English default ─────────────────

export interface UserMenuV2Texts {
  /** Trigger label when the user is signed out (`<UserMenuV2>` doubles as a sign-in CTA). */
  signIn: string
  /** Item label for "Manage account" (opens `<AccountModalV2>`). */
  manageAccount: string
  /** Section header for the destructive sign-out group. */
  signOut: string
  /** Trigger label while the logout request is in flight. */
  signingOut: string
  /** Toast on successful sign-out. */
  signOutSuccess: string
  /** Toast when sign-out fails (the local store is reset regardless). */
  signOutError: string
  /** Item label for "Sign out from all devices" (gated by `showSignOutAll`). */
  signOutAllDevices: string
  /** Toast on successful sign-out from all devices. */
  signOutAllSuccess: string
  /** Toast on failed sign-out from all devices. */
  signOutAllError: string

  /** Identity card "Verified" badge label. */
  emailVerified: string
  /** Identity card "Unverified" badge label. */
  emailUnverified: string
  /** Resend verification email link label. */
  resendVerification: string
  /** Toast on successful verification email send. */
  verificationSent: string
  /** Toast on failed verification email send. */
  verifyError: string

  /** "Theme" row label. */
  themeLabel: string
  themeLight: string
  themeDark: string
  themeSystem: string

  /** "Notifications" row label (gated by `onNotificationsClick`). */
  notifications: string
  /** Aria label for the unread notifications badge. */
  notificationsBadgeLabel: string

  /** Section header above help / shortcut / status / changelog rows. */
  helpAndResources: string
  helpCenter: string
  keyboardShortcuts: string
  /** Trail label for the keyboard shortcuts row (e.g. "⌘K"). */
  keyboardShortcutsHint: string
  status: string
  changelog: string

  /** "Pricing & plans" item — gated by `onPlanClick`. */
  managePlan: string

  /**
   * Identity card badge label for users with `globalRoles.includes('superadmin')`.
   * Renders instead of the consumer-provided `planLabel` because a platform-level
   * operator is not on a billing plan — they have full cross-tenant access.
   */
  platformBadge: string
  /**
   * Identity card badge label for users with at least one `appRoles[*]` containing
   * `'admin'` (and not superadmin). Renders instead of `planLabel` to surface the
   * elevated app-level role rather than a misleading subscription tier.
   */
  adminBadge: string
}

// ─── Props for the trigger + dropdown root ────────────────────────────────────

export interface UserMenuV2Props {
  /** Available languages for the locale switcher row. */
  languages?: { code: string; label: string }[]
  /** Current locale code. */
  currentLocale?: string
  /** Locale change handler (omit to hide the locale rows). */
  onLocaleChange?: (locale: string) => void

  /** App-injected extra rows (Dashboard, Admin, Developer, …). */
  extraItems?: UserMenuV2Item[]

  /** Optional className on the dropdown root. */
  className?: string

  /** Override default texts. */
  texts?: Partial<UserMenuV2Texts>

  /** Trigger size (avatar circle radius). */
  avatarSize?: 'sm' | 'md' | 'lg'

  /** Theme controller (`useTheme()` from next-themes). Optional — when omitted theme rows are hidden. */
  theme?: { theme?: string; setTheme: (t: string) => void }

  /** Manual override for "Manage account" — when set, replaces the default `<AccountModalV2>` open. */
  onManageAccount?: () => void

  /** Override texts for the embedded `<AccountModalV2>`. */
  accountModalTexts?: Partial<AccountModalV2Texts>

  /** Google OAuth URL forwarded to the AccountModal. */
  googleOAuthUrl?: string

  /** EZAuth web URL — used by AccountModal advanced security deep link. */
  ezauthWebUrl?: string

  /** Dropdown side. */
  side?: 'top' | 'bottom'

  /** Trigger style — 'icon' = avatar circle only / 'extended' = avatar + name + email row. */
  variant?: 'icon' | 'extended'

  /** Where to redirect after a successful sign-out. Pass `false` to disable. */
  redirectAfterLogout?: string | false

  /** Optional callback fired AFTER server logout, BEFORE redirect. */
  onLogout?: () => void

  /** Hide the embedded sign-in CTA (renders nothing when signed out). */
  hideSignIn?: boolean

  /** Override props forwarded to the embedded `<LoginButton>` (signed-out state). */
  signInProps?: Partial<LoginButtonProps>

  /** Plan label rendered as a Badge in the identity card (e.g. "Free", "Pro", "Enterprise"). */
  planLabel?: string

  /** Click handler for the plan badge (when omitted, the badge is non-clickable). */
  onPlanClick?: () => void

  /** Unread notifications count — when > 0, renders a Badge next to the trigger AND the row label. */
  unreadCount?: number

  /** Click handler for the "Notifications" row (gated — when omitted, row is hidden). */
  onNotificationsClick?: () => void

  /** Help center link href (gated — when omitted, row is hidden). */
  helpHref?: string

  /** Keyboard shortcut handler — when set, the row is rendered with a trail hint (e.g. "⌘K"). */
  onCommandPalette?: () => void

  /** Override the default keyboard shortcut label (default: "⌘K"). */
  commandPaletteHint?: string

  /** Status page href (gated — when omitted, row is hidden). */
  statusHref?: string

  /** Changelog href (gated — when omitted, row is hidden). */
  changelogHref?: string

  /** Show the destructive "Sign out from all devices" row (default: false). */
  showSignOutAll?: boolean

  /**
   * Locale for embedded dictionaries (en | fr | vi). Defaults to the active
   * locale detected from the URL pathname (e.g. `/fr/dashboard` → `'fr'`).
   * Any keys provided in `texts` take precedence over the localized defaults.
   * Mirrors the auto-i18n pattern used by `<SignInForm>` so consumers don't
   * have to wire `texts` per app.
   */
  locale?: string
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_USER_MENU_V2_TEXTS: UserMenuV2Texts = {
  signIn: 'Sign in',
  manageAccount: 'Manage account',
  signOut: 'Sign out',
  signingOut: 'Signing out…',
  signOutSuccess: 'You have been signed out',
  signOutError: 'Failed to sign out — please try again',
  signOutAllDevices: 'Sign out from all devices',
  signOutAllSuccess: 'Signed out from all devices',
  signOutAllError: 'Failed to sign out from all devices',

  emailVerified: 'Verified',
  emailUnverified: 'Unverified',
  resendVerification: 'Resend verification email',
  verificationSent: 'Verification email sent. Check your inbox.',
  verifyError: 'Failed to send verification email',

  themeLabel: 'Theme',
  themeLight: 'Light',
  themeDark: 'Dark',
  themeSystem: 'System',

  notifications: 'Notifications',
  notificationsBadgeLabel: 'unread notifications',

  helpAndResources: 'Help & resources',
  helpCenter: 'Help center',
  keyboardShortcuts: 'Keyboard shortcuts',
  keyboardShortcutsHint: '⌘K',
  status: 'Status',
  changelog: "What's new",

  managePlan: 'Manage plan',

  platformBadge: 'Platform',
  adminBadge: 'Admin',
}
