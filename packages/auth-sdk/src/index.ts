// Client
export { AuthClient, createAuthClient, detectAuthMode } from './client.js'
export type { AuthClientConfig } from './client.js'

// Store
export { useAuthStore, useAuthStoreSSR, configureAuthStorage } from './store.js'
export type { AuthState, AuthMode } from './store.js'

// Provider and hooks
export { AuthProvider, useAuth, useAuthContext } from './provider.js'

// Middleware (Next.js)
export { createAuthMiddleware, RECOMMENDED_MIDDLEWARE_MATCHER } from './middleware.js'
export type { AuthMiddlewareConfig } from './middleware.js'

// Components
export { AuthCallbackPage } from './auth-callback-page.js'
export { LoginButton } from './login-button.js'
export type { LoginButtonProps } from './login-button.js'
export { RequireAuth } from './require-auth.js'
export type { RequireAuthProps } from './require-auth.js'
export { AccessDenied } from './access-denied.js'
export type { AccessDeniedProps } from './access-denied.js'

// Admin dashboard
export { AuthAdminDashboard } from './components/AuthAdminDashboard.js'
export type {
  AuthAdminDashboardProps,
  AuthAdminDashboardTexts,
} from './components/AuthAdminDashboard.js'

// User components (Clerk-like pre-built UI)
export { UserMenu } from './components/UserMenu.js'
export type { UserMenuProps, UserMenuItem, UserMenuTexts } from './components/UserMenu.js'
export { AccountModal } from './components/AccountModal.js'
export type { AccountModalProps, AccountModalTexts } from './components/AccountModal.js'
export { UserAvatar } from './components/UserAvatar.js'
export type { UserAvatarProps } from './components/UserAvatar.js'
export { UserSettings } from './components/UserSettings.js'
export type { UserSettingsProps, UserSettingsTexts } from './components/UserSettings.js'
export { SignedIn } from './components/SignedIn.js'
export type { SignedInProps } from './components/SignedIn.js'
export { SignedOut } from './components/SignedOut.js'
export type { SignedOutProps } from './components/SignedOut.js'

// Re-export types
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

// Zod schemas for validation and OpenAPI
export {
  loginRequestSchema,
  registerRequestSchema,
  tokenRequestSchema,
  verifyRequestSchema,
  authUserSchema,
  authCodeResponseSchema,
  tokenResponseSchema,
  userResponseSchema,
  verifyResponseSchema,
  errorResponseSchema,
} from './schemas.js'
