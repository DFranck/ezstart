/**
 * Main barrel — re-exports core + react + components.
 *
 * `import { AuthProvider, useAuth } from '@ezstart/auth-sdk'`
 * continues to work unchanged.
 */

// ── Core (agnostic) ──────────────────────────────────────────────────────────

export {
  CoreAuthClient,
  createCoreAuthClient,
  fetchKeyConfig,
  resolveSDKConfig,
} from './core/auth-client.js'
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

// THE provider — Clerk-like API
export { AuthProvider, useAuthContext } from './react/auth-provider.js'
export type { AuthProviderProps, AuthLogger } from './react/auth-provider.js'

// THE hook
export { useAuth } from './react/hooks.js'

// Store
export { useAuthStore, useAuthStoreSSR, configureAuthStorage } from './react/store.js'
export type { AuthState } from './react/store.js'

// React guards
export { RequireAuth, AccessDenied, SignedIn, SignedOut } from './react/guards.js'
export type {
  RequireAuthProps,
  AccessDeniedProps,
  SignedInProps,
  SignedOutProps,
} from './react/guards.js'

// API Keys hooks
export {
  useApiKeys,
  useApiKeyUsage,
  useCreateApiKey,
  useRevokeApiKey,
  useRotateApiKey,
} from './react/api-keys.js'

// Applications hooks (P6)
export {
  useMyApplications,
  useApplication,
  useResolveApplicationByKey,
  useCreateApplication,
  useUpdateApplication,
  useRevokeApplication,
} from './react/applications.js'

// ── Backward-compat aliases ─────────────────────────────────────────────────

// AuthClient = CoreAuthClient, createAuthClient = createCoreAuthClient
export {
  CoreAuthClient as AuthClient,
  createCoreAuthClient as createAuthClient,
} from './core/auth-client.js'
export type { AuthClientConfig } from './core/types.js'

// SSO helpers (monorepo-specific, uses @ezstart/config)
export { getEzauthUrl } from './react/sso.js'

// Hooks
export { useAuthNavigation } from './react/useAuthNavigation.js'

// ── Middleware (Next.js) ─────────────────────────────────────────────────────

export {
  createAuthMiddleware,
  RECOMMENDED_MIDDLEWARE_MATCHER,
} from './middleware/createAuthMiddleware.js'
export type { AuthMiddlewareConfig } from './middleware/createAuthMiddleware.js'

// SSR Protected Middleware
export { createProtectedMiddleware } from './middleware/index.js'
export type { ProtectedMiddlewareConfig } from './middleware/index.js'

// ── Components (pre-built UI) ────────────────────────────────────────────────

export { AuthCallbackPage } from './components/AuthCallbackPage.js'
export { LoginButton } from './components/LoginButton.js'
export type { LoginButtonProps } from './components/LoginButton.js'

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

// Developer portal (API keys)
export {
  DeveloperPortal,
  ApiKeysTable as DeveloperApiKeysTable,
  CreateKeyModal,
  KeyCreatedModal,
  UsageDetailsModal,
  UsageBadge,
  defaultDeveloperPortalTexts,
} from './components/developer/index.js'
export type {
  DeveloperPortalProps,
  ApiKeysTableProps as DeveloperApiKeysTableProps,
  CreateKeyModalProps,
  KeyCreatedModalProps,
  UsageDetailsModalProps,
  UsageBadgeProps,
  DeveloperPortalTexts,
  ApiKeysTableTexts,
  CreateKeyModalTexts,
  KeyCreatedModalTexts,
  UsageDetailsModalTexts,
  UsageBadgeTexts,
} from './components/developer/index.js'

