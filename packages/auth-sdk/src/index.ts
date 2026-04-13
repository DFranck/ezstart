// Client
export { AuthClient, createAuthClient, detectAuthMode } from './client.js'
export type { AuthClientConfig } from './client.js'

// SSO helpers
export { getEzauthUrl } from './lib/sso.js'

// Store
export { useAuthStore, useAuthStoreSSR, configureAuthStorage } from './store.js'
export type { AuthState, AuthMode } from './store.js'

// Provider and hooks
export { AuthProvider, useAuth, useAuthContext } from './provider.js'
export { useAuthNavigation } from './hooks/useAuthNavigation.js'

// Middleware (Next.js)
export { createAuthMiddleware, RECOMMENDED_MIDDLEWARE_MATCHER } from './middleware.js'
export type { AuthMiddlewareConfig } from './middleware.js'

// SSR Protected Middleware (Next.js Edge Runtime)
export { createProtectedMiddleware } from './middleware/index.js'
export type { ProtectedMiddlewareConfig } from './middleware/index.js'

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

// Auth form components (embeddable sign-in/sign-up forms)
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

// Embedded i18n dictionaries (EN/FR/VI) for auth forms
export { getAuthTexts, en, fr, vi } from './i18n/index.js'
export type { AuthLocale, AuthDict, FormKey } from './i18n/index.js'

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
