/**
 * JWT issuer / audience verify-option normalisation for the unified auth
 * middleware (HAC-CRIT-2 cross-API privilege-escalation defence).
 *
 * Extracted from `auth-middleware.ts` (Wave D Lot 4). The logic is
 * byte-identical to the inline version: it coerces the `issuer` / `audience`
 * config (string | string[] | undefined) into the tuple shape that
 * `jsonwebtoken` insists on (`[string, ...string[]]`). An empty array
 * degrades to `undefined` ("no enforcement") to preserve the back-compat
 * path for services that haven't migrated.
 *
 * Enforcing `iss` / `aud` on `jwt.verify` is the second factor that blocks
 * a cross-API token (or one forged outside the legitimate sign path) from
 * being accepted when `JWT_SECRET` is shared across @ezstart APIs. Do NOT
 * relax this coercion — `jwt.verify` must receive the exact same options it
 * received before the split.
 *
 * **Server-only.** Imported only by sibling `server/` modules.
 *
 * @internal
 * @module @ezstart/auth-sdk/server/_internal/jwt-verify-options
 */

import './server-only.js'

/**
 * Narrow `jwt.verify` claim shape — the strict string-only subset the auth
 * middleware uses (the broader `jwt.VerifyOptions['audience']` also permits
 * `RegExp`, which the SDK never passes). Matches the original inline type.
 */
type VerifyClaim = string | [string, ...string[]] | undefined

/**
 * Normalise an `issuer` / `audience` config value (`string | string[] |
 * undefined`) into the `[string, ...string[]] | string | undefined` shape
 * accepted by `jwt.verify`. Empty arrays become `undefined` (no enforcement).
 */
export function normaliseVerifyClaim(value: string | string[] | undefined): VerifyClaim {
  if (value === undefined) return undefined
  if (Array.isArray(value)) {
    if (value.length === 0) return undefined
    return [value[0], ...value.slice(1)] as [string, ...string[]]
  }
  return value
}
