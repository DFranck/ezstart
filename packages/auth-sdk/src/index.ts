// Client
export { AuthClient, createAuthClient } from './client.js'
export type { AuthClientConfig } from './client.js'

// Store
export { useAuthStore, useAuthStoreSSR } from './store.js'
export type { AuthState } from './store.js'

// Provider and hooks
export { AuthProvider, useAuth, useAuthContext } from './provider.js'

// Components
export { AuthCallbackPage } from './auth-callback-page.js'
export { LoginButton } from './login-button.js'
export type { LoginButtonProps } from './login-button.js'

// Re-export types
export type { 
  AuthUser, 
  AuthToken, 
  LoginRequest, 
  RegisterRequest, 
  TokenRequest,
  AuthCode,
  AuthCodeResponse,
  JWTPayload 
} from './types.js'