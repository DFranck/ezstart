import type { ReactNode } from 'react'
import type { UserSettingsTexts } from '../UserSettings.js'
import type { TwoFactorSettingsTexts } from '../TwoFactorSettings.js'
import type { EmailVerificationStatusTexts } from '../EmailVerificationStatus.js'
import type { SessionsManagerTexts } from '../SessionsManager.js'
import type { DeveloperPortalTexts } from '../developer/types.js'
import type { OAuthProvidersSectionTexts } from '../oauth-providers-section.js'
import type { AuditLogSectionTexts } from '../audit-log-section.js'
import type { DeleteAccountSectionTexts } from '../DeleteAccountSection.js'

/**
 * Canonical section identifiers for the unified `/dashboard`. Mirrors the
 * Stripe / Clerk / Vercel sidebar pattern: this is the **user space** —
 * always scoped to the current user. Platform-superadmin features (manage
 * all users, all applications) live in a dedicated `/admin` route via the
 * `<AuthAdminDashboard>` SDK component, NOT inside this sidebar.
 *
 * Consumer apps that need to expose admin entry points should render an
 * "Admin Platform" CTA via `sidebarFooterExtra` (or a dedicated route).
 *
 * Removed `'api-keys'` (2026-05-01, DASHBOARD-DROP-API-KEYS-001) — the
 * cross-app `<DeveloperPortal>` view is redundant with the per-Application
 * Keys tab in `/developer/<id>` (Stripe/Clerk/Auth0/Supabase pattern).
 * Consumers who still want a global keys view can mount `<DeveloperPortal>`
 * via the `extraSections` prop.
 */
export type EZAuthDashboardSection =
  | 'overview'
  | 'account'
  | 'applications'
  | 'billing'
  | 'usage'
  | 'activity'
  | 'settings'

/**
 * Visibility rules for each section.
 * - `always`: every authenticated user sees it
 * - `ownsApps`: only when the user owns at least one Application
 * - `admin`: admin OR superadmin
 * - `superadmin`: superadmin only
 */
export type SectionVisibility = 'always' | 'ownsApps' | 'admin' | 'superadmin'

export interface EZAuthDashboardTexts {
  /** Sidebar nav labels (keys mirror the section ids — `applications` slug
   * label is `navApplications`; consumers typically translate it as
   * "Developer" since it now hosts apps + their keys + themes + webhooks. */
  navOverview: string
  navAccount: string
  navApplications: string
  navBilling: string
  navUsage: string
  navActivity: string
  navSettings: string
  /** Sidebar brand */
  brand: string
  /** Overview section */
  welcomeBack: string
  memberSince: string
  plan: string
  planFree: string
  statsApiKeys: string
  statsApps: string
  statsRoles: string
  /** User info row labels */
  labelEmail: string
  labelUsername: string
  /** Billing section defaults */
  billingTitle: string
  billingDescription: string
  comingSoon: string
  /** Usage section defaults */
  usageTitle: string
  usageDescription: string
  usageComingSoon: string
  /** Sign out */
  signOut: string
  /** Settings sub-section titles */
  settingsEmailVerification: string
  settingsTwoFactor: string
  settingsSessions: string
  settingsConnectedAccounts: string
  /** Account (Profile) section labels */
  profileSectionTitle: string
  profileEditButton: string
  profileFirstNameLabel: string
  profileLastNameLabel: string
  profileSaveButton: string
  profileCancelButton: string
  profileSaveSuccess: string
  profileSaveError: string
  profileEmailSection: string
  profileEmailPrimary: string
  profileEmailVerified: string
  profileEmailUnverified: string
  profileResendVerification: string
  profileVerificationSent: string
  profileVerificationError: string
  profileConnectedAccountsSection: string
  profileConnectedGoogle: string
  profileConnectedNone: string
  profileMemberSinceLabel: string
  /** Nested component overrides */
  settings: Partial<UserSettingsTexts>
  emailVerification: Partial<EmailVerificationStatusTexts>
  twoFactor: Partial<TwoFactorSettingsTexts>
  sessions: Partial<SessionsManagerTexts>
  developerPortal: Partial<DeveloperPortalTexts>
  oauthProviders: Partial<OAuthProvidersSectionTexts>
  auditLog: Partial<AuditLogSectionTexts>
  /** Delete account (danger zone) section overrides — renders inside Account (Profile). */
  deleteAccount: Partial<DeleteAccountSectionTexts>
}

/**
 * Slot overrides. Consumer apps can inject app-specific content for sections
 * that need routing / app-scoped SDK components.
 *
 * Removed `apiKeys` (2026-05-01, DASHBOARD-DROP-API-KEYS-001) — the
 * `'api-keys'` section was dropped from the canonical sidebar. Consumers
 * who still want a global keys view can mount `<DeveloperPortal>` via
 * `extraSections`.
 */
export interface EZAuthDashboardSlots {
  overview?: ReactNode
  account?: ReactNode
  applications?: ReactNode
  billing?: ReactNode
  usage?: ReactNode
  activity?: ReactNode
  settings?: ReactNode
}

