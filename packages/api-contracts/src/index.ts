/**
 * @ezstart/api-contracts
 *
 * Wire contracts shared between `@ezstart/api-sdk` (client) and the future
 * `@ezstart/api-core` (server framework). Adopting this package in any
 * project guarantees the two ends speak the exact same language:
 *
 * - Response envelope — `{ success, data, meta }` / `{ success, error }`
 * - Pagination — `PaginationQuerySchema` + `PaginatedResponse<T>`
 * - Error codes — stable string enum (`ErrorCode.RATE_LIMIT_EXCEEDED`, ...)
 * - Auth flows — login / register / refresh / reset / verify Zod schemas
 *
 * Everything is tree-shakeable (`sideEffects: false`). Pure TypeScript +
 * Zod schemas, no monorepo coupling.
 *
 * @example
 * ```ts
 * // client — discriminate the envelope
 * import { isSuccessResponse, type ApiResponse } from '@ezstart/api-contracts'
 *
 * const body: ApiResponse<User> = await fetchJson('/api/users/me')
 * if (isSuccessResponse(body)) body.data.email // → string, fully typed
 * ```
 *
 * @example
 * ```ts
 * // server — validate pagination query
 * import { PaginationQuerySchema } from '@ezstart/api-contracts'
 * const { limit, offset } = PaginationQuerySchema.parse(req.query)
 * ```
 */

// ---------------------------------------------------------------------------
// Types (zero runtime)
// ---------------------------------------------------------------------------

export type { ApiResponse, ErrorPayload, ErrorResponse, SuccessResponse } from './envelope.js'

export type { ApiMeta, PaginatedResponse, PaginationMeta, PaginationQuery } from './pagination.js'

export type {
  AuthUser,
  EmailOverride,
  ForgotPasswordRequest,
  LoginAuthCodeResponse,
  LoginRequest,
  LoginResponse,
  LoginTwoFactorPendingResponse,
  QuickSignupRequest,
  RefreshRequest,
  RefreshResponse,
  RegisterRequest,
  RegisterResponse,
  ResetPasswordRequest,
  SendVerificationRequest,
  SupportedLocale,
  TokenRequest,
  TokenResponse,
  VerifyEmailRequest,
  VerifyRequest,
  VerifyResponse,
} from './auth.js'

// ---------------------------------------------------------------------------
// Runtime — type guards
// ---------------------------------------------------------------------------

export { isErrorResponse, isSuccessResponse } from './envelope.js'

// ---------------------------------------------------------------------------
// Runtime — enums
// ---------------------------------------------------------------------------

export { ErrorCode } from './errors.js'

// ---------------------------------------------------------------------------
// Runtime — Zod schemas
// ---------------------------------------------------------------------------

export { PaginationQuerySchema } from './pagination.js'

export {
  AuthUserSchema,
  EmailOverrideSchema,
  ForgotPasswordRequestSchema,
  LoginAuthCodeResponseSchema,
  LoginRequestSchema,
  LoginResponseSchema,
  LoginTwoFactorPendingResponseSchema,
  QuickSignupRequestSchema,
  RefreshRequestSchema,
  RefreshResponseSchema,
  RegisterRequestSchema,
  RegisterResponseSchema,
  ResetPasswordRequestSchema,
  SendVerificationRequestSchema,
  SupportedLocaleSchema,
  TokenRequestSchema,
  TokenResponseSchema,
  VerifyEmailRequestSchema,
  VerifyRequestSchema,
  VerifyResponseSchema,
} from './auth.js'
