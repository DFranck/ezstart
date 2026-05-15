/**
 * Auth flow contracts — backward-compat barrel.
 *
 * Zod schemas + inferred TypeScript types for the core authentication
 * endpoints of an `@ezstart`-compatible auth server (ezauth or equivalent).
 *
 * This module is the single source of truth for the wire shape of:
 *
 * - Login (email/username + password, optional redirect_uri)
 * - Register
 * - Quick signup (username + email only, passwordless bootstrap)
 * - Forgot / reset password
 * - Verify email
 * - Refresh access token (rotating refresh)
 * - Authorization code → token exchange (OAuth-style)
 * - Token verify (introspection)
 *
 * More specialized flows (2FA enrollment, session listing, SSO authorize/
 * exchange, OAuth redirect_uri dance) are intentionally NOT included in
 * this first cut — they can be added in a follow-up without breaking these
 * contracts.
 *
 * **File layout (since Wave A Lot 2, 2026-05-15)** — this file is now a
 * thin barrel that re-exports from three focused submodules so each stays
 * under the 400-line ceiling mandated by `standard.md` §3:
 *
 * - `./auth/auth-shared.ts` — regex primitives, helpers, `AuthUserSchema`,
 *   `EmailOverrideSchema`, `SupportedLocaleSchema`, `redactAuthUser`
 * - `./auth/auth-requests.ts` — all client→server payload schemas
 * - `./auth/auth-responses.ts` — all server→client payload schemas
 *
 * Existing consumers can keep importing from `@ezstart/api-contracts` (the
 * package barrel) OR from `@ezstart/api-contracts/auth` (this file) — both
 * paths preserve the full pre-split surface.
 *
 * @example
 * ```ts
 * // server
 * import { LoginRequestSchema } from '@ezstart/api-contracts'
 * const parsed = LoginRequestSchema.safeParse(req.body)
 * if (!parsed.success) return sendValidationError(res, parsed.error.issues)
 * ```
 *
 * @example
 * ```ts
 * // client
 * import type { LoginRequest } from '@ezstart/api-contracts'
 * const body: LoginRequest = { email, password, app: 'myapp' }
 * ```
 *
 * @example
 * ```ts
 * // server — redact secrets before /me response
 * import { AuthUserSchema, redactAuthUser } from '@ezstart/api-contracts'
 * const user = await UserModel.findById(id).lean()
 * res.json({ success: true, data: redactAuthUser(user) })
 * ```
 */

export * from './auth/auth-shared.js'
export * from './auth/auth-requests.js'
export * from './auth/auth-responses.js'
