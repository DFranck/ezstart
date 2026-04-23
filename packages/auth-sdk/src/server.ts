// Feature gate (server-only — app+user context aware)
export { hasFeature } from './server/features.js'
export type { HasFeatureInput, HasFeatureApp, HasFeatureUser } from './server/features.js'

// Core client (agnostic)
export { CoreAuthClient, createCoreAuthClient } from './core/auth-client.js'

// Backward-compat aliases
export {
  CoreAuthClient as AuthClient,
  createCoreAuthClient as createAuthClient,
} from './core/auth-client.js'
export type { AuthClientConfig } from './core/types.js'

// Types pour les APIs
export type {
  AuthUser,
  AuthToken,
  LoginRequest,
  RegisterRequest,
  TokenRequest,
  AuthCode,
  AuthCodeResponse,
  JWTPayload,
} from './core/types.js'

// Zod schemas pour validation et OpenAPI
export {
  authUserSchema,
  authCodeResponseSchema,
  tokenResponseSchema,
  userResponseSchema,
  verifyResponseSchema,
  errorResponseSchema,
} from './core/schemas.js'

// RBAC server utilities (Express middleware)
export {
  requireAuth as rbacRequireAuth,
  requireRole,
  requireAnyRole,
  requirePermission,
  requireFeature,
  canManageUser as rbacCanManageUser,
} from './rbac/server.js'

// RBAC types and helpers re-exported for server use
export * from './rbac/types.js'
export * from './rbac/helpers.js'

// Request schemas from @ezstart/api-contracts
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
