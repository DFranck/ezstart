/**
 * `@ezstart/auth-sdk/server` — server-only exports.
 *
 * This barrel collocates everything that is meant to run on the server side
 * (inside Express route handlers, Next.js Server Components / Route Handlers,
 * background jobs, etc.). It has zero React, zero browser, and zero hard
 * dependencies on `@ezstart/*` runtime packages — only types and pure
 * helpers.
 *
 * Imported via:
 *
 * ```ts
 * import { hasFeature, getServerAuth } from '@ezstart/auth-sdk/server'
 * ```
 *
 * The server-only guard at the top throws at build/runtime if a client
 * component (browser bundle) accidentally imports from this entry point,
 * preventing cookie / token leaks. The guard uses a runtime `window` check
 * instead of the `server-only` npm package, which crashes raw-Node API
 * services at boot.
 */

import './_internal/server-only.js'

// ---------------------------------------------------------------------------
// SSR auth bootstrap (Clerk-style)
// ---------------------------------------------------------------------------

export { getServerAuth } from './get-server-auth.js'
export type { GetServerAuthOptions, GetServerAuthLogger } from './get-server-auth.js'

export { getServerApiKeys } from './get-server-api-keys.js'
export type { GetServerApiKeysOptions, GetServerApiKeysLogger } from './get-server-api-keys.js'

export { getServerAuditLog } from './get-server-audit-log.js'
export type {
  GetServerAuditLogOptions,
  GetServerAuditLogFilters,
  GetServerAuditLogLogger,
} from './get-server-audit-log.js'

export { getServerApplications } from './get-server-applications.js'
export type {
  GetServerApplicationsOptions,
  GetServerApplicationsFilters,
  GetServerApplicationsLogger,
} from './get-server-applications.js'

export { getServerApplication } from './get-server-application.js'
export type {
  GetServerApplicationOptions,
  GetServerApplicationLogger,
} from './get-server-application.js'

export { getServerKeyConfig } from './get-server-key-config.js'
export type {
  GetServerKeyConfigOptions,
  GetServerKeyConfigLogger,
} from './get-server-key-config.js'

// ---------------------------------------------------------------------------
// Feature gate (server-only — app+user context aware)
// ---------------------------------------------------------------------------

export { hasFeature } from './features.js'
export type { HasFeatureInput, HasFeatureApp, HasFeatureUser } from './features.js'

// ---------------------------------------------------------------------------
// Core client (agnostic — re-exported for server-to-server callers)
// ---------------------------------------------------------------------------

export { CoreAuthClient, createCoreAuthClient } from '../core/auth-client.js'

// Backward-compat aliases
export {
  CoreAuthClient as AuthClient,
  createCoreAuthClient as createAuthClient,
} from '../core/auth-client.js'
export type { AuthClientConfig } from '../core/types.js'

// Hardcoded prod default — same value used by the client `<AuthProvider>`
// when no `apiUrl` prop / env var is provided. Re-exported so server
// callers can opt into the same fallback explicitly when composing URLs.
export { DEFAULT_AUTH_API_URL } from '../core/defaults.js'

// ---------------------------------------------------------------------------
// Types — shared between API + server-side helpers
// ---------------------------------------------------------------------------

export type {
  AuthUser,
  AuthToken,
  LoginRequest,
  RegisterRequest,
  TokenRequest,
  AuthCode,
  AuthCodeResponse,
  JWTPayload,
} from '../core/types.js'

// ---------------------------------------------------------------------------
// Zod schemas — used by API route registrations + OpenAPI generation
// ---------------------------------------------------------------------------

export {
  authUserSchema,
  authCodeResponseSchema,
  tokenResponseSchema,
  userResponseSchema,
  verifyResponseSchema,
  errorResponseSchema,
} from '../core/schemas.js'

// ---------------------------------------------------------------------------
// RBAC server utilities (Express middleware)
// ---------------------------------------------------------------------------

export {
  requireAuth as rbacRequireAuth,
  requireRole,
  requireAnyRole,
  requirePermission,
  requireFeature,
  canManageUser as rbacCanManageUser,
} from '../rbac/server.js'

// ---------------------------------------------------------------------------
// Composable email-verification gate (Clerk / Vercel pattern)
// ---------------------------------------------------------------------------

export { requireEmailVerified, EMAIL_VERIFICATION_REQUIRED_CODE } from './require-email-verified.js'

// ---------------------------------------------------------------------------
// Unified JWT + API-key auth middleware factory (Express)
// ---------------------------------------------------------------------------

export { createAuthMiddleware } from './auth-middleware.js'
export type {
  AuthMiddleware,
  AuthMiddlewareConfig,
  AuthMiddlewareLogger,
  AuthMiddlewareModel,
  AuthMiddlewareOptions,
  AuthMiddlewareScope,
  AuthUserDoc,
  ApiKeyDoc,
} from './auth-middleware.js'

// ---------------------------------------------------------------------------
// Mongoose schema factories (ApiKey + ApiKeyUsage)
// ---------------------------------------------------------------------------

export { createApiKeySchema } from './api-key-schema.js'
export type { CreateApiKeySchemaOptions } from './api-key-schema.js'

export { createApiKeyUsageSchema } from './api-key-usage-schema.js'

// ---------------------------------------------------------------------------
// API-key-only middleware factory (Express) — when JWT path is not desired
// ---------------------------------------------------------------------------

export { createApiKeyMiddleware } from './api-key-middleware.js'
export type {
  ApiKeyMiddleware,
  ApiKeyMiddlewareConfig,
  ApiKeyMiddlewareLogger,
  ApiKeyModelLike,
  ApiKeyUsageModelLike,
  ApiKeyShape,
} from './api-key-middleware.js'

// RBAC types and helpers re-exported for server use
export * from '../rbac/types.js'
export * from '../rbac/helpers.js'

// ---------------------------------------------------------------------------
// Request schemas (re-exported from `@ezstart/api-contracts`)
// ---------------------------------------------------------------------------

import {
  EmailOverrideSchema,
  ForgotPasswordRequestSchema,
  LoginRequestSchema,
  QuickSignupRequestSchema,
  RegisterRequestSchema,
  SendVerificationRequestSchema,
  SupportedLocaleSchema,
  TokenRequestSchema,
  VerifyRequestSchema,
} from '@ezstart/api-contracts'

export const loginRequestSchema = LoginRequestSchema
export const registerRequestSchema = RegisterRequestSchema
export const tokenRequestSchema = TokenRequestSchema
export const verifyRequestSchema = VerifyRequestSchema
export const forgotPasswordRequestSchema = ForgotPasswordRequestSchema
export const sendVerificationRequestSchema = SendVerificationRequestSchema
export const quickSignupRequestSchema = QuickSignupRequestSchema
export const supportedLocaleSchema = SupportedLocaleSchema
export const emailOverrideSchema = EmailOverrideSchema
