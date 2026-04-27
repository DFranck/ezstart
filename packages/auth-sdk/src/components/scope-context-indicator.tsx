'use client'

import { Badge, Button, Icon, Span } from '@ezstart/ui/components'
import type { ComponentType, ReactNode } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ScopeContextIndicatorTexts {
  /** Label rendered in the badge when `scope === 'user'`. */
  userMode: string
  /** Label rendered in the badge when `scope === 'admin'`. */
  adminMode: string
  /** Toggle label shown when current scope is `user` (action: jump to admin). */
  switchToAdmin: string
  /** Toggle label shown when current scope is `admin` (action: jump back to user). */
  switchToUser: string
}

export interface ScopeContextIndicatorLinkProps {
  href: string
  children: ReactNode
  className?: string
}

export interface ScopeContextIndicatorProps {
  /** Current scope: 'user' or 'admin'. The consuming app derives this from the active route. */
  scope: 'user' | 'admin'
  /** Whether the current viewer has the superadmin role. Controls toggle visibility. */
  canSwitchToAdmin: boolean
  /** Path to navigate to when toggling (e.g. `/admin` or `/dashboard`, locale-prefixed by the app). */
  switchPath: string
  /** Optional Link wrapper for SPA navigation (e.g. next-intl's i18n-aware Link). Falls back to `<a>`. */
  LinkComponent?: ComponentType<ScopeContextIndicatorLinkProps>
  /** Optional override of the default English texts. */
  texts?: Partial<ScopeContextIndicatorTexts>
  /** Extra classes appended to the wrapper element. */
  className?: string
}

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_TEXTS: ScopeContextIndicatorTexts = {
  userMode: 'Personal account',
  adminMode: 'Platform admin',
  switchToAdmin: 'Switch to admin',
  switchToUser: 'Switch to personal',
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Visual context indicator for SaaS apps where superadmins switch between
 * a personal user dashboard and a platform admin area (Stripe Dashboard pattern).
 *
 * - Renders a Badge with an Icon + label that reflects the current scope.
 * - Uses the `secondary` variant for user scope and `destructive` for admin
 *   scope so the visual contrast is unambiguous in both light and dark modes.
 * - When `canSwitchToAdmin` is true, renders a Button (asChild around a Link)
 *   that flips to the opposite scope.
 * - Pure presentational primitive: zero data fetching, zero coupling to any
 *   i18n library or routing library — the consumer passes the resolved
 *   pathname via `switchPath` and the optional `LinkComponent`.
 *
 * @example basic React usage with next-intl Link
 * ```tsx
 * import { Link } from '@/i18n/navigation'
 * import { ScopeContextIndicator } from '@ezstart/auth-sdk/components'
 *
 * <ScopeContextIndicator
 *   scope={pathname.includes('/admin') ? 'admin' : 'user'}
 *   canSwitchToAdmin={user.globalRoles.includes('superadmin')}
 *   switchPath={pathname.includes('/admin') ? `/${locale}/dashboard` : `/${locale}/admin`}
 *   LinkComponent={Link}
 *   texts={{
 *     userMode: t('scopeUserMode'),
 *     adminMode: t('scopeAdminMode'),
 *     switchToAdmin: t('switchToAdmin'),
 *     switchToUser: t('switchToUser'),
 *   }}
 * />
 * ```
 */
export function ScopeContextIndicator({
  scope,
  canSwitchToAdmin,
  switchPath,
  LinkComponent,
  texts,
  className,
}: ScopeContextIndicatorProps) {
  const t = { ...DEFAULT_TEXTS, ...texts }

  const isAdmin = scope === 'admin'
  const badgeIconName = isAdmin ? 'lucide:Shield' : 'lucide:User'
  const badgeLabel = isAdmin ? t.adminMode : t.userMode
  const badgeVariant = isAdmin ? 'destructive' : 'secondary'

  const toggleLabel = isAdmin ? t.switchToUser : t.switchToAdmin
  const toggleArrow = isAdmin ? '←' : '→'

  // Default fallback Link uses a plain anchor — no SPA navigation.
  const ResolvedLink: ComponentType<ScopeContextIndicatorLinkProps> =
    LinkComponent ??
    (({ href, children, className: linkClassName }) => (
      <a href={href} className={linkClassName}>
        {children}
      </a>
    ))

  return (
    <Span
      data-scope={scope}
      className={['inline-flex items-center gap-2', className].filter(Boolean).join(' ')}
    >
      <Badge
        variant={badgeVariant}
        size="sm"
        aria-label={badgeLabel}
        className="inline-flex items-center gap-1.5"
      >
        <Icon name={badgeIconName} className="w-3.5 h-3.5" aria-hidden="true" />
        <Span className="hidden sm:inline">{badgeLabel}</Span>
      </Badge>
      {canSwitchToAdmin && (
        <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex text-xs gap-1">
          <ResolvedLink href={switchPath}>
            {isAdmin ? (
              <>
                <Span aria-hidden="true">{toggleArrow}</Span>
                <Span>{toggleLabel}</Span>
              </>
            ) : (
              <>
                <Span>{toggleLabel}</Span>
                <Span aria-hidden="true">{toggleArrow}</Span>
              </>
            )}
          </ResolvedLink>
        </Button>
      )}
    </Span>
  )
}
