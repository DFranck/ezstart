'use client'

import { Badge, Div, Dropdown, type DropdownItem, Icon, Span } from '@ezstart/ui/components'
import { useState } from 'react'
import { toast } from 'sonner'
import type { AuthUser } from '../../core/types.js'
import { getAuthTexts, type AuthLocale } from '../../i18n/index.js'
import { useAuth } from '../../react/hooks.js'
import { useAuthNavigation } from '../../react/useAuthNavigation.js'
import { LoginButton } from '../LoginButton.js'
import { UserAvatar } from '../UserAvatar.js'
import { AccountModalV2 } from './AccountModalV2.js'
import { DEFAULT_USER_MENU_V2_TEXTS, type UserMenuV2Props, type UserMenuV2Texts } from './types.js'
import { UserMenuV2Trigger } from './UserMenuV2Trigger.js'

/**
 * Identity-card plan badge descriptor — derived from the user's role surface
 * with a fallback to the consumer-provided `planLabel`.
 *
 * @internal
 */
export type PlanBadgeDescriptor = {
  label: string
  variant: 'secondary' | 'primary' | 'purple' | 'info'
  icon?: 'lucide:Crown' | 'lucide:ShieldCheck'
}

/**
 * Resolve the identity-card plan badge from a user's roles + the
 * consumer-provided `planLabel`. Exported for unit testing — the JSX
 * consumer is `<UserMenuV2>` itself.
 *
 * Resolution priority (first match wins):
 *   1. `globalRoles` includes `'superadmin'` → "Platform" (purple, Crown)
 *   2. any `appRoles[*]` includes `'admin'` → "Admin" (info, ShieldCheck)
 *   3. consumer-provided `planLabel` → subscription tier (variant per tier)
 *   4. nothing → no badge rendered
 *
 * Elevated roles (1 + 2) override the consumer-provided `planLabel` because
 * a superadmin / app admin is NOT on a billing plan in the conventional sense
 * — surfacing "Free" next to their name is misleading and was the original
 * bug (USER-MENU-PLAN-BADGE-SUPERADMIN).
 *
 * @internal
 */
export function resolvePlanBadge(
  user: AuthUser,
  planLabel: string | undefined,
  texts: Pick<UserMenuV2Texts, 'platformBadge' | 'adminBadge'>
): PlanBadgeDescriptor | null {
  // 1. Platform-level operator — bypasses billing entirely.
  if (user.globalRoles?.includes('superadmin')) {
    return { label: texts.platformBadge, variant: 'purple', icon: 'lucide:Crown' }
  }

  // 2. App-level admin (any owned app). Iterate `appRoles` values and look
  //    for the literal `'admin'` role.
  const appRoles = user.appRoles ?? {}
  const isAppAdmin = Object.values(appRoles).some(roles => roles.includes('admin'))
  if (isAppAdmin) {
    return { label: texts.adminBadge, variant: 'info', icon: 'lucide:ShieldCheck' }
  }

  // 3. Subscription plan name from the consumer (e.g. "Free", "Pro", "Enterprise").
  if (planLabel) {
    const variant: PlanBadgeDescriptor['variant'] =
      planLabel === 'Enterprise' ? 'purple' : planLabel === 'Free' ? 'secondary' : 'primary'
    return { label: planLabel, variant }
  }

  // 4. Nothing to render.
  return null
}

/**
 * Build the localized default texts for `<UserMenuV2>` from the auth-sdk
 * embedded dictionaries. Falls back to English when the locale is missing
 * or not supported. Keys not exposed in the dictionary (e.g. `helpAndResources`,
 * `managePlan`) keep their EN defaults from `DEFAULT_USER_MENU_V2_TEXTS`.
 *
 * @internal
 */
function getDefaultTextsV2(locale: AuthLocale | string | undefined): UserMenuV2Texts {
  const dict = getAuthTexts(locale, 'userMenu')
  return {
    ...DEFAULT_USER_MENU_V2_TEXTS,
    signIn: dict.signIn,
    manageAccount: dict.manageAccount,
    signOut: dict.signOut,
    signingOut: dict.signingOut,
    signOutSuccess: dict.signOutSuccess,
    signOutError: dict.signOutError,
    signOutAllDevices: dict.signOutAllDevices,
    signOutAllSuccess: dict.signOutAllSuccess,
    signOutAllError: dict.signOutAllError,
    emailVerified: dict.emailVerified,
    emailUnverified: dict.emailUnverified,
    resendVerification: dict.resendVerification,
    verificationSent: dict.verificationSent,
    verifyError: dict.verifyError,
    themeLabel: dict.themeLabel,
    themeLight: dict.themeLight,
    themeDark: dict.themeDark,
    themeSystem: dict.themeSystem,
    notifications: dict.notifications,
    notificationsBadgeLabel: dict.notificationsBadgeLabel,
    helpAndResources: dict.helpAndResources,
    helpCenter: dict.helpCenter,
    keyboardShortcuts: dict.keyboardShortcuts,
    keyboardShortcutsHint: dict.keyboardShortcutsHint,
    status: dict.status,
    changelog: dict.changelog,
    managePlan: dict.managePlan,
    platformBadge: dict.platformBadge,
    adminBadge: dict.adminBadge,
  }
}

