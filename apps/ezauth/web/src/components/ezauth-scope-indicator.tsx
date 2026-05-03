'use client'

import { useAuth } from '@ezstart/auth-sdk'
import { ScopeContextIndicator } from '@ezstart/auth-sdk/components'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

/**
 * EZAuth-specific wrapper around the SDK's `<ScopeContextIndicator />`.
 *
 * Centralises the locale-aware switch path, the i18n texts, and the
 * `superadmin` capability check so consumer pages (`/dashboard`, `/admin`,
 * sub-routes) only have to drop `<EzauthScopeIndicator scope="..." />` in.
 *
 * Pure presentational — no fetch, no router push, just reads the auth store
 * and the active locale.
 *
 * @example dashboard usage
 * ```tsx
 * <EZAuthDashboard
 *   topBarExtra={<EzauthScopeIndicator scope="user" />}
 *   ...
 * />
 * ```
 *
 * @example admin usage
 * ```tsx
 * <Div className="flex items-center gap-3">
 *   <H1 size="h2">{t('title')}</H1>
 *   <EzauthScopeIndicator scope="admin" />
 * </Div>
 * ```
 */
export function EzauthScopeIndicator({
  scope,
  className,
}: {
  scope: 'user' | 'admin'
  className?: string
}) {
  const { user, isAuthenticated } = useAuth()
  const t = useTranslations('layout')

  if (!isAuthenticated || !user) return null

  const isSuperadmin = user.globalRoles?.includes('superadmin') ?? false
  // `Link` is imported from `@/i18n/navigation` and auto-prepends the active
  // locale, so the path here MUST be locale-less. Including `${locale}` would
  // produce `/en/en/admin` (cf. FIX-E2E-BATCH-001 BUG 2).
  const switchPath = scope === 'admin' ? '/dashboard' : '/admin'

  return (
    <ScopeContextIndicator
      scope={scope}
      canSwitchToAdmin={isSuperadmin}
      switchPath={switchPath}
      LinkComponent={Link}
      className={className}
      texts={{
        userMode: t('scopeUserMode'),
        adminMode: t('scopeAdminMode'),
        switchToAdmin: t('switchToAdmin'),
        switchToUser: t('switchToUser'),
      }}
    />
  )
}
