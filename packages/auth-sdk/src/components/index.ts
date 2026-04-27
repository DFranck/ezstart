/**
 * Components layer — pre-built UI components.
 *
 * Peer dependencies: `react`, `@ezstart/ui`, `next`, `sonner`.
 * Imports from `core/` and `react/` only — zero coupling to any i18n
 * library. All user-facing strings are accepted via `texts` props with
 * English defaults and the active locale is detected from the URL
 * pathname (`useAuthNavigation().locale`).
 */

// Dev mode banner
export { DevModeBanner } from './DevModeBanner.js'
export type { DevModeBannerProps } from './DevModeBanner.js'

// Auth error banner (destructive feedback for auth forms / modals)
export { AuthErrorBanner } from './auth-error-banner.js'
export type { AuthErrorBannerProps, AuthErrorBannerTexts } from './auth-error-banner.js'

// Scope context indicator (Stripe-style "Personal" vs "Platform admin" header badge + toggle)
export { ScopeContextIndicator } from './scope-context-indicator.js'
export type {
  ScopeContextIndicatorProps,
  ScopeContextIndicatorTexts,
  ScopeContextIndicatorLinkProps,
} from './scope-context-indicator.js'

// Guards loader (styled wrapper around the agnostic <RequireAuth /> default)
export { RequireAuthLoader } from './RequireAuthLoader.js'
export type { RequireAuthLoaderProps } from './RequireAuthLoader.js'

// Auth forms
export { SignInForm } from './SignInForm.js'
export type { SignInFormProps, SignInFormTexts } from './SignInForm.js'

export { SignUpForm } from './SignUpForm.js'
export type { SignUpFormProps, SignUpFormTexts } from './SignUpForm.js'

export { QuickSignUpForm } from './QuickSignUpForm.js'
export type { QuickSignUpFormProps, QuickSignUpFormTexts } from './QuickSignUpForm.js'

export { ForgotPasswordForm } from './ForgotPasswordForm.js'
export type { ForgotPasswordFormProps, ForgotPasswordFormTexts } from './ForgotPasswordForm.js'

export { ResetPasswordForm } from './ResetPasswordForm.js'
export type { ResetPasswordFormProps, ResetPasswordFormTexts } from './ResetPasswordForm.js'

// OAuth
export { OAuthButtons } from './OAuthButtons.js'
export type { OAuthButtonsProps, OAuthButtonsTexts, OAuthProvider } from './OAuthButtons.js'

// OAuth provider management section (Connected accounts card)
export { OAuthProvidersSection, DEFAULT_OAUTH_PROVIDERS } from './oauth-providers-section.js'
export type {
  OAuthProvidersSectionProps,
  OAuthProvidersSectionTexts,
  OAuthProvidersSectionProvider,
} from './oauth-providers-section.js'

// Password
export { PasswordStrength } from './PasswordStrength.js'
export type { PasswordStrengthProps, PasswordStrengthTexts } from './PasswordStrength.js'

// Two-factor
export { TwoFactorPrompt } from './TwoFactorPrompt.js'
export type { TwoFactorPromptProps, TwoFactorPromptTexts } from './TwoFactorPrompt.js'

export { TwoFactorSettings } from './TwoFactorSettings.js'
export type { TwoFactorSettingsProps, TwoFactorSettingsTexts } from './TwoFactorSettings.js'

// Email verification
export { VerifyEmailFlow } from './VerifyEmailFlow.js'
export type { VerifyEmailFlowProps, VerifyEmailFlowTexts } from './VerifyEmailFlow.js'

export { EmailVerificationStatus } from './EmailVerificationStatus.js'
export type {
  EmailVerificationStatusProps,
  EmailVerificationStatusTexts,
} from './EmailVerificationStatus.js'

// Sessions
export { SessionsManager } from './SessionsManager.js'
export type { SessionsManagerProps, SessionsManagerTexts } from './SessionsManager.js'

// Audit log (user activity)
export { AuditLogSection } from './audit-log-section.js'
export type { AuditLogSectionProps, AuditLogSectionTexts } from './audit-log-section.js'

// User components
export { UserMenu } from './UserMenu.js'
export type { UserMenuProps, UserMenuItem, UserMenuTexts } from './UserMenu.js'

export { AccountModal } from './AccountModal.js'
export type { AccountModalProps, AccountModalTexts } from './AccountModal.js'

export { UserAvatar } from './UserAvatar.js'
export type { UserAvatarProps } from './UserAvatar.js'

export { UserSettings } from './UserSettings.js'
export type { UserSettingsProps, UserSettingsTexts } from './UserSettings.js'

// Delete account (danger zone)
export { DeleteAccountSection, DEFAULT_DELETE_ACCOUNT_TEXTS } from './DeleteAccountSection.js'
export type {
  DeleteAccountSectionProps,
  DeleteAccountSectionTexts,
} from './DeleteAccountSection.js'

// User dashboard (compound)
export { UserDashboard } from './UserDashboard.js'
export type { UserDashboardProps, UserDashboardTexts } from './UserDashboard.js'

// Admin
export { AuthAdminDashboard } from './AuthAdminDashboard.js'
export type {
  AuthAdminDashboardProps,
  AuthAdminDashboardTexts,
  AuthAdminAudienceScope,
} from './AuthAdminDashboard.js'

export { AdminApplicationsDashboard } from './AdminApplicationsDashboard.js'
export type {
  AdminApplicationsDashboardProps,
  AdminApplicationsTexts,
} from './AdminApplicationsDashboard.js'

// Admin — feature flags + maintenance mode
export { AdminFeatureFlagsSection } from './admin/AdminFeatureFlagsSection.js'
export type {
  AdminFeatureFlagsSectionProps,
  AdminFeatureFlagsSectionTexts,
} from './admin/AdminFeatureFlagsSection.js'

// Admin — platform analytics overview (superadmin only)
export { AdminAnalyticsSection } from './admin/AdminAnalyticsSection.js'
export type {
  AdminAnalyticsSectionProps,
  AdminAnalyticsSectionTexts,
} from './admin/AdminAnalyticsSection.js'
export { AdminMaintenanceModeSection } from './admin/AdminMaintenanceModeSection.js'
export type {
  AdminMaintenanceModeSectionProps,
  AdminMaintenanceModeSectionTexts,
} from './admin/AdminMaintenanceModeSection.js'
export { MaintenanceBanner } from './admin/MaintenanceBanner.js'
export type { MaintenanceBannerProps, MaintenanceBannerTexts } from './admin/MaintenanceBanner.js'

// Developer dashboard (full-page layout)
export { EZAuthDashboard } from './EZAuthDashboard.js'
export type {
  EZAuthDashboardProps,
  EZAuthDashboardTexts,
  EZAuthDashboardSection,
  EZAuthDashboardSlots,
  EZAuthDashboardExtraSection,
} from './EZAuthDashboard.js'

// Developer portal (API keys management)
export {
  DeveloperPortal,
  ApiKeysTable,
  CreateKeyModal,
  KeyCreatedModal,
  UsageDetailsModal,
  UsageBadge,
  defaultDeveloperPortalTexts,
} from './developer/index.js'
export type {
  DeveloperPortalProps,
  ApiKeysTableProps,
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
} from './developer/index.js'

// Applications (P6 — multi-tenant entity)
export {
  ApplicationsList,
  ApplicationCard,
  CreateApplicationModal,
  ApplicationDetailView,
  defaultApplicationsFlowTexts,
} from './applications/index.js'
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
} from './applications/index.js'
