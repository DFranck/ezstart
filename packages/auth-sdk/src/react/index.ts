/**
 * React layer — hooks, provider, guards.
 *
 * Peer dependency: `react`.
 * Imports from `core/` only.
 */

// Provider
export { AuthProvider, useAuthContext } from './auth-provider.js'
export type { AuthProviderProps, AuthLogger } from './auth-provider.js'

// Hooks
export { useAuth } from './hooks.js'

// Store
export { useAuthStore, useAuthStoreSSR, configureAuthStorage } from './store.js'
export type { AuthState } from './store.js'

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

// Admin analytics hook (superadmin platform overview)
export { useAdminAnalyticsOverview } from './admin-analytics.js'
