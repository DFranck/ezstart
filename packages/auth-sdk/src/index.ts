// Client
export { AuthClient, createAuthClient } from './client'
export type { AuthClientConfig } from './client'

// Store
export { useAuthStore, useAuthStoreSSR } from './store'
export type { AuthState } from './store'

// Provider and hooks
export { AuthProvider, useAuth, useAuthContext } from './provider'

// Components
export { AuthCallbackPage } from './auth-callback-page'
export { LoginButton } from './login-button'
export type { LoginButtonProps } from './login-button'

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
} from './types'