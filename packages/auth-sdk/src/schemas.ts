/**
 * Schema re-exports for backward compatibility.
 *
 * Response schemas are in `core/schemas.ts` (agnostic).
 * Request schemas come from `@ezstart/api-contracts` (monorepo source of truth).
 */

// Re-export core response schemas
export {
  authUserSchema,
  authCodeResponseSchema,
  tokenResponseSchema,
  userResponseSchema,
  verifyResponseSchema,
  errorResponseSchema,
} from './core/schemas.js'

// Re-export request schemas from @ezstart/api-contracts (monorepo source of truth)
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

export const supportedLocaleSchema = SupportedLocaleSchema
export const emailOverrideSchema = EmailOverrideSchema
export const loginRequestSchema = LoginRequestSchema
export const registerRequestSchema = RegisterRequestSchema
export const forgotPasswordRequestSchema = ForgotPasswordRequestSchema
export const sendVerificationRequestSchema = SendVerificationRequestSchema
export const quickSignupRequestSchema = QuickSignupRequestSchema
export const tokenRequestSchema = TokenRequestSchema
export const verifyRequestSchema = VerifyRequestSchema
