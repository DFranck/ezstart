/**
 * Main barrel — re-exports core + react + monorepo wrapper + components.
 *
 * `import { AuthProvider, useAuth, AuthClient } from '@ezstart/auth-sdk'`
 * continues to work unchanged.
 */

// ── Core (agnostic) ──────────────────────────────────────────────────────────

export { CoreAuthClient, createCoreAuthClient } from './core/auth-client.js'
export { AuthError } from './core/errors.js'
export { TokenManager, createMemoryStorage, createLocalStorage } from './core/token-manager.js'

// Core schemas (response validation)
export {
  authUserSchema,
  authCodeResponseSchema,
  tokenResponseSchema,
  userResponseSchema,
  verifyResponseSchema,
  errorResponseSchema,
} from './core/schemas.js'

// ── React (hooks, provider, guards) ──────────────────────────────────────────

export { useAuthStore, useAuthStoreSSR, configureAuthStorage } from './react/store.js'
export type { AuthState } from './react/store.js'

// React guards (also available via react/ barrel)
export { RequireAuth, AccessDenied, SignedIn, SignedOut } from './react/guards.js'
export type {
  RequireAuthProps,
  AccessDeniedProps,
  SignedInProps,
  SignedOutProps,
} from './react/guards.js'

// ── Monorepo wrapper (backward-compatible) ───────────────────────────────────

// AuthClient with monorepo auto-config
export {
  AuthClient,
  createAuthClient,
  detectAuthMode,
  getEzauthUrl,
  // Backward-compat: AuthProvider = EzstartAuthProvider
  EzstartAuthProvider as AuthProvider,
  useEzstartAuth as useAuth,
  useEzstartAuthContext as useAuthContext,
} from './ezstart-auth.js'
export type { AuthClientConfig } from './ezstart-auth.js'

// SSO helpers
export { getEzauthUrl as getEzauthSsoUrl } from './lib/sso.js'

// Hooks
export { useAuthNavigation } from './hooks/useAuthNavigation.js'

// ── Middleware (Next.js) ─────────────────────────────────────────────────────

export { createAuthMiddleware, RECOMMENDED_MIDDLEWARE_MATCHER } from './middleware.js'
export type { AuthMiddlewareConfig } from './middleware.js'

// SSR Protected Middleware
export { createProtectedMiddleware } from './middleware/index.js'
export type { ProtectedMiddlewareConfig } from './middleware/index.js'

// ── Components (pre-built UI) ────────────────────────────────────────────────

export { AuthCallbackPage } from './auth-callback-page.js'
export { LoginButton } from './login-button.js'
export type { LoginButtonProps } from './login-button.js'

// Auth form components
export { SignInForm } from './components/SignInForm.js'
export type { SignInFormProps, SignInFormTexts } from './components/SignInForm.js'
export { SignUpForm } from './components/SignUpForm.js'
export type { SignUpFormProps, SignUpFormTexts } from './components/SignUpForm.js'
export { QuickSignUpForm } from './components/QuickSignUpForm.js'
export type { QuickSignUpFormProps, QuickSignUpFormTexts } from './components/QuickSignUpForm.js'
export { ForgotPasswordForm } from './components/ForgotPasswordForm.js'
export type {
  ForgotPasswordFormProps,
  ForgotPasswordFormTexts,
} from './components/ForgotPasswordForm.js'
export { ResetPasswordForm } from './components/ResetPasswordForm.js'
export type {
  ResetPasswordFormProps,
  ResetPasswordFormTexts,
} from './components/ResetPasswordForm.js'
export { OAuthButtons } from './components/OAuthButtons.js'
export type {
  OAuthButtonsProps,
  OAuthButtonsTexts,
  OAuthProvider,
} from './components/OAuthButtons.js'
export { PasswordStrength } from './components/PasswordStrength.js'
export type { PasswordStrengthProps, PasswordStrengthTexts } from './components/PasswordStrength.js'
export { TwoFactorPrompt } from './components/TwoFactorPrompt.js'
export type { TwoFactorPromptProps, TwoFactorPromptTexts } from './components/TwoFactorPrompt.js'
export { VerifyEmailFlow } from './components/VerifyEmailFlow.js'
export type { VerifyEmailFlowProps, VerifyEmailFlowTexts } from './components/VerifyEmailFlow.js'
export { TwoFactorSettings } from './components/TwoFactorSettings.js'
export type {
  TwoFactorSettingsProps,
  TwoFactorSettingsTexts,
} from './components/TwoFactorSettings.js'

// Admin dashboard
export { AuthAdminDashboard } from './components/AuthAdminDashboard.js'
export type {
  AuthAdminDashboardProps,
  AuthAdminDashboardTexts,
} from './components/AuthAdminDashboard.js'

// User components
export { UserMenu } from './components/UserMenu.js'
export type { UserMenuProps, UserMenuItem, UserMenuTexts } from './components/UserMenu.js'
export { AccountModal } from './components/AccountModal.js'
export type { AccountModalProps, AccountModalTexts } from './components/AccountModal.js'
export { UserAvatar } from './components/UserAvatar.js'
export type { UserAvatarProps } from './components/UserAvatar.js'
export { UserSettings } from './components/UserSettings.js'
export type { UserSettingsProps, UserSettingsTexts } from './components/UserSettings.js'

// ── Types ────────────────────────────────────────────────────────────────────

export type {
  AuthUser,
  AuthToken,
  AuthMode,
  LoginRequest,
  RegisterRequest,
  TokenRequest,
  AuthCode,
  AuthCodeResponse,
  JWTPayload,
  EmailOverrideRequest,
} from './core/types.js'

// ── i18n ─────────────────────────────────────────────────────────────────────

export { getAuthTexts, en, fr, vi } from './i18n/index.js'
export type { AuthLocale, AuthDict, FormKey } from './i18n/index.js'

// ── Request schemas (from @ezstart/api-contracts) ────────────────────────────

export {
  loginRequestSchema,
  registerRequestSchema,
  tokenRequestSchema,
  verifyRequestSchema,
  forgotPasswordRequestSchema,
  sendVerificationRequestSchema,
  quickSignupRequestSchema,
  supportedLocaleSchema,
  emailOverrideSchema,
} from './schemas.js'
