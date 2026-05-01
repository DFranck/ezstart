'use client'

/**
 * Client-side guard that blocks elevated-role users (admin / superadmin)
 * from rendering admin UI until they enroll 2FA.
 *
 * Defense-in-depth companion to the backend `requireTwoFactor()` Express
 * middleware (`apps/ezauth/api/src/middleware/require-two-factor.ts`) which
 * is the actual security source of truth — every `/api/admin/*` route
 * already returns 403 + `code: 'TWO_FACTOR_REQUIRED'` for un-enrolled
 * admins. This component just stops the elevated UI from rendering at all
 * so the user gets a friendly nudge instead of every API call failing.
 *
 * Behavior :
 * - Not authenticated → render `null` (the surrounding `<RequireAuth>` is
 *   expected to handle that case).
 * - Authenticated + NOT elevated → render `children` (no-op for plain
 *   users — same component can wrap routes that have mixed audiences).
 * - Authenticated + elevated + 2FA enrolled → render `children`.
 * - Authenticated + elevated + 2FA NOT enrolled → render `fallback` (or the
 *   default Card with a CTA pointing at the 2FA settings page).
 *
 * Industry pattern (Stripe / Clerk / Auth0): every dashboard with admin
 * surfaces enforces 2FA on elevated roles or the platform is one
 * compromised cookie away from a full breach.
 *
 * @example
 * ```tsx
 * <RequireAuth>
 *   <RequireRole roles={['admin', 'superadmin']}>
 *     <RequireTwoFactor>
 *       <AuthAdminDashboard />
 *     </RequireTwoFactor>
 *   </RequireRole>
 * </RequireAuth>
 * ```
 *
 * @example Custom fallback :
 * ```tsx
 * <RequireTwoFactor fallback={<CustomTwoFactorPrompt />}>
 *   <AdminPanel />
 * </RequireTwoFactor>
 * ```
 */

import type { ReactNode } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Div,
  Icon,
} from '@ezstart/ui/components'
import { useAuth } from '../react/hooks.js'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RequireTwoFactorTexts {
  /** Card heading shown in the default fallback. */
  title: string
  /** Card description shown in the default fallback. */
  description: string
  /** CTA label on the "Enable 2FA now" button. */
  cta: string
}

export interface RequireTwoFactorProps {
  /** Subtree rendered once the elevated user has enrolled 2FA. */
  children: ReactNode
  /**
   * Custom UI rendered when the authenticated user has an elevated role
   * (admin / superadmin) but no enrolled TOTP. Defaults to a polite Card
   * with a CTA pointing at `/settings?tab=2fa`.
   */
  fallback?: ReactNode
  /**
   * Path the default CTA navigates to. Defaults to `/settings?tab=2fa`.
   * Override when the consumer's settings UI lives at a different route
   * (e.g. `/account/security`).
   */
  fallbackPath?: string
  /** Partial texts override — falls back to English defaults. */
  texts?: Partial<RequireTwoFactorTexts>
}

// ─── Defaults ───────────────────────────────────────────────────────────────

export const DEFAULT_REQUIRE_TWO_FACTOR_TEXTS: RequireTwoFactorTexts = {
  title: 'Two-factor authentication required',
  description:
    'Your account has admin privileges. To protect platform data, you must enable two-factor authentication before accessing this surface.',
  cta: 'Enable 2FA now',
}

const ELEVATED_ROLES = new Set<string>(['admin', 'superadmin'])

function userHasElevatedRole(user: {
  globalRoles?: string[]
  appRoles?: Record<string, string[]>
}): boolean {
  if (user.globalRoles?.some(r => ELEVATED_ROLES.has(r))) return true
  if (user.appRoles) {
    for (const roles of Object.values(user.appRoles)) {
      if (Array.isArray(roles) && roles.some(r => ELEVATED_ROLES.has(r))) return true
    }
  }
  return false
}

// ─── Default fallback Card ──────────────────────────────────────────────────

interface DefaultFallbackProps {
  texts: RequireTwoFactorTexts
  fallbackPath: string
}

function DefaultFallback({ texts, fallbackPath }: DefaultFallbackProps) {
  // Hard `window.location.assign` (NOT `router.push`) so the destination page
  // re-bootstraps from scratch. Mirrors the logout flow pattern documented in
  // `standard-sdk-dx.md` §11ter — soft client-side navigations can leak
  // stale state and confuse the 2FA enrollment UI.
  const handleClick = () => {
    if (typeof window !== 'undefined') {
      window.location.assign(fallbackPath)
    }
  }

  return (
    <Div
      className="flex items-center justify-center min-h-[60vh] p-4"
      role="status"
      aria-live="polite"
    >
      <Card intent="warning" className="max-w-md w-full">
        <CardHeader>
          <Div className="flex items-center gap-2">
            <Icon name="lucide:ShieldAlert" className="h-5 w-5 text-warning" ariaHidden />
            <CardTitle>{texts.title}</CardTitle>
          </Div>
          <CardDescription>{texts.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleClick}>{texts.cta}</Button>
        </CardContent>
      </Card>
    </Div>
  )
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Guard component that blocks rendering its children until elevated-role
 * users (admin / superadmin) enroll 2FA. Plain users pass through
 * unchanged.
 */
export function RequireTwoFactor({
  children,
  fallback,
  fallbackPath = '/settings?tab=2fa',
  texts,
}: RequireTwoFactorProps) {
  const { user } = useAuth()
  const t: RequireTwoFactorTexts = { ...DEFAULT_REQUIRE_TWO_FACTOR_TEXTS, ...texts }

  // Surrounding `<RequireAuth>` (or equivalent) handles the not-logged-in
  // case — render nothing here so we don't double up CTAs.
  if (!user) return null

  if (!userHasElevatedRole(user)) {
    return <>{children}</>
  }

  // 2FA flag arrives via `getMe()` (and via the JWT `twoFactorEnabled` claim
  // for newer tokens). Coerce to `false` for safety — `undefined` should be
  // treated as "unknown, deny" to prevent rendering admin UI without proof
  // of enrollment.
  const enrolled = (user as { twoFactorEnabled?: boolean }).twoFactorEnabled === true
  if (enrolled) {
    return <>{children}</>
  }

  if (fallback !== undefined) {
    return <>{fallback}</>
  }

  return <DefaultFallback texts={t} fallbackPath={fallbackPath} />
}
