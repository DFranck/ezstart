/**
 * React layer — hooks, provider, guards.
 *
 * Peer dependency: `react`.
 * Imports from `core/` only.
 */

// Provider
export {
  AuthProvider,
  useAuthContext,
  useAuthApiUrl,
  useAuthStore,
  useAuthStoreSelector,
  useAuthStoreApi,
  useAuthStoreSSR,
  useAuthStoreGetSnapshot,
} from './auth-provider.js'
export type { AuthProviderProps, AuthLogger } from './auth-provider.js'

// Hooks
export { useAuth } from './hooks.js'

// Idle timeout (auto-logout on inactivity)
export { useIdleTimeout, DEFAULT_IDLE_EVENTS } from './use-idle-timeout.js'
export type { UseIdleTimeoutOptions, UseIdleTimeoutReturn } from './use-idle-timeout.js'
export {
  showIdleWarning,
  dismissIdleWarning,
  showIdleSignedOutToast,
  defaultIdleWarningTexts,
  formatIdleDescription,
} from './idle-warning-toast.js'
export type { IdleWarningTexts, ShowIdleWarningOptions } from './idle-warning-toast.js'
export { IdleTimeoutManager } from './idle-timeout-manager.js'
export type { IdleTimeoutManagerProps } from './idle-timeout-manager.js'

// Store
export { createAuthStore, configureAuthStorage } from './store.js'
export type { AuthState, AuthStoreApi, CreateAuthStoreOptions } from './store.js'

// Guards
export { RequireAuth, AccessDenied, SignedIn, SignedOut } from './guards.js'
export type {
  RequireAuthProps,
  AccessDeniedProps,
  SignedInProps,
  SignedOutProps,
} from './guards.js'

// API Keys hooks
export {
  useApiKeys,
  useApiKeyUsage,
  useCreateApiKey,
  useRevokeApiKey,
  useRotateApiKey,
} from './api-keys.js'

// OAuth provider management hooks (linked accounts)
export { useOAuthProviders, useDisconnectOAuthProvider } from './oauth-providers.js'

// Applications hooks (P6)
export {
  useMyApplications,
  useApplication,
  useResolveApplicationByKey,
  useCreateApplication,
  useUpdateApplication,
  useUpdateApplicationTheme,
  useRevokeApplication,
} from './applications.js'

// Audit log hook
export { useAuditLog } from './audit-log.js'

// Email change hooks
export { useRequestEmailChange, useVerifyEmailChange } from './use-email-change.js'

// Magic link hooks
export { useRequestMagicLink, useVerifyMagicLink } from './use-magic-link.js'

// Admin analytics hook (superadmin platform overview)
export { useAdminAnalyticsOverview } from './admin-analytics.js'

// Admin error logs hooks (Sentry-free stopgap browser)
export { useAdminErrorLogs, useAdminErrorLogDetail } from './admin-error-logs.js'
export type {
  ErrorLogLevel,
  ErrorLogStatusRange,
  ErrorLogListEntry,
  ErrorLogDetailEntry,
  ErrorLogListResponse,
  ErrorLogListFilters,
} from './admin-error-logs.js'
