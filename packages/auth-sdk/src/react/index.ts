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
