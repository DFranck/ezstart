/**
 * Internal logic helpers for `<UserMenuV2>` — plan badge resolution + localized
 * default texts. Pure functions, no JSX, co-located with the component.
 *
 * @internal
 */

import type { AuthUser } from '../../core/types.js'
import { getAuthTexts, type AuthLocale } from '../../i18n/index.js'
import { DEFAULT_USER_MENU_V2_TEXTS, type UserMenuV2Texts } from './types.js'

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
export function getDefaultTextsV2(locale: AuthLocale | string | undefined): UserMenuV2Texts {
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