// Applications (P6 — multi-tenant entity)
export {
  ApplicationsList,
  ApplicationCard,
  CreateApplicationModal,
  ApplicationDetailView,
  defaultApplicationsFlowTexts,
} from './components/applications/index.js'
export type {
  ApplicationsListProps,
  ApplicationCardProps,
  CreateApplicationModalProps,
  ApplicationDetailViewProps,
  ApplicationsListTexts,
  ApplicationCardTexts,
  CreateApplicationModalTexts,
  ApplicationDetailViewTexts,
  ApplicationsFlowTexts,
} from './components/applications/index.js'

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
  AuthScope,
  AuthSDKConfig,
  PublishableKeyConfig,
  LoginRequest,
  RegisterRequest,
  TokenRequest,
  AuthCode,
  AuthCodeResponse,
  JWTPayload,
  EmailOverrideRequest,
  ApiKeyItem,
  ApiKeyUsageResponse,
  CreateApiKeyResponse,
  CreateApiKeyRequest,
  PlanInfo,
  Application,
  CreateApplicationRequest,
  UpdateApplicationRequest,
  ApplicationResolveResponse,
} from './core/types.js'

// ── RBAC (Role-Based Access Control) ────────────────────────────────────────

// Types & config
export {
  DEFAULT_ROLES,
  DEFAULT_ROLE_HIERARCHY,
  DEFAULT_ROLE_PERMISSIONS,
  DEFAULT_ROLE_FEATURES,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
  ROLE_FEATURES,
  configureRBAC,
  extendRBACConfig,
  getRBACConfig,
  matchesPermission,
} from './rbac/types.js'
export type {
  DefaultRole,
  Role,
  Permission,
  Feature,
  AppRBACConfig,
  RBACConfig,
} from './rbac/types.js'

// Client utilities
export {
  hasRole,
  hasAnyRole,
  hasAllRoles,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasFeature,
  hasAnyFeature,
  canManageUser,
  getHighestRoleLevel,
  isRoleHigherThan,
  useRBAC,
} from './rbac/client.js'

// Helpers (UI utilities)
export {
  getRoleLabel,
  getRoleColor,
  getRoleIcon,
  getRoleDescription,
  sortRolesByHierarchy,
  getHighestRole,
} from './rbac/helpers.js'
export type { RoleColor } from './rbac/helpers.js'

// RBAC React components
export { RoleBadge, RoleBadgeList } from './rbac/components/role-badge.js'
export type { RoleBadgeProps, RoleBadgeListProps } from './rbac/components/role-badge.js'
export { RequireRole } from './rbac/components/require-role.js'
export type { RequireRoleProps } from './rbac/components/require-role.js'
export { InsufficientPermissions } from './rbac/components/insufficient-permissions.js'
export type { InsufficientPermissionsProps } from './rbac/components/insufficient-permissions.js'

// ── i18n ─────────────────────────────────────────────────────────────────────

export { getAuthTexts, en, fr, vi } from './i18n/index.js'
export type { AuthLocale, AuthDict, FormKey } from './i18n/index.js'

// ── Request schemas (from @ezstart/api-contracts) ────────────────────────────

// Request schemas from @ezstart/api-contracts (via aliased names for backward compat)
import {
  EmailOverrideSchema,
  ForgotPasswordRequestSchema,
  LoginRequestSchema,
  QuickSignupRequestSchema,
  RegisterRequestSchema,
  SendVerificationRequestSchema,
  SupportedLocaleSchema,
  TokenRequestSchema,
  VerifyRequestSchema,
} from '@ezstart/api-contracts'

export const loginRequestSchema = LoginRequestSchema
export const registerRequestSchema = RegisterRequestSchema
export const tokenRequestSchema = TokenRequestSchema
export const verifyRequestSchema = VerifyRequestSchema
export const forgotPasswordRequestSchema = ForgotPasswordRequestSchema
export const sendVerificationRequestSchema = SendVerificationRequestSchema
export const quickSignupRequestSchema = QuickSignupRequestSchema
export const supportedLocaleSchema = SupportedLocaleSchema
export const emailOverrideSchema = EmailOverrideSchema
