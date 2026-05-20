'use client'

import { Badge, Card, Div, P, Skeleton } from '@ezstart/ui/components'
import type { AdminAnalyticsOverview } from '../../../../core/types.js'
import type { AuthOverviewSectionTexts } from './texts.js'
import { pctLabel, pctTrendVariant } from './helpers.js'

interface StatsGridProps {
  loading: boolean
  data: AdminAnalyticsOverview | undefined
  t: Required<AuthOverviewSectionTexts>
}

/**
 * Responsive grid of platform stat cards (totals + percentages).
 *
 * @internal
 */
export function StatsGrid({ loading, data, t }: StatsGridProps) {
  if (loading || !data) {
    return (
      <Div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-7 w-16" />
          </Card>
        ))}
      </Div>
    )
  }

  return (
    <Div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <StatCard label={t.totalUsers} value={data.totalUsers} />
      <StatCard
        label={t.newUsersThisMonth}
        value={data.newUsersThisMonth}
        trendBadge={
          data.newUsersThisMonth > 0 ? (
            <Badge variant="success" size="xs">
              +{data.newUsersThisMonth}
            </Badge>
          ) : undefined
        }
      />
      <StatCard
        label={t.activeUsersLast30Days}
        value={data.activeUsersLast30Days}
        hint={t.activeUsersHint}
      />
      <StatCard
        label={t.verifiedUsers}
        value={pctLabel(data.verifiedUsersPct)}
        trendBadge={
          <Badge variant={pctTrendVariant(data.verifiedUsersPct, 50)} size="xs">
            {pctLabel(data.verifiedUsersPct)}
          </Badge>
        }
      />
      <StatCard
        label={t.twoFactorEnabled}
        value={pctLabel(data.twoFactorEnabledPct)}
        trendBadge={
          <Badge variant={pctTrendVariant(data.twoFactorEnabledPct, 10)} size="xs">
            {pctLabel(data.twoFactorEnabledPct)}
          </Badge>
        }
      />
      <StatCard label={t.totalApplications} value={data.totalApplications} />
      <StatCard label={t.totalApiKeys} value={data.totalApiKeys} />
    </Div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  hint?: string
  trendBadge?: React.ReactNode
}

function StatCard({ label, value, hint, trendBadge }: StatCardProps) {
  return (
    <Card className="p-4">
      <Div className="flex items-start justify-between gap-2">
        <P className="text-sm text-muted-foreground">{label}</P>
        {trendBadge}
      </Div>
      <P className="text-2xl font-bold mt-1">{value}</P>
      {hint && <P className="text-xs text-muted-foreground mt-1">{hint}</P>}
    </Card>
  )
}
