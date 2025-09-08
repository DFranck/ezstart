// Client
export { AuthClient } from './client.js'
export type { AuthClientConfig } from './client.js'

// Store
export { useAuthStore } from './store.js'
export type { AuthState } from './store.js'

// Provider and hooks
export { AuthProvider, useAuth, useAuthContext } from './provider.js'

// Re-export types
export type { AuthUser, AuthToken, LoginRequest, RegisterRequest } from './types.js'