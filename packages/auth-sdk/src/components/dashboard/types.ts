import type { ReactNode } from 'react'
import type { AuthAdminDashboardTexts } from '../AuthAdminDashboard.js'
import type { UserSettingsTexts } from '../UserSettings.js'
import type { TwoFactorSettingsTexts } from '../TwoFactorSettings.js'
import type { EmailVerificationStatusTexts } from '../EmailVerificationStatus.js'
import type { SessionsManagerTexts } from '../SessionsManager.js'
import type { DeveloperPortalTexts } from '../developer/types.js'

/**
 * Canonical section identifiers for the unified dashboard. Mirrors the
 * Stripe / Clerk sidebar pattern: progressive disclosure based on RBAC.
 */
export type EZAuthDashboardSection =
  | 'overview'
  | 'account'
  | 'applications'
  | 'api-keys'
  | 'billing'
  | 'usage'
  | 'settings'
  | 'users'
  | 'platform'

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
  navSettings: string
  navUsers: string
  navPlatform: string
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
  /** Nested component overrides */
  settings: Partial<UserSettingsTexts>
  emailVerification: Partial<EmailVerificationStatusTexts>
  twoFactor: Partial<TwoFactorSettingsTexts>
  sessions: Partial<SessionsManagerTexts>
  developerPortal: Partial<DeveloperPortalTexts>
  admin: Partial<AuthAdminDashboardTexts>
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
  settings?: ReactNode
  users?: ReactNode
  platform?: ReactNode
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
  navSettings: 'Settings',
  navUsers: 'Users',
  navPlatform: 'Platform',
  brand: 'Dashboard',
  welcomeBack: 'Welcome back',
  memberSince: 'Member since',
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
  settings: {},
  emailVerification: {},
  twoFactor: {},
  sessions: {},
  developerPortal: {},
  admin: {},
}

/**
 * Default order for the canonical sections when `sections` prop is not provided.
 */
export const DEFAULT_SECTION_ORDER: EZAuthDashboardSection[] = [
  'overview',
  'account',
  'applications',
  'api-keys',
  'billing',
  'usage',
  'users',
  'platform',
  'settings',
]

export const SECTION_VISIBILITY: Record<EZAuthDashboardSection, SectionVisibility> = {
  overview: 'always',
  account: 'always',
  applications: 'always',
  'api-keys': 'always',
  billing: 'always',
  usage: 'always',
  settings: 'always',
  users: 'admin',
  platform: 'superadmin',
}

export const SECTION_ICONS: Record<EZAuthDashboardSection, string> = {
  overview: 'lucide:LayoutDashboard',
  account: 'lucide:User',
  applications: 'lucide:AppWindow',
  'api-keys': 'lucide:Key',
  billing: 'lucide:CreditCard',
  usage: 'lucide:BarChart3',
  settings: 'lucide:Settings',
  users: 'lucide:Users',
  platform: 'lucide:ShieldCheck',
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
    case 'settings':
      return texts.navSettings
    case 'users':
      return texts.navUsers
    case 'platform':
      return texts.navPlatform
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
