/**
 * Tenant-ownership resolution for EZPay write routes.
 *
 * Several admin/management routes (refund, cancel, change-plan) used to gate
 * access with a *binary* `isAdminUser(req)` check. That conflates two very
 * different roles:
 *
 *   - a **platform superadmin** (`globalRoles` includes `'superadmin'`), who
 *     legitimately acts across every tenant; and
 *   - an **app admin** (`appRoles[<slug>]` includes `'admin'`, or an
 *     `ez_sk_*` admin API key bound to one Application), who must be confined
 *     to the Application(s) they own.
 *
 * Treating both as "admin" lets an app admin of tenant X refund / cancel /
 * re-price a payment that belongs to tenant Y — a cross-tenant escalation
 * (Wave E finding C-3). This module centralises the correct decision so the
 * routes don't each re-implement (and drift on) the rule.
 *
 * The tenant identity carried by a `Payment` is its `projectId` — the ezauth
 * Application **slug** the payment was recorded against (see `routes/payments/
 * list.ts`, which scopes `myApps` via `projectId IN [ownedSlugs]`). We reuse
 * the exact same source of truth here:
 *
 *   - API-key path → `req.apiKeyAppSlug` (already validated upstream by the
 *     api-key middleware; never the caller-controlled body).
 *   - JWT path → the owner-scoped `GET /api/applications` list via
 *     `listApplicationsByOwner({ bearerToken })`, which ezauth answers with
 *     ONLY the Applications the JWT subject owns.
 *
 * Fail-closed: when ownership cannot be positively established (ezauth
 * unreachable / circuit open → empty slug list, missing tenant id, etc.) the
 * caller is denied.
 *
 * @module apps/ezpay/api/src/services/tenant-ownership
 */

import type { Request } from 'express'

import { listApplicationsByOwner } from './ezauth-client.js'

/** Outcome of {@link resolveTenantAccess}. */
export interface TenantAccessDecision {
  /** Whether the caller may act on the target tenant's record. */
  allowed: boolean
  /**
   * Why access was granted — useful for audit logs and tests.
   * - `'superadmin'` — platform-wide global role.
   * - `'apiKeyApp'` — admin API key bound to the matching Application slug.
   * - `'ownedApp'` — JWT subject owns the matching Application.
   * - `'denied'` — none of the above (caller is not entitled).
   */
  reason: 'superadmin' | 'apiKeyApp' | 'ownedApp' | 'denied'
}

/**
 * Extract the Bearer JWT from the `Authorization` header or the legacy
 * `ezauth_token` cookie. Mirrors the helper inlined across the EZPay routes
 * so the owner-scoped ezauth lookup forwards the caller's identity (and not
 * the platform S2S key).
 *
 * @internal
 */
export function extractBearerToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }
  const cookieHeader = req.headers.cookie || ''
  return cookieHeader
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('ezauth_token='))
    ?.split('=')[1]
}

/** `true` when the authenticated subject holds the platform superadmin role. */
export function isSuperadmin(req: Request): boolean {
  return req.user?.globalRoles?.includes('superadmin') === true
}

/**
 * Decide whether the authenticated caller is allowed to act on a record that
 * belongs to the tenant identified by `projectSlug` (the `Payment.projectId`).
 *
 * Decision order (first match wins):
 *   1. Superadmin → always allowed.
 *   2. API-key auth bound to a concrete slug → allowed iff it equals the
 *      target slug.
 *   3. JWT app-admin → allowed iff the target slug is among the Applications
 *      the JWT subject owns (resolved fresh from ezauth, owner-scoped).
 *
 * Anything else (no tenant id, slug mismatch, empty owned set / ezauth
 * unavailable) is denied — fail-closed.
 *
 * @param req - The authenticated Express request (`req.user`, `req.apiKeyAppSlug`).
 * @param projectSlug - The `Payment.projectId` of the target record.
 */
export async function resolveTenantAccess(
  req: Request,
  projectSlug: string | null | undefined
): Promise<TenantAccessDecision> {
  // 1. Superadmin bypasses every tenant boundary.
  if (isSuperadmin(req)) {
    return { allowed: true, reason: 'superadmin' }
  }

  // Without a tenant id on the record there is nothing to scope to — deny.
  if (!projectSlug) {
    return { allowed: false, reason: 'denied' }
  }

  // 2. API-key path — `req.apiKeyAppSlug` is the validated, key-bound slug.
  //    Never trust a body-supplied id. A wildcard (`'*'`) slug carries no
  //    tenant binding and must NOT grant cross-tenant access.
  const apiKeyAppSlug = req.apiKeyAppSlug
  if (apiKeyAppSlug && apiKeyAppSlug !== '*') {
    return apiKeyAppSlug === projectSlug
      ? { allowed: true, reason: 'apiKeyApp' }
      : { allowed: false, reason: 'denied' }
  }

  // 3. JWT path — resolve the Applications the subject owns (owner-scoped,
  //    forwards the caller's Bearer token). Fail-closed on an empty set.
  const bearerToken = extractBearerToken(req)
  const ownedApps = await listApplicationsByOwner({ bearerToken })
  const ownsSlug = ownedApps.some(app => app.slug === projectSlug)
  return ownsSlug ? { allowed: true, reason: 'ownedApp' } : { allowed: false, reason: 'denied' }
}
