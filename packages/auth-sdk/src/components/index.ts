/**
 * Components layer — pre-built UI components.
 *
 * Peer dependencies: `react`, `@ezstart/ui`, `next-intl`, `next`, `sonner`.
 * Imports from `core/` and uses the monorepo wrapper for auth context.
 */

// Dev mode banner
export { DevModeBanner } from './DevModeBanner.js'
export type { DevModeBannerProps } from './DevModeBanner.js'

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

// User components
export { UserMenu } from './UserMenu.js'
export type { UserMenuProps, UserMenuItem, UserMenuTexts } from './UserMenu.js'

export { AccountModal } from './AccountModal.js'
export type { AccountModalProps, AccountModalTexts } from './AccountModal.js'

export { UserAvatar } from './UserAvatar.js'
export type { UserAvatarProps } from './UserAvatar.js'

export { UserSettings } from './UserSettings.js'
export type { UserSettingsProps, UserSettingsTexts } from './UserSettings.js'

// User dashboard (compound)
export { UserDashboard } from './UserDashboard.js'
export type { UserDashboardProps, UserDashboardTexts } from './UserDashboard.js'

// Admin
export { AuthAdminDashboard } from './AuthAdminDashboard.js'
export type { AuthAdminDashboardProps, AuthAdminDashboardTexts } from './AuthAdminDashboard.js'

// Developer dashboard (full-page layout)
export { EZAuthDashboard } from './EZAuthDashboard.js'
export type { EZAuthDashboardProps, EZAuthDashboardTexts } from './EZAuthDashboard.js'

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