/**
 * V2 — SaaS-pro user dropdown (Stripe / Clerk / Vercel parity).
 *
 * Drop-in upgrade for `<UserMenu>`. Adds:
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

  const isVerified = Boolean((user as { isVerified?: boolean }).isVerified)
  const fullName = user.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`
    : user.username
  const planBadge = resolvePlanBadge(user, planLabel, texts)

  // ── Build dropdown items ──
  const items: DropdownItem[] = []

  // 1. Identity card (top, non-clickable) — avatar + name + email + badges
  items.push({
    label: (
      <Div className="flex flex-col gap-2 pointer-events-none">
        <Div className="flex items-center gap-3 min-w-0">
          <UserAvatar size="sm" user={user} />
          <Div className="flex flex-col min-w-0 flex-1">
            <Span className="text-sm font-medium text-foreground truncate">{fullName}</Span>
            <Span className="text-xs text-muted-foreground truncate">{user.email}</Span>
          </Div>
        </Div>
        <Div className="flex flex-wrap items-center gap-1.5">
          {isVerified ? (
            <Badge
              variant="outline"
              size="xs"
              className="bg-success/15 text-success border-success/30"
            >
              <Icon name="lucide:CheckCircle2" size={10} className="mr-1" />
              {texts.emailVerified}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              size="xs"
              className="bg-warning/15 text-warning border-warning/30"
            >
              <Icon name="lucide:AlertTriangle" size={10} className="mr-1" />
              {texts.emailUnverified}
            </Badge>
          )}
          {planBadge && (
            <Badge variant={planBadge.variant} size="xs">
              {planBadge.icon && <Icon name={planBadge.icon} size={10} className="mr-1" />}
              {planBadge.label}
            </Badge>
          )}
        </Div>
      </Div>
    ),
    value: '_user-info',
    disabled: true,
    divider: true,
  })

  // 2. Manage account (always present)
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

  // 2b. Manage plan (gated)
  if (onPlanClick) {
    items.push({
      label: texts.managePlan,
      value: '_manage-plan',
      icon: <Icon name="lucide:CreditCard" className="w-4 h-4" />,
      onSelect: onPlanClick,
    })
  }

  // 2c. Notifications (gated)
  if (onNotificationsClick) {
    const hasUnread = typeof unreadCount === 'number' && unreadCount > 0
    items.push({
      label: (
        <Div className="flex items-center justify-between gap-2 w-full">
          <Span className="text-sm">{texts.notifications}</Span>
          {hasUnread && (
            <Badge variant="destructive" size="xs">
              {unreadCount! > 99 ? '99+' : String(unreadCount)}
            </Badge>
          )}
        </Div>
      ),
      value: '_notifications',
      icon: <Icon name="lucide:Bell" className="w-4 h-4" />,
      onSelect: onNotificationsClick,
    })
  }

  // 3. Extra items injected by the consumer app
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

  // 4. Personalization (theme + locale) lives in `<AccountModalV2>` →
  //    "Personalization" tab — NOT in the dropdown. The dropdown stays
  //    compact (identity + key actions + help + sign out) ; theme/locale
  //    are wired through to `<AccountModalV2>` via the same `theme` /
  //    `languages` / `onLocaleChange` props which are forwarded below.
  //    Reasoning: the dropdown was getting cluttered with N rows (theme
  //    line + 1 line per language). Putting them in the Personalization
  //    section of the modal mirrors how Stripe / Clerk surface these — a
  //    dedicated tab in the account settings, not a perma-visible row.

  // 5. Help & resources (each gated)
  const hasAnyHelp = !!helpHref || !!onCommandPalette || !!statusHref || !!changelogHref
  if (hasAnyHelp) {
    const prevItem = items[items.length - 1]
    if (prevItem) prevItem.divider = true
  }

  if (helpHref) {
    items.push({
      label: texts.helpCenter,
      value: '_help-center',
      icon: <Icon name="lucide:HelpCircle" className="w-4 h-4" />,
      onSelect: () => {
        if (typeof window !== 'undefined') window.location.href = helpHref
      },
    })
  }

  if (onCommandPalette) {
    items.push({
      label: (
        <Div className="flex items-center justify-between gap-2 w-full">
          <Span className="text-sm">{texts.keyboardShortcuts}</Span>
          <Span className="text-xs text-muted-foreground">
            {commandPaletteHint ?? texts.keyboardShortcutsHint}
          </Span>
        </Div>
      ),
      value: '_command-palette',
      icon: <Icon name="lucide:Keyboard" className="w-4 h-4" />,
      onSelect: onCommandPalette,
    })
  }

  if (statusHref) {
    items.push({
      label: texts.status,
      value: '_status',
      icon: <Icon name="lucide:Activity" className="w-4 h-4" />,
      onSelect: () => {
        if (typeof window !== 'undefined') window.open(statusHref, '_blank', 'noopener,noreferrer')
      },
    })
  }

  if (changelogHref) {
    items.push({
      label: texts.changelog,
      value: '_changelog',
      icon: <Icon name="lucide:Sparkles" className="w-4 h-4" />,
      onSelect: () => {
        if (typeof window !== 'undefined') window.location.href = changelogHref
      },
    })
  }

  // 6. Sign out (destructive — last group)
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

  if (showSignOutAll) {
    items.push({
      label: (
        <Span className="text-destructive">
          {signingOutAll ? texts.signingOut : texts.signOutAllDevices}
        </Span>
      ),
      value: '_sign-out-all',
      icon: (
        <Icon
          name={signingOutAll ? 'fa:FaSpinner' : 'lucide:LogOut'}
          spin={signingOutAll}
          className="w-4 h-4 text-destructive"
        />
      ),
      disabled: signingOutAll || isLoggingOut,
      onSelect: () => {
        void handleSignOutAll()
      },
    })
  }

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
