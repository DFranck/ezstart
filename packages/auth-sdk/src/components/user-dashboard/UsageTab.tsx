'use client'

import { Card, CardContent, CardHeader, Div, H3, Icon, P, Span } from '@ezstart/ui/components'
import { cn } from '@ezstart/ui/lib'
import type { UserDashboardTexts } from './types.js'

interface UsageTabProps {
  usage?: { requestsThisMonth: number; quotaLimit: number | null }
  texts: UserDashboardTexts
}

/**
 * Usage tab for `<UserDashboard>`: request count + quota progress bar.
 *
 * @internal
 */
export function UsageTab({ usage, texts }: UsageTabProps) {
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
