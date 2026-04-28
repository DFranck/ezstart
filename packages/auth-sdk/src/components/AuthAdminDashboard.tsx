'use client'

import { Div, Tabs, TabsContent, TabsList, TabsTrigger } from '@ezstart/ui/components'
import { cn } from '@ezstart/ui/lib'
import {
  AuthOverviewSection,
  DEFAULT_OVERVIEW_TEXTS,
  type AuthOverviewSectionTexts,
} from './admin/_internal/OverviewSection.js'
import { AuthUsersSection } from './admin/_internal/UsersSection.js'
import { AuthApplicationsSection } from './admin/_internal/ApplicationsSection.js'
import {
  AuthSettingsSection,
  type AuthSettingsSectionTexts,
} from './admin/_internal/SettingsSection.js'
import { type AuthUsersSectionTexts, DEFAULT_USERS_TEXTS } from './admin/types.js'
import {
  type AuthApplicationsSectionTexts,
  DEFAULT_APPLICATIONS_TEXTS,
} from './admin/AdminApplications.types.js'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface AuthAdminDashboardTexts {
  /** Tab label: Overview */
  tabOverview?: string
  /** Tab label: Users */
  tabUsers?: string
  /** Tab label: Applications */
  tabApplications?: string
  /** Tab label: Settings */
  tabSettings?: string

  /** Overview section texts (analytics + stats + signup trend + top apps). */
  overview?: Partial<AuthOverviewSectionTexts>
  /** Users section texts (table + filters + edit/delete modals). */
  users?: Partial<AuthUsersSectionTexts>
  /** Applications section texts (CRUD + archive flow). */
  applications?: Partial<AuthApplicationsSectionTexts>
  /** Settings section texts (feature flags + maintenance mode). */
  settings?: AuthSettingsSectionTexts
}

export interface AuthAdminDashboardProps {
  className?: string
  /**
   * Override default English labels. The object groups per-tab text overrides
   * (`overview`, `users`, `applications`, `settings`) plus tab labels.
   */
  texts?: AuthAdminDashboardTexts
  /**
   * Override the EZAuth API base URL used for all admin calls.
   *
   * Required for **federated admin** scenarios where the dashboard is
   * embedded in a hub app (e.g. `apps/ezstart/web/admin`) that consumes
   * EZAuth cross-origin. When omitted, the API URL falls back to the
   * surrounding `<AuthProvider>` configuration.
   *
   * @example 'https://auth.example.com'
   */
  apiUrl?: string
  /**
   * Override the bearer token used for admin API calls. Accepts a static
   * string or a thunk returning a string (or Promise). When provided, this
   * value is used instead of the `accessToken` from the local auth store —
   * required for federated admin embeds where the hub app holds the
   * platform-wide superadmin JWT and forwards it to each SDK dashboard.
   */
  authToken?: string | (() => string | Promise<string>)
  /**
   * Initial active tab. Defaults to `'overview'`.
   */
  defaultTab?: 'overview' | 'users' | 'applications' | 'settings'
  /**
   * BCP47 locale used for date/time formatting in tables (created at,
   * relative time, audit log, etc.). Defaults to the browser's locale.
   */
  locale?: string
}

const DEFAULT_TAB_TEXTS = {
  tabOverview: 'Overview',
  tabUsers: 'Users',
  tabApplications: 'Applications',
  tabSettings: 'Settings',
} as const

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * All-in-one EZAuth admin console with internal tabs.
 *
 * Renders four tabs — Overview, Users, Applications, Settings — each
 * driving its own internal section. All sections are auto-scoped
 * server-side via the JWT (`req.derivedScope`):
 * - superadmin → all tenants
 * - app admin   → owned Applications
 * - user        → own account
 *
 * Drop-in component for both the EZAuth web app's own `/admin` page and
 * the EZStart hub's federated admin (Tier 3 embedding cross-origin).
 *
 * @example Standalone (uses surrounding AuthProvider)
 * ```tsx
 * <AuthAdminDashboard />
 * ```
 *
 * @example Federated admin (Tier 3 hub embedding cross-origin)
 * ```tsx
 * <AuthAdminDashboard
 *   apiUrl="https://auth.example.com"
 *   authToken={() => superadminJwt}
 * />
 * ```
 *
 * @example With localized texts
 * ```tsx
 * <AuthAdminDashboard
 *   texts={{
 *     tabOverview: 'Vue d\'ensemble',
 *     overview: { title: 'Stats plateforme' },
 *     users: { searchPlaceholder: 'Rechercher...' },
 *   }}
 * />
 * ```
 */
export function AuthAdminDashboard({
  className,
  texts,
  apiUrl,
  authToken,
  defaultTab = 'overview',
  locale,
}: AuthAdminDashboardProps) {
  const tabLabels = { ...DEFAULT_TAB_TEXTS, ...texts }

  // Each section receives a Required<...> object built from its defaults
  // merged with the per-tab override slice.
  const overviewTexts: Required<AuthOverviewSectionTexts> = {
    ...DEFAULT_OVERVIEW_TEXTS,
    ...texts?.overview,
  }
  const usersTexts: Required<AuthUsersSectionTexts> = {
    ...DEFAULT_USERS_TEXTS,
    ...texts?.users,
  }
  const applicationsTexts: Required<AuthApplicationsSectionTexts> = {
    ...DEFAULT_APPLICATIONS_TEXTS,
    ...texts?.applications,
  }
  // Settings has nested sub-objects (featureFlags + maintenance) — forward
  // the partial as-is; the section does its own merge.
  const settingsTexts = texts?.settings

  return (
    <Div className={cn('w-full', className)}>
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList>
          <TabsTrigger value="overview">{tabLabels.tabOverview}</TabsTrigger>
          <TabsTrigger value="users">{tabLabels.tabUsers}</TabsTrigger>
          <TabsTrigger value="applications">{tabLabels.tabApplications}</TabsTrigger>
          <TabsTrigger value="settings">{tabLabels.tabSettings}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <AuthOverviewSection texts={overviewTexts} apiUrl={apiUrl} authToken={authToken} />
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <AuthUsersSection
            texts={usersTexts}
            apiUrl={apiUrl}
            authToken={authToken}
            locale={locale}
          />
        </TabsContent>
        <TabsContent value="applications" className="mt-4">
          <AuthApplicationsSection texts={applicationsTexts} locale={locale} />
        </TabsContent>
        <TabsContent value="settings" className="mt-4">
          <AuthSettingsSection texts={settingsTexts} apiUrl={apiUrl} authToken={authToken} />
        </TabsContent>
      </Tabs>
    </Div>
  )
}
