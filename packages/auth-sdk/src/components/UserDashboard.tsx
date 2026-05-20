'use client'

import { useState } from 'react'
import { Badge, Div, H2, P, Tabs, TabsContent, TabsList, TabsTrigger } from '@ezstart/ui/components'
import { cn } from '@ezstart/ui/lib'
import { useAuth } from '../react/hooks.js'
import { UserAvatar } from './UserAvatar.js'
import { UserSettings } from './UserSettings.js'
import { DeveloperPortal } from './developer/index.js'
import { DEFAULT_USER_DASHBOARD_TEXTS, type UserDashboardProps } from './user-dashboard/types.js'
import { OverviewTab } from './user-dashboard/OverviewTab.js'
import { UsageTab } from './user-dashboard/UsageTab.js'
import { formatDate, getDisplayName } from './user-dashboard/helpers.js'

export type { UserDashboardProps, UserDashboardTexts } from './user-dashboard/types.js'

/**
 * End-user dashboard with tabs for Overview, API Keys, Settings, and
 * Usage. Lighter alternative to `<EZAuthDashboard>` when the consumer
 * does not need the federated admin sections.
 *
 * @example
 * ```tsx
 * <UserDashboard appName="myapp" />
 * ```
 */
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
  const texts = { ...DEFAULT_USER_DASHBOARD_TEXTS, ...textOverrides }
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
