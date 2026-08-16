'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Div,
  H3,
  P,
} from '@ezstart/ui/components'
import { useAdminAnalyticsOverview } from '../../../react/admin-analytics.js'
import {
  type AuthOverviewSectionProps,
  type AuthOverviewSectionTexts,
  DEFAULT_OVERVIEW_TEXTS,
} from './overview/texts.js'
import { ErrorState, TopAppsTable } from './overview/TopAppsTable.js'
import { SignupTrendChart } from './overview/SignupTrendChart.js'
import { StatsGrid } from './overview/StatsGrid.js'

export {
  type AuthOverviewSectionProps,
  type AuthOverviewSectionTexts,
  DEFAULT_OVERVIEW_TEXTS,
} from './overview/texts.js'

/**
 * Internal overview section embedded in `<AuthAdminDashboard>`.
 *
 * Renders a responsive grid of stat cards (totals + percentages), a 30-day
 * signup trend area chart, and a top-5 apps table — all driven by a single
 * `GET /admin/analytics/overview` call (auto-scoped via JWT).
 *
 * @internal
 */
export function AuthOverviewSection({ className, texts }: AuthOverviewSectionProps) {
  const t: Required<AuthOverviewSectionTexts> = { ...DEFAULT_OVERVIEW_TEXTS, ...texts }
  const { data, isLoading, isError, refetch } = useAdminAnalyticsOverview()

  return (
    <Div className={className}>
      <Div className="space-y-4">
        <Div className="space-y-1">
          <H3 size="h4">{t.title}</H3>
          <P className="text-sm text-muted-foreground">{t.subtitle}</P>
        </Div>

        {isError && (
          <ErrorState text={t.loadError} retryLabel={t.retry} onRetry={() => refetch()} />
        )}

        {!isError && (
          <>
            <StatsGrid loading={isLoading} data={data} t={t} />

            <Div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card variant="floating" className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>{t.signupTrendTitle}</CardTitle>
                  <CardDescription>{t.signupTrendDescription}</CardDescription>
                </CardHeader>
                <CardContent>
                  <SignupTrendChart loading={isLoading} data={data} t={t} />
                </CardContent>
              </Card>

              <Card variant="floating">
                <CardHeader>
                  <CardTitle>{t.topAppsTitle}</CardTitle>
                  <CardDescription>{t.topAppsDescription}</CardDescription>
                </CardHeader>
                <CardContent>
                  <TopAppsTable loading={isLoading} data={data} t={t} />
                </CardContent>
              </Card>
            </Div>
          </>
        )}
      </Div>
    </Div>
  )
}
