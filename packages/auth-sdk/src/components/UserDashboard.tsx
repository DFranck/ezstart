'use client'

import { useState } from 'react'
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  Div,
  H2,
  H3,
  Icon,
  P,
  Span,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ezstart/ui/components'
import { cn } from '@ezstart/ui/lib'
import { useAuth } from '../react/hooks.js'
import { UserAvatar } from './UserAvatar.js'
import { UserSettings } from './UserSettings.js'
import { DeveloperPortal } from './developer/index.js'
import type { UserSettingsTexts } from './UserSettings.js'
import type { DeveloperPortalTexts } from './developer/types.js'

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_TEXTS: UserDashboardTexts = {
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return '-'
  }
}

function getDisplayName(user: { firstName?: string; lastName?: string; username: string }): string {
  if (user.firstName) return user.firstName
  return user.username
}

function getUserRoleCount(
  user: {
    globalRoles?: string[]
    appRoles?: Record<string, string[]>
  },
  appName?: string
): number {
  let count = user.globalRoles?.length ?? 0
  if (appName && user.appRoles?.[appName]) {
    count += user.appRoles[appName].length
  }
  return count
}

// ─── Component ───────────────────────────────────────────────────────────────

export function UserDashboard({
  defaultTab = 'overview',
  hideTabs = [],
  appName,
  apiKeysEnabled = true,
  usage,
  texts: textOverrides,
  className,
}: UserDashboardProps) {
  const { user, isAuthenticated } = useAuth()
  const texts = { ...DEFAULT_TEXTS, ...textOverrides }
  const [activeTab, setActiveTab] = useState(defaultTab)

  // Not authenticated — SSR initialUser bootstrap means this renders correctly
  // on the very first paint when the user is signed in. No mount guard needed.
  if (!isAuthenticated || !user) {
    return null
  }

  const visibleTabs = (['overview', 'api-keys', 'settings', 'usage'] as const).filter(
    tab => !hideTabs.includes(tab)
  )

  return (
    <Div className={cn('w-full max-w-4xl mx-auto space-y-6', className)}>
      {/* Header */}
      <Div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Div className="flex items-center gap-4">
          <UserAvatar size="lg" user={user} />
          <Div>
            <H2 className="text-xl font-semibold text-foreground md:text-2xl">
              {texts.welcomeBack}, {getDisplayName(user)}
            </H2>
            <P className="text-sm text-muted-foreground">
              {texts.memberSince} {formatDate(user.createdAt)}
            </P>
          </Div>
        </Div>
        <Badge variant="outline" size="sm">
          {texts.plan}: {texts.planFree}
        </Badge>
      </Div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          {visibleTabs.includes('overview') && (
            <TabsTrigger value="overview">{texts.tabOverview}</TabsTrigger>
          )}
          {visibleTabs.includes('api-keys') && (
            <TabsTrigger value="api-keys">{texts.tabApiKeys}</TabsTrigger>
          )}
          {visibleTabs.includes('settings') && (
            <TabsTrigger value="settings">{texts.tabSettings}</TabsTrigger>
          )}
          {visibleTabs.includes('usage') && (
            <TabsTrigger value="usage">{texts.tabUsage}</TabsTrigger>
          )}
        </TabsList>

        {/* Overview */}
        {visibleTabs.includes('overview') && (
          <TabsContent value="overview">
            <OverviewTab user={user} appName={appName} texts={texts} />
          </TabsContent>
        )}

        {/* API Keys */}
        {visibleTabs.includes('api-keys') && (
          <TabsContent value="api-keys">
            <DeveloperPortal
              enabled={apiKeysEnabled}
              texts={texts.developerPortal}
              showAdminScope={user.globalRoles?.includes('superadmin') ?? false}
              appOptions={user.apps ?? []}
            />
          </TabsContent>
        )}

        {/* Settings */}
        {visibleTabs.includes('settings') && (
          <TabsContent value="settings">
            <UserSettings appName={appName} texts={texts.settings} />
          </TabsContent>
        )}

        {/* Usage */}
        {visibleTabs.includes('usage') && (
          <TabsContent value="usage">
            <UsageTab usage={usage} texts={texts} />
          </TabsContent>
        )}
      </Tabs>
    </Div>
  )
}

