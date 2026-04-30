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
import {
  AuthErrorLogsSection,
  DEFAULT_ERROR_LOGS_TEXTS,
  type AuthErrorLogsSectionTexts,
} from './admin/_internal/AuthErrorLogsSection.js'
import { type AuthUsersSectionTexts, DEFAULT_USERS_TEXTS } from './admin/types.js'
import {
  type AdminApplicationRow,
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
  /** Tab label: Error logs */
  tabErrorLogs?: string

  /** Overview section texts (analytics + stats + signup trend + top apps). */
  overview?: Partial<AuthOverviewSectionTexts>
  /** Users section texts (table + filters + edit/delete modals). */
  users?: Partial<AuthUsersSectionTexts>
  /** Applications section texts (CRUD + archive flow). */
  applications?: Partial<AuthApplicationsSectionTexts>
  /** Settings section texts (feature flags + maintenance mode). */
  settings?: AuthSettingsSectionTexts
  /** Error logs section texts (Sentry-free stopgap browser). */
  errorLogs?: Partial<AuthErrorLogsSectionTexts>
}

export interface AuthAdminDashboardProps {
  className?: string
  /**
   * Override default English labels. The object groups per-tab text overrides
   * (`overview`, `users`, `applications`, `settings`, `errorLogs`) plus tab
   * labels.
   */
  texts?: Partial<AuthAdminDashboardTexts>
  /**
   * Initial active tab. Defaults to `'overview'`.
   */
  defaultTab?: 'overview' | 'users' | 'applications' | 'settings' | 'errorLogs'
  /**
   * Optional callback invoked when the superadmin clicks the "View details"
   * action on an Application row. The SDK stays i18n-agnostic: the consumer
   * wires this to its own router (e.g. `router.push(\`/developer/\${app.id}\`)`).
   * When `undefined`, the action button is omitted from the table rows.
   */
  onApplicationOpen?: (app: AdminApplicationRow) => void
}

const DEFAULT_TAB_TEXTS = {
  tabOverview: 'Overview',
  tabUsers: 'Users',
  tabApplications: 'Applications',
  tabSettings: 'Settings',
  tabErrorLogs: 'Error logs',
} as const

export const defaultAuthAdminDashboardTexts: Required<
  Pick<
    AuthAdminDashboardTexts,
    'tabOverview' | 'tabUsers' | 'tabApplications' | 'tabSettings' | 'tabErrorLogs'
  >
> & {
  overview: Required<AuthOverviewSectionTexts>
  users: Required<AuthUsersSectionTexts>
  applications: Required<AuthApplicationsSectionTexts>
  settings: AuthSettingsSectionTexts
  errorLogs: Required<AuthErrorLogsSectionTexts>
} = {
  ...DEFAULT_TAB_TEXTS,
  overview: DEFAULT_OVERVIEW_TEXTS,
  users: DEFAULT_USERS_TEXTS,
  applications: DEFAULT_APPLICATIONS_TEXTS,
  settings: {},
  errorLogs: DEFAULT_ERROR_LOGS_TEXTS,
}

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
 * For federated admin (Tier 3 hub embeds the SDK against a remote EZAuth
 * deployment), configure the surrounding `<AuthProvider>` with the target
 * `apiUrl` — the dashboard reads it from context, no per-component prop.
 *
 * @example Standalone (uses surrounding AuthProvider)
 * ```tsx
 * <AuthAdminDashboard />
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
  defaultTab = 'overview',
  onApplicationOpen,
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
  const errorLogsTexts: Required<AuthErrorLogsSectionTexts> = {
    ...DEFAULT_ERROR_LOGS_TEXTS,
    ...texts?.errorLogs,
  }

  return (
    <Div className={cn('w-full', className)}>
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList>
          <TabsTrigger value="overview">{tabLabels.tabOverview}</TabsTrigger>
          <TabsTrigger value="users">{tabLabels.tabUsers}</TabsTrigger>
          <TabsTrigger value="applications">{tabLabels.tabApplications}</TabsTrigger>
          <TabsTrigger value="settings">{tabLabels.tabSettings}</TabsTrigger>
          <TabsTrigger value="errorLogs">{tabLabels.tabErrorLogs}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <AuthOverviewSection texts={overviewTexts} />
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <AuthUsersSection texts={usersTexts} />
        </TabsContent>
        <TabsContent value="applications" className="mt-4">
          <AuthApplicationsSection
            texts={applicationsTexts}
            onApplicationOpen={onApplicationOpen}
          />
        </TabsContent>
        <TabsContent value="settings" className="mt-4">
          <AuthSettingsSection texts={settingsTexts} />
        </TabsContent>
        <TabsContent value="errorLogs" className="mt-4">
          <AuthErrorLogsSection texts={errorLogsTexts} />
        </TabsContent>
      </Tabs>
    </Div>
  )
}
