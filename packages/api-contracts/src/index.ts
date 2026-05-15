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

export type {
  ApiMeta,
  CursorPaginatedResponse,
  CursorPaginationMeta,
  CursorPaginationQuery,
  PaginatedResponse,
  PaginationMeta,
  PaginationQuery,
} from './pagination.js'

export type { AmountCents, CurrencyCode, Money } from './money.js'

export type { IdempotencyKey } from './idempotency.js'

export type { ApiVersion } from './versioning.js'

export type {
  Application,
  ApplicationResolveResponse,
  ApplicationStatus,
  ApplicationTheme,
  CreateApplicationRequest,
  UpdateApplicationRequest,
  UpdateApplicationThemeRequest,
} from './application.js'

export type {
  ApiKeyEnv,
  ApiKeyItem,
  ApiKeyScope,
  ApiKeyType,
  ApiKeyUsageResponse,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
} from './api-key.js'

export type {
  CreatePlanRequest,
  Plan,
  PlanAmountCents,
  PlanInterval,
  PlanMetadata,
  PlanResponse,
  PlansListResponse,
  UpdatePlanRequest,
} from './plan.js'

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
  SensitiveAuthUserKey,
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
// Runtime — error class
// ---------------------------------------------------------------------------

export { ApiError } from './api-error.js'

// ---------------------------------------------------------------------------
// Runtime — Zod schemas
// ---------------------------------------------------------------------------

export {
  CursorPaginationMetaSchema,
  CursorPaginationQuerySchema,
  PaginationQuerySchema,
} from './pagination.js'

export { AmountCentsSchema, CurrencyCodeSchema, MoneySchema, formatMoney } from './money.js'

export {
  IDEMPOTENCY_CACHE_TTL_SECONDS,
  IDEMPOTENCY_KEY_HEADER,
  IdempotencyKeySchema,
} from './idempotency.js'

export {
  API_VERSION_FORMAT,
  API_VERSION_HEADER,
  ApiVersionSchema,
  CURRENT_API_VERSION,
  SUPPORTED_API_VERSIONS,
} from './versioning.js'

export {
  ApplicationResolveResponseSchema,
  ApplicationSchema,
  ApplicationStatusSchema,
  ApplicationThemeSchema,
  CreateApplicationRequestSchema,
  UpdateApplicationRequestSchema,
  UpdateApplicationThemeRequestSchema,
} from './application.js'

export {
  ApiKeyEnvSchema,
  ApiKeyItemSchema,
  ApiKeyScopeSchema,
  ApiKeyTypeSchema,
  ApiKeyUsageResponseSchema,
  CreateApiKeyRequestSchema,
  CreateApiKeyResponseSchema,
} from './api-key.js'

export {
  CreatePlanRequestSchema,
  PlanAmountCentsSchema,
  PlanIntervalSchema,
  PlanMetadataSchema,
  PlanResponseSchema,
  PlanSchema,
  PlansListResponseSchema,
  UpdatePlanRequestSchema,
} from './plan.js'

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
  SENSITIVE_AUTH_USER_KEYS,
  SendVerificationRequestSchema,
  SHORT_CODE_REGEX_SOURCE,
  SupportedLocaleSchema,
  TokenRequestSchema,
  TokenResponseSchema,
  VerifyEmailRequestSchema,
  VerifyRequestSchema,
  VerifyResponseSchema,
  redactAuthUser,
} from './auth.js'
