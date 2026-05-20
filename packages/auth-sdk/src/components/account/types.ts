/**
 * Shared types for the AccountModal sub-components.
 *
 * @internal
 */

export interface AccountModalTexts {
  title: string
  profileTab: string
  settingsTab: string
  updateProfile: string
  emailSection: string
  primary: string
  connectedAccounts: string
  connectAccount: string
  themeSection: string
  themeLight: string
  themeDark: string
  themeSystem: string
  languageSection: string
  memberSince: string
  // Edit profile
  firstName: string
  lastName: string
  save: string
  cancel: string
  profileUpdated: string
  // Avatar
  changeAvatar: string
  cropAvatar: string
  // Password
  passwordSection: string
  currentPassword: string
  newPassword: string
  changePassword: string
  createPassword: string
  passwordChanged: string
  /**
   * Shown when a privileged action (e.g. change password) is rejected by
   * the server with code `EMAIL_VERIFICATION_REQUIRED` — the user must
   * verify their email before continuing.
   */
  emailVerificationRequired: string
  // Advanced security (link to ezauth settings)
  securitySection: string
  manageSecurity: string
  // Email verification
  emailVerified: string
  emailUnverified: string
  resendVerification: string
  verificationSent: string
  verifyError: string
  // BCP-47 locale used to format member-since etc.
  dateLocale?: string
}

export const DEFAULT_ACCOUNT_TEXTS: AccountModalTexts = {
  title: 'Account',
  profileTab: 'Profile',
  settingsTab: 'Settings',
  updateProfile: 'Update profile',
  emailSection: 'Email addresses',
  primary: 'Primary',
  connectedAccounts: 'Connected accounts',
  connectAccount: 'Connect account',
  themeSection: 'Theme',
  themeLight: 'Light',
  themeDark: 'Dark',
  themeSystem: 'System',
  languageSection: 'Language',
  memberSince: 'Member since',
  firstName: 'First name',
  lastName: 'Last name',
  save: 'Save',
  cancel: 'Cancel',
  profileUpdated: 'Profile updated successfully',
  changeAvatar: 'Change avatar',
  cropAvatar: 'Crop avatar',
  passwordSection: 'Password',
  currentPassword: 'Current password',
  newPassword: 'New password',
  changePassword: 'Change password',
  createPassword: 'Create password',
  passwordChanged: 'Password changed successfully',
  emailVerificationRequired: 'Please verify your email address before changing your password.',
  securitySection: 'Advanced security',
  manageSecurity: 'Manage 2FA & sessions',
  emailVerified: 'Verified',
  emailUnverified: 'Unverified',
  resendVerification: 'Resend verification email',
  verificationSent: 'Verification email sent. Check your inbox.',
  verifyError: 'Failed to send verification email',
}

export type AccountTab = 'profile' | 'settings'

/**
 * Format a date for the "Member since" row.
 *
 * @internal
 */
export function formatAccountDate(dateStr: string, locale?: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}