// ─── Overview Tab ────────────────────────────────────────────────────────────

interface OverviewTabProps {
  user: {
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
  appName?: string
  texts: UserDashboardTexts
}

function OverviewTab({ user, appName, texts }: OverviewTabProps) {
  const appsCount = user.apps?.length ?? 0
  const rolesCount = getUserRoleCount(user, appName)

  const stats = [
    { label: texts.statsApps, value: appsCount, icon: 'lucide:Layout' as const },
    { label: texts.statsRoles, value: rolesCount, icon: 'lucide:Shield' as const },
  ]

  return (
    <Div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map(stat => (
        <Card key={stat.label}>
          <CardContent className="flex items-center gap-4 p-4 md:p-6">
            <Div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Icon name={stat.icon} className="h-5 w-5 text-primary" />
            </Div>
            <Div>
              <P className="text-sm text-muted-foreground">{stat.label}</P>
              <Span className="text-2xl font-bold text-foreground">{stat.value}</Span>
            </Div>
          </CardContent>
        </Card>
      ))}

      {/* User info card */}
      <Card className="sm:col-span-2 lg:col-span-3">
        <CardHeader>
          <H3 className="text-sm font-medium text-foreground">{texts.tabOverview}</H3>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow icon="lucide:Mail" label="Email" value={user.email} />
          <InfoRow icon="lucide:AtSign" label="Username" value={user.username} />
          <InfoRow
            icon="lucide:Calendar"
            label={texts.memberSince}
            value={formatDate(user.createdAt)}
          />
        </CardContent>
      </Card>
    </Div>
  )
}

// ─── Usage Tab ───────────────────────────────────────────────────────────────

interface UsageTabProps {
  usage?: { requestsThisMonth: number; quotaLimit: number | null }
  texts: UserDashboardTexts
}

function UsageTab({ usage, texts }: UsageTabProps) {
  if (!usage) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-2 py-12">
          <Icon name="lucide:BarChart3" className="h-10 w-10 text-muted-foreground" />
          <P className="text-sm text-muted-foreground">{texts.noUsageData}</P>
        </CardContent>
      </Card>
    )
  }

  const percentage = usage.quotaLimit
    ? Math.min(Math.round((usage.requestsThisMonth / usage.quotaLimit) * 100), 100)
    : null

  return (
    <Div className="space-y-4">
      <Card>
        <CardHeader>
          <H3 className="text-sm font-medium text-foreground">{texts.usageTitle}</H3>
          <P className="text-xs text-muted-foreground">{texts.usageDescription}</P>
        </CardHeader>
        <CardContent className="space-y-4">
          <Div className="flex items-baseline justify-between">
            <P className="text-sm text-muted-foreground">{texts.requestsThisMonth}</P>
            <Span className="text-2xl font-bold text-foreground">
              {usage.requestsThisMonth.toLocaleString()}
            </Span>
          </Div>

          {usage.quotaLimit !== null && percentage !== null && (
            <>
              {/* Progress bar */}
              <Div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <Div
                  className={cn(
                    'h-full rounded-full transition-all',
                    percentage >= 90
                      ? 'bg-destructive'
                      : percentage >= 70
                        ? 'bg-warning'
                        : 'bg-primary'
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </Div>
              <Div className="flex items-baseline justify-between">
                <P className="text-sm text-muted-foreground">{texts.quotaLimit}</P>
                <Span className="text-sm font-medium text-foreground">
                  {usage.quotaLimit.toLocaleString()}
                </Span>
              </Div>
            </>
          )}
        </CardContent>
      </Card>
    </Div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <Div className="flex items-center gap-3">
      <Icon name={icon as 'lucide:Mail'} className="h-4 w-4 shrink-0 text-muted-foreground" />
      <Div className="flex-1 min-w-0">
        <P className="text-xs text-muted-foreground">{label}</P>
        <Span className="text-sm text-foreground truncate">{value}</Span>
      </Div>
    </Div>
  )
}
