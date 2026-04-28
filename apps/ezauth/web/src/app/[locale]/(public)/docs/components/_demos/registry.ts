/**
 * Demo registry — maps component names to their lazy-loaded demo files.
 *
 * Each entry is a `React.lazy()` wrapper so Webpack code-splits the demo
 * module out of the main bundle. The registry is the single source of
 * truth — adding a new component means: (1) write
 * `_demos/<ComponentName>.demo.tsx`, (2) register it here.
 */

import { lazy, type ComponentType } from 'react'

export type DemoComponent = ComponentType<Record<string, never>>

export const demoRegistry: Record<string, DemoComponent> = {
  AccountModal: lazy(() => import('./AccountModal.demo')),
  AccountModalV2: lazy(() => import('./AccountModalV2.demo')),
  ApiKeysTable: lazy(() => import('./ApiKeysTable.demo')),
  ApplicationCard: lazy(() => import('./ApplicationCard.demo')),
  ApplicationDetailView: lazy(() => import('./ApplicationDetailView.demo')),
  ApplicationsList: lazy(() => import('./ApplicationsList.demo')),
  AuditLogSection: lazy(() => import('./AuditLogSection.demo')),
  AuthAdminDashboard: lazy(() => import('./AuthAdminDashboard.demo')),
  AuthCallbackPage: lazy(() => import('./AuthCallbackPage.demo')),
  AuthErrorBanner: lazy(() => import('./AuthErrorBanner.demo')),
  AuthModalShell: lazy(() => import('./AuthModalShell.demo')),
  CreateApplicationModal: lazy(() => import('./CreateApplicationModal.demo')),
  CreateKeyModal: lazy(() => import('./CreateKeyModal.demo')),
  DeleteAccountSection: lazy(() => import('./DeleteAccountSection.demo')),
  DeveloperPortal: lazy(() => import('./DeveloperPortal.demo')),
  DevModeBanner: lazy(() => import('./DevModeBanner.demo')),
  EmailVerificationStatus: lazy(() => import('./EmailVerificationStatus.demo')),
  EZAuthDashboard: lazy(() => import('./EZAuthDashboard.demo')),
  ForgotPasswordForm: lazy(() => import('./ForgotPasswordForm.demo')),
  ForgotPasswordModal: lazy(() => import('./ForgotPasswordModal.demo')),
  KeyCreatedModal: lazy(() => import('./KeyCreatedModal.demo')),
  LoginButton: lazy(() => import('./LoginButton.demo')),
  MaintenanceBanner: lazy(() => import('./MaintenanceBanner.demo')),
  OAuthButtons: lazy(() => import('./OAuthButtons.demo')),
  OAuthProvidersSection: lazy(() => import('./OAuthProvidersSection.demo')),
  PasswordStrength: lazy(() => import('./PasswordStrength.demo')),
  QuickSignUpForm: lazy(() => import('./QuickSignUpForm.demo')),
  RegisterButton: lazy(() => import('./RegisterButton.demo')),
  RequireAuthLoader: lazy(() => import('./RequireAuthLoader.demo')),
  ResetPasswordForm: lazy(() => import('./ResetPasswordForm.demo')),
  ResetPasswordModal: lazy(() => import('./ResetPasswordModal.demo')),
  ScopeContextIndicator: lazy(() => import('./ScopeContextIndicator.demo')),
  SessionsManager: lazy(() => import('./SessionsManager.demo')),
  SignInForm: lazy(() => import('./SignInForm.demo')),
  SignInModal: lazy(() => import('./SignInModal.demo')),
  SignUpForm: lazy(() => import('./SignUpForm.demo')),
  SignUpModal: lazy(() => import('./SignUpModal.demo')),
  TwoFactorPrompt: lazy(() => import('./TwoFactorPrompt.demo')),
  TwoFactorSettings: lazy(() => import('./TwoFactorSettings.demo')),
  UsageBadge: lazy(() => import('./UsageBadge.demo')),
  UsageDetailsModal: lazy(() => import('./UsageDetailsModal.demo')),
  UserAvatar: lazy(() => import('./UserAvatar.demo')),
  UserDashboard: lazy(() => import('./UserDashboard.demo')),
  UserMenu: lazy(() => import('./UserMenu.demo')),
  UserMenuV2: lazy(() => import('./UserMenuV2.demo')),
  UserSettings: lazy(() => import('./UserSettings.demo')),
  VerifyEmailFlow: lazy(() => import('./VerifyEmailFlow.demo')),
  VerifyEmailModal: lazy(() => import('./VerifyEmailModal.demo')),
}
