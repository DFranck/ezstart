/**
 * API versioning contracts.
 *
 * Stripe-style date-based versioning. Clients pin themselves to a specific
 * `YYYY-MM-DD` snapshot of the wire contract by sending the
 * `EZStart-API-Version` header on every request. Servers route the request
 * through the appropriate handler chain and respond with the same header
 * echoed back. When a breaking wire change ships we bump
 * {@link CURRENT_API_VERSION} and keep the previous date in
 * {@link SUPPORTED_API_VERSIONS} for the duration of the deprecation window
 * (90 days minimum per `standard-saas-data.md` §2).
 *
 * The header name and version-format constants live here (not in api-core)
 * so client SDKs, server framework, and any third-party integration all
 * import from the same single source of truth.
 *
 * @see standard-saas-data.md §2 (API versioning — P1)
 * @see standard-ui.md §10.8 (deprecation flow)
 */

import { z } from 'zod'

/**
 * HTTP header name carrying the requested API version.
 *
 * Stripe-style. The vendor prefix `EZStart-` keeps the header from colliding
 * with other vendors' versioning headers (Stripe-Version, Shopify-Api-Version,
 * etc.) that may travel through the same proxy.
 *
 * @example
 * ```ts
 * fetch('/api/users/me', {
 *   headers: { [API_VERSION_HEADER]: CURRENT_API_VERSION },
 * })
 * ```
 */
export const API_VERSION_HEADER = 'EZStart-API-Version' as const

/**
 * Regex describing the accepted version format: `YYYY-MM-DD`.
 *
 * Note this is a *format* check, not a calendar check — `2026-02-31` matches
 * the regex but is not a real date. We deliberately do not call `Date.parse`
 * here: only versions listed in {@link SUPPORTED_API_VERSIONS} are accepted
 * downstream anyway, so a fictional date never gets routed.
 */
export const API_VERSION_FORMAT = /^\d{4}-\d{2}-\d{2}$/

/**
 * Zod schema for an API version string.
 *
 * Validates the date-shaped format only; whether the value is currently
 * supported is enforced by the consuming router against
 * {@link SUPPORTED_API_VERSIONS}.
 *
 * @example
 * ```ts
 * ApiVersionSchema.parse('2026-05-15') // '2026-05-15'
 * ApiVersionSchema.parse('v1')         // throws — wrong shape
 * ApiVersionSchema.parse('2026/05/15') // throws — wrong shape
 * ```
 */
export const ApiVersionSchema = z
  .string()
  .regex(API_VERSION_FORMAT, { message: 'API version must be YYYY-MM-DD' })
  .describe('Date-based API version (Stripe-style)')

/**
 * Inferred TypeScript type for a parsed API version — string in `YYYY-MM-DD`
 * format.
 */
export type ApiVersion = z.infer<typeof ApiVersionSchema>

/**
 * Current API version. Bump this whenever a breaking wire change ships, and
 * append the previous value to {@link SUPPORTED_API_VERSIONS} for the
 * deprecation window.
 *
 * @example
 * ```ts
 * if (req.headers[API_VERSION_HEADER.toLowerCase()] === CURRENT_API_VERSION) { ... }
 * ```
 */
export const CURRENT_API_VERSION: ApiVersion = '2026-05-15' as ApiVersion

/**
 * All API versions the server currently accepts.
 *
 * The current version is always first. Older versions remain accepted for
 * the 90-day deprecation window after a bump, then are dropped. Clients
 * pinned to a dropped version receive {@link ErrorCode.API_VERSION_UNSUPPORTED}.
 *
 * @example
 * ```ts
 * if (!SUPPORTED_API_VERSIONS.includes(requestedVersion)) {
 *   throw new ApiError({ code: 'API_VERSION_UNSUPPORTED', ... })
 * }
 * ```
 */
export const SUPPORTED_API_VERSIONS: readonly ApiVersion[] = Object.freeze([
  '2026-05-15',
] as ApiVersion[])
