// Client (sans dépendances React/Next)
export { AuthClient, createAuthClient } from './client.js'
export type { AuthClientConfig } from './client.js'

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
} from './types.js'

// Zod schemas pour validation et OpenAPI
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
  authUserSchema,
  authCodeResponseSchema,
  tokenResponseSchema,
  userResponseSchema,
  verifyResponseSchema,
  errorResponseSchema,
} from './schemas.js'
