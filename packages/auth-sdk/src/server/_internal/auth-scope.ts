/**
 * API-key scope normalisation + ranking for the unified auth middleware.
 *
 * Extracted from `auth-middleware.ts` (Wave D Lot 4). The canonical scope
 * union (`AuthMiddlewareScope`) stays public in `auth-middleware.ts`; these
 * helpers are the internal mechanics that map persisted scope values onto it
 * and compare ranks. Behaviour is unchanged — legacy `'live'` / `'test'`
 * scopes still demote to `'user'` so a publishable key can never satisfy
 * `requireKeyScope: 'admin'`.
 *
 * **Server-only.** Imported only by sibling `server/` modules.
 *
 * @internal
 * @module @ezstart/auth-sdk/server/_internal/auth-scope
 */

import './server-only.js'

import type { AuthMiddlewareScope } from './auth-middleware-types.js'

/**
 * Map the persisted scope (modern + legacy values) onto the canonical
 * {@link AuthMiddlewareScope}. Legacy `'live'` / `'test'` are demoted to
 * `'user'` so a publishable key can never satisfy `requireKeyScope: 'admin'`.
 */
export function normaliseScope(stored: string | undefined | null): AuthMiddlewareScope {
  if (stored === 'admin') return 'admin'
  if (stored === 'readonly') return 'readonly'
  // 'user', 'live', 'test', undefined → user-equivalent.
  return 'user'
}

const SCOPE_RANK: Record<AuthMiddlewareScope, number> = {
  readonly: 0,
  user: 1,
  admin: 2,
}

/** `true` when `actual` is at least as privileged as `required`. */
export function meetsScope(actual: AuthMiddlewareScope, required: AuthMiddlewareScope): boolean {
  return SCOPE_RANK[actual] >= SCOPE_RANK[required]
}
