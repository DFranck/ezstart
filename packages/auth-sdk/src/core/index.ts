/**
 * Core layer — framework-agnostic, zero React, zero @ezstart/* dependencies.
 *
 * Usable in any JavaScript environment: React, Vue, Svelte, Node, React Native.
 */

// Auth client
export {
  CoreAuthClient,
  createCoreAuthClient,
  fetchKeyConfig,
  resolveSDKConfig,
} from './auth-client.js'

// Token storage
export { TokenManager, createMemoryStorage, createLocalStorage } from './token-manager.js'

// Errors
export { AuthError } from './errors.js'

// Cross-origin detection (used by AuthProvider to auto-fallback authMode)
export {
  isSameRegistrableDomain,
  resolveEffectiveAuthMode,
  __resetCrossOriginWarnCache,
} from './cross-origin.js'
export type { CrossOriginLogger } from './cross-origin.js'

// Types
export type {
  AuthClientConfig,
  AuthSDKConfig,
  AuthScope,
  AuthStorage,
  AuthMode,
  PublishableKeyConfig,
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
  ConnectedOAuthProvider,
  OAuthProviderId,
  Application,
  CreateApplicationRequest,
  UpdateApplicationRequest,
  ApplicationResolveResponse,
  AuditLogAction,
  AuditLogEntry,
  AuditLogFilters,
  AuditLogListResponse,
  AuditLogMetadata,
  AdminAnalyticsOverview,
  AdminAnalyticsSignupTrendPoint,
  AdminAnalyticsTopApp,
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

// API key crypto primitives (agnostic, shared across services)
export {
  generateRawApiKey,
  hashApiKey,
  extractKeyPrefix,
  detectKeyFormat,
  KEY_PREFIX,
  LEGACY_PREFIXES,
} from './api-keys-crypto.js'
export type { ApiKeyType, ApiKeyEnv, ApiKeyScope, KeyFormat } from './api-keys-crypto.js'
