/**
 * Core layer — framework-agnostic, zero React, zero @ezstart/* dependencies.
 *
 * Usable in any JavaScript environment: React, Vue, Svelte, Node, React Native.
 */

// Auth client
export { CoreAuthClient, createCoreAuthClient } from './auth-client.js'

// Token storage
export { TokenManager, createMemoryStorage, createLocalStorage } from './token-manager.js'

// Errors
export { AuthError } from './errors.js'

// Types
export type {
  AuthClientConfig,
  AuthStorage,
  AuthMode,
  AuthUser,
  AuthToken,
  RefreshResult,
  LoginRequest,
  RegisterRequest,
  TokenRequest,
  QuickSignUpRequest,
  QuickSignUpResult,
  EmailOverrideRequest,
  AuthCode,
  AuthCodeResponse,
  JWTPayload,
  ApiKeyItem,
  ApiKeyUsageResponse,
  CreateApiKeyResponse,
  CreateApiKeyRequest,
  PlanInfo,
} from './types.js'

// Schemas (response validation / OpenAPI)
export {
  authUserSchema,
  authCodeResponseSchema,
  tokenResponseSchema,
  userResponseSchema,
  verifyResponseSchema,
  errorResponseSchema,
} from './schemas.js'
