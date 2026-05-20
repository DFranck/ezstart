'use client'

import { Card, CardContent, CardHeader, Div, H3, Icon, P, Span } from '@ezstart/ui/components'
import type { UserDashboardTexts, UserDashboardUser } from './types.js'
import { formatDate, getUserRoleCount } from './helpers.js'

interface OverviewTabProps {
  user: UserDashboardUser
  appName?: string
  texts: UserDashboardTexts
}

/**
 * Overview tab for `<UserDashboard>`: quick stats + user info card.
 *
 * @internal
 */
export function OverviewTab({ user, appName, texts }: OverviewTabProps) {
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
