import type { ReactNode } from 'react'
import type { UserSettingsTexts } from '../UserSettings.js'
import type { TwoFactorSettingsTexts } from '../TwoFactorSettings.js'
import type { EmailVerificationStatusTexts } from '../EmailVerificationStatus.js'
import type { SessionsManagerTexts } from '../SessionsManager.js'
import type { DeveloperPortalTexts } from '../developer/types.js'
import type { OAuthProvidersSectionTexts } from '../oauth-providers-section.js'
import type { AuditLogSectionTexts } from '../audit-log-section.js'

/**
 * Canonical section identifiers for the unified `/dashboard`. Mirrors the
 * Stripe / Clerk / Vercel sidebar pattern: this is the **user space** —
 * always scoped to the current user. Platform-superadmin features (manage
 * all users, all applications) live in a dedicated `/admin` route via the
 * `<AuthAdminDashboard>` SDK component, NOT inside this sidebar.
 *
 * Consumer apps that need to expose admin entry points should render an
 * "Admin Platform" CTA via `sidebarFooterExtra` (or a dedicated route).
 */
export type EZAuthDashboardSection =
  | 'overview'
  | 'account'
  | 'applications'
  | 'api-keys'
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
  /** Sidebar nav labels (keys mirror the section ids) */
  navOverview: string
  navAccount: string
  navApplications: string
  navApiKeys: string
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
  /** Nested component overrides */
  settings: Partial<UserSettingsTexts>
  emailVerification: Partial<EmailVerificationStatusTexts>
  twoFactor: Partial<TwoFactorSettingsTexts>
  sessions: Partial<SessionsManagerTexts>
  developerPortal: Partial<DeveloperPortalTexts>
  oauthProviders: Partial<OAuthProvidersSectionTexts>
  auditLog: Partial<AuditLogSectionTexts>
}

/**
 * Slot overrides. Consumer apps can inject app-specific content for sections
 * that need routing / app-scoped SDK components.
 */
export interface EZAuthDashboardSlots {
  overview?: ReactNode
  account?: ReactNode
  applications?: ReactNode
  apiKeys?: ReactNode
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
  navApplications: 'Applications',
  navApiKeys: 'API Keys',
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
  settings: {},
  emailVerification: {},
  twoFactor: {},
  sessions: {},
  developerPortal: {},
  oauthProviders: {},
  auditLog: {},
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
  'api-keys',
  'billing',
  'usage',
  'activity',
  'settings',
]

export const SECTION_VISIBILITY: Record<EZAuthDashboardSection, SectionVisibility> = {
  overview: 'always',
  account: 'always',
  applications: 'always',
  'api-keys': 'always',
  billing: 'always',
  usage: 'always',
  activity: 'always',
  settings: 'always',
}

export const SECTION_ICONS: Record<EZAuthDashboardSection, string> = {
  overview: 'lucide:LayoutDashboard',
  account: 'lucide:User',
  applications: 'lucide:AppWindow',
  'api-keys': 'lucide:Key',
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
    case 'api-keys':
      return texts.navApiKeys
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
