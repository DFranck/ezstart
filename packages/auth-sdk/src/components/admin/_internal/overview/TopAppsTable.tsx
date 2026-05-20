'use client'

import { Badge, Button, Card, Div, P, Skeleton } from '@ezstart/ui/components'
import type { AdminAnalyticsOverview } from '../../../../core/types.js'
import type { AuthOverviewSectionTexts } from './texts.js'

interface TopAppsTableProps {
  loading: boolean
  data: AdminAnalyticsOverview | undefined
  t: Required<AuthOverviewSectionTexts>
}

/**
 * Top-5 apps ranked by registered user count, rendered as labelled bars.
 *
 * @internal
 */
export function TopAppsTable({ loading, data, t }: TopAppsTableProps) {
  if (loading || !data) {
    return (
      <Div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </Div>
    )
  }

  if (data.topAppsByUsers.length === 0) {
    return (
      <Div className="flex items-center justify-center h-[200px]">
        <P className="text-sm text-muted-foreground">{t.topAppsEmpty}</P>
      </Div>
    )
  }

  const max = Math.max(...data.topAppsByUsers.map(a => a.userCount), 1)

  return (
    <Div className="space-y-2">
      <Div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <P className="text-xs text-muted-foreground">{t.topAppsAppColumn}</P>
        <P className="text-xs text-muted-foreground">{t.topAppsUsersColumn}</P>
      </Div>
      {data.topAppsByUsers.map(app => {
        const widthPct = Math.max(4, Math.round((app.userCount / max) * 100))
        return (
          <Div key={app.appName} className="space-y-1">
            <Div className="flex items-center justify-between gap-2">
              <P className="text-sm font-medium truncate">{app.appName}</P>
              <Badge variant="secondary" size="xs">
                {app.userCount}
              </Badge>
            </Div>
            <Div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <Div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${widthPct}%` }}
              />
            </Div>
          </Div>
        )
      })}
    </Div>
  )
}

interface ErrorStateProps {
  text: string
  retryLabel: string
  onRetry: () => void
}

/**
 * Inline error card with retry CTA for the overview section.
 *
 * @internal
 */
export function ErrorState({ text, retryLabel, onRetry }: ErrorStateProps) {
  return (
    <Card className="p-6">
      <Div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <P className="text-sm text-destructive">{text}</P>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      </Div>
    </Card>
  )
}
