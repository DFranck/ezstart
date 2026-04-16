// Client (sans dependances React/Next)
export { AuthClient, createAuthClient } from './client.js'
export type { AuthClientConfig } from './client.js'

// Core client (agnostic)
export { CoreAuthClient, createCoreAuthClient } from './core/auth-client.js'

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

// Request schemas from @ezstart/api-contracts
export {
  loginRequestSchema,
  registerRequestSchema,
  tokenRequestSchema,
  verifyRequestSchema,
  forgotPasswordRequestSchema,
  sendVerificationRequestSchema,
  quickSignupRequestSchema,
  supportedLocaleSchema,
  emailOverrideSchema,
} from './schemas.js'