/**
 * Extra section injected at a specific position. Lets consumer apps add
 * product-specific sidebar entries without forking the dashboard.
 */
export interface EZAuthDashboardExtraSection {
  /** Unique id (used in `?section=` and as React key). Must not collide with the canonical ids. */
  id: string
  /** Sidebar label (already translated). */
  label: string
  /** Lucide icon name (e.g. `'lucide:Plug'`). */
  icon: string
  /** Content rendered when the section is active. */
  content: ReactNode
  /** Visibility rule. Defaults to `'always'`. */
  visibility?: SectionVisibility
}

export const DEFAULT_DASHBOARD_TEXTS: EZAuthDashboardTexts = {
  navOverview: 'Overview',
  navAccount: 'Account',
  navApplications: 'Developer',
  navBilling: 'Billing',
  navUsage: 'Usage',
  navActivity: 'Activity',
  navSettings: 'Settings',
  brand: 'Dashboard',
  welcomeBack: 'Welcome back',
  memberSince: 'Member since',
  labelEmail: 'Email',
  labelUsername: 'Username',
  plan: 'Plan',
  planFree: 'Free',
  statsApiKeys: 'API Keys',
  statsApps: 'Apps',
  statsRoles: 'Roles',
  billingTitle: 'Billing & Plans',
  billingDescription: 'Manage your subscription plan and usage limits',
  comingSoon: 'Pricing coming soon',
  usageTitle: 'Usage & Analytics',
  usageDescription: 'Personal usage statistics across your apps',
  usageComingSoon: 'Usage analytics coming soon',
  signOut: 'Sign Out',
  settingsEmailVerification: 'Email Verification',
  settingsTwoFactor: 'Two-Factor Authentication',
  settingsSessions: 'Active Sessions',
  settingsConnectedAccounts: 'Connected accounts',
  profileSectionTitle: 'Profile',
  profileEditButton: 'Edit profile',
  profileFirstNameLabel: 'First name',
  profileLastNameLabel: 'Last name',
  profileSaveButton: 'Save',
  profileCancelButton: 'Cancel',
  profileSaveSuccess: 'Profile updated successfully',
  profileSaveError: 'Failed to update profile',
  profileEmailSection: 'Email address',
  profileEmailPrimary: 'Primary',
  profileEmailVerified: 'Verified',
  profileEmailUnverified: 'Unverified',
  profileResendVerification: 'Resend verification email',
  profileVerificationSent: 'Verification email sent. Check your inbox.',
  profileVerificationError: 'Failed to send verification email',
  profileConnectedAccountsSection: 'Connected accounts',
  profileConnectedGoogle: 'Google',
  profileConnectedNone: 'Not connected',
  profileMemberSinceLabel: 'Member since',
  settings: {},
  emailVerification: {},
  twoFactor: {},
  sessions: {},
  developerPortal: {},
  oauthProviders: {},
  auditLog: {},
  deleteAccount: {},
}

/**
 * Default order for the canonical sections when `sections` prop is not provided.
 *
 * Note: `users` and `platform` are intentionally absent — they belong to the
 * dedicated `/admin` route (Vercel / Stripe pattern). The dashboard is the
 * user space, always scoped to the current user.
 */
export const DEFAULT_SECTION_ORDER: EZAuthDashboardSection[] = [
  'overview',
  'account',
  'applications',
  'billing',
  'usage',
  'activity',
  'settings',
]

export const SECTION_VISIBILITY: Record<EZAuthDashboardSection, SectionVisibility> = {
  overview: 'always',
  account: 'always',
  applications: 'always',
  billing: 'always',
  usage: 'always',
  activity: 'always',
  settings: 'always',
}

export const SECTION_ICONS: Record<EZAuthDashboardSection, string> = {
  overview: 'lucide:LayoutDashboard',
  account: 'lucide:User',
  applications: 'lucide:Code',
  billing: 'lucide:CreditCard',
  usage: 'lucide:BarChart3',
  activity: 'lucide:History',
  settings: 'lucide:Settings',
}

export function navLabelFor(section: EZAuthDashboardSection, texts: EZAuthDashboardTexts): string {
  switch (section) {
    case 'overview':
      return texts.navOverview
    case 'account':
      return texts.navAccount
    case 'applications':
      return texts.navApplications
    case 'billing':
      return texts.navBilling
    case 'usage':
      return texts.navUsage
    case 'activity':
      return texts.navActivity
    case 'settings':
      return texts.navSettings
  }
}

/**
 * RBAC helpers shared between the dashboard root and its section renderer.
 */
export function isSuperadmin(user: { globalRoles?: string[] }): boolean {
  return user.globalRoles?.includes('superadmin') ?? false
}

export function isAdminOrSuperadmin(user: { globalRoles?: string[] }): boolean {
  return isSuperadmin(user) || (user.globalRoles?.includes('admin') ?? false)
}
