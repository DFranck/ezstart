/**
 * Core auth types — zero dependencies, zero framework coupling.
 *
 * These types define the auth client interface and are usable in any
 * JavaScript environment (React, Vue, Svelte, Node, React Native).
 *
 * This file is a barrel. The type definitions live in `./types/<domain>.ts`
 * (split for the <400-line file-size standard). Every type that was exported
 * from `./types.js` historically remains importable from this exact path.
 */

// Config + key scope + auth mode + environment
export type {
  AuthScope,
  AuthStorage,
  AuthClientConfig,
  PublishableKeyConfig,
  AuthSDKConfig,
  AuthMode,
  AuthEnvironment,
} from './types/config.js'

// User, tokens, request bodies
export type {
  AuthUser,
  AuthToken,
  RefreshResult,
  LoginRequest,
  RegisterRequest,
  TokenRequest,
  QuickSignUpRequest,
  QuickSignUpResult,
  EmailOverrideRequest,
} from './types/user.js'

// Server-side types (JWT, auth code)
export type { AuthCode, AuthCodeResponse, JWTPayload } from './types/server.js'

// Backward-compat re-exports for shapes that moved to `@ezstart/api-contracts`
/**
 * @deprecated Import from `@ezstart/api-contracts` instead.
 */
export type {
  ApiKeyItem,
  ApiKeyUsageResponse,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  Application,
  ApplicationResolveResponse,
  ApplicationStatus,
  ApplicationTheme,
  CreateApplicationRequest,
  UpdateApplicationRequest,
  UpdateApplicationThemeRequest,
} from './types/contracts.js'

// Audit log (user activity)
export type {
  AuditLogAction,
  AuditLogMetadata,
  AuditLogEntry,
  AuditLogFilters,
  AuditLogListResponse,
} from './types/audit-log.js'

// Admin analytics, plan info, feature flags, maintenance mode
export type {
  AdminAnalyticsSignupTrendPoint,
  AdminAnalyticsTopApp,
  AdminAnalyticsOverview,
  PlanInfo,
  FeatureFlagScope,
  FeatureFlag,
  UpdateFeatureFlagRequest,
  MaintenanceMode,
  UpdateMaintenanceModeRequest,
} from './types/admin.js'

// OAuth providers (linked accounts)
export type { OAuthProviderId, ConnectedOAuthProvider } from './types/oauth.js'
