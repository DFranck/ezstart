/**
 * Auth subpath barrel — `@ezstart/api-contracts/auth`.
 *
 * Exposes the full pre-Lot-2 auth surface (request schemas, response schemas,
 * shared primitives, `AuthUserSchema`, `redactAuthUser`, ...) under a stable
 * subpath import. Consumers that only need auth wires can do:
 *
 * ```ts
 * import { LoginRequestSchema, redactAuthUser } from '@ezstart/api-contracts/auth'
 * ```
 *
 * Functionally identical to importing from the package barrel
 * `@ezstart/api-contracts` — same schemas, same types — but lets a tree-shaker
 * skip pulling unrelated contracts (envelope, pagination, money, plan, …) when
 * only the auth ones are needed.
 *
 * **Lot 2.1.1 (2026-05-16)** — created in response to hacker finding I.6:
 * `package.json` previously only declared the `'.'` export, so external
 * consumers calling `import from '@ezstart/api-contracts/auth'` would fail
 * with "Package subpath './auth' is not defined by 'exports'". This file +
 * the matching `package.json` exports entry close the gap. Stripe and Clerk
 * follow the same pattern (subpath per logical group).
 *
 * @see ../auth.ts — internal monolith barrel (deprecated as a public path)
 * @see ./auth-shared.ts
 * @see ./auth-requests.ts
 * @see ./auth-responses.ts
 * @see ./redact-auth-user.ts
 */

export * from './auth-shared.js'
export * from './auth-requests.js'
export * from './auth-responses.js'
