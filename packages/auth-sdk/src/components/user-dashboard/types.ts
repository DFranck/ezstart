/**
 * Public texts + props contract for `<UserDashboard>`, plus the shared user
 * shape used by the dashboard tabs.
 *
 * Extracted from the component so the main file stays under the 400-line
 * policy ceiling. SDK-i18n-agnostic — every label has an English default the
 * consumer can override via the `texts` prop.
 *
 * @internal
 */

import type { UserSettingsTexts } from '../UserSettings.js'
import type { DeveloperPortalTexts } from '../developer/types.js'

export interface UserDashboardTexts {
  /** Page title */
  title: string
  /** Tab labels */
  tabOverview: string
  tabApiKeys: string
  tabSettings: string
  tabUsage: string
  /** Overview section */
  welcomeBack: string
  memberSince: string
  plan: string
  planFree: string
  /** Quick stats */
  statsApiKeys: string
  statsApps: string
  statsRoles: string
  /** Usage section */
  usageTitle: string
  usageDescription: string
  requestsThisMonth: string
  quotaLimit: string
  noUsageData: string
  /** Nested component overrides */
  settings: Partial<UserSettingsTexts>
  developerPortal: Partial<DeveloperPortalTexts>
}

export interface UserDashboardProps {
  /** Override default tab. Defaults to `'overview'`. */
  defaultTab?: 'overview' | 'api-keys' | 'settings' | 'usage'
  /** Hide specific tabs */
  hideTabs?: Array<'overview' | 'api-keys' | 'settings' | 'usage'>
  /** App name for role display and API key scoping */
  appName?: string
  /** Whether DeveloperPortal should fetch data */
  apiKeysEnabled?: boolean
  /** Usage data (passed from consumer — auth-sdk doesn't fetch usage) */
  usage?: {
    requestsThisMonth: number
    quotaLimit: number | null
  }
  /** All user-facing strings. Falls back to English defaults. */
  texts?: Partial<UserDashboardTexts>
  /** Additional className on root wrapper */
  className?: string
}

/** User shape consumed by the dashboard tabs. @internal */
export interface UserDashboardUser {
  email: string
  username: string
  firstName?: string
  lastName?: string
  avatar?: string
  apps?: string[]
  globalRoles?: string[]
  appRoles?: Record<string, string[]>
  createdAt: string
}

export const DEFAULT_USER_DASHBOARD_TEXTS: UserDashboardTexts = {
  title: 'Dashboard',
  tabOverview: 'Overview',
  tabApiKeys: 'API Keys',
  tabSettings: 'Settings',
  tabUsage: 'Usage',
  welcomeBack: 'Welcome back',
  memberSince: 'Member since',
  plan: 'Plan',
  planFree: 'Free',
  statsApiKeys: 'API Keys',
  statsApps: 'Apps',
  statsRoles: 'Roles',
  usageTitle: 'Usage',
  usageDescription: 'Your API usage for the current billing period.',
  requestsThisMonth: 'Requests this month',
  quotaLimit: 'Quota limit',
  noUsageData: 'No usage data available yet.',
  settings: {},
  developerPortal: {},
}
