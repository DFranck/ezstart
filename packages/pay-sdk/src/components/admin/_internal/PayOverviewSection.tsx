'use client'

/**
 * Platform analytics overview for the PayAdminDashboard.
 *
 * Auto-scoped server-side via JWT — superadmin sees the entire platform,
 * app-owner sees their owned apps, regular user sees only their own records.
 *
 * Hits `GET /admin/analytics/overview` on the ezpay API. When the endpoint
 * returns 404 (Wave 1A not yet shipped), renders a friendly placeholder.
 *
 * @internal
 */
import { useCallback, useEffect, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  Div,
  H3,
  Icon,
  P,
  Skeleton,
  Spinner,
  type ChartConfig,
} from '@ezstart/ui/components'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { formatCurrency } from '../../../core/format-currency.js'
import { usePayContext } from '../../../react/pay-provider.js'
import type { PayAnalyticsOverview, PayOverviewSectionTexts } from './types.js'
import { shortDateLabel } from './helpers.js'

export const DEFAULT_OVERVIEW_TEXTS: Required<PayOverviewSectionTexts> = {
  title: 'Platform analytics',
  subtitle: 'Real-time payment + subscription stats. Auto-scoped to your role.',
  totalRevenue: 'Total Revenue',
  totalPayments: 'Total Payments',
  completedPayments: 'Completed',
  failedPayments: 'Failed',
  refundedPayments: 'Refunded',
  activeSubscriptions: 'Active Subscriptions',
  mrr: 'Monthly Recurring Revenue',
  revenueTrendTitle: 'Revenue (last 30 days)',
  revenueTrendDescription: 'Daily completed payment volume.',
  revenueTrendEmpty: 'No revenue in the last 30 days.',
  revenueSeriesLabel: 'Revenue',
  topAppsTitle: 'Top apps by revenue',
  topAppsDescription: 'Applications ranked by completed payment total.',
  topAppsEmpty: 'No revenue recorded yet.',
  topAppsAppColumn: 'App',
  topAppsRevenueColumn: 'Revenue',
  loadError: 'Failed to load analytics.',
  comingSoon: 'Analytics coming soon',
  comingSoonDescription:
    'The platform analytics overview endpoint is not yet available on this API. Live data will appear here once it ships.',
  retry: 'Retry',
}

interface PayOverviewSectionProps {
  className?: string
  texts: Required<PayOverviewSectionTexts>
  /** Auto-refresh interval (ms). `0` disables polling (default). */
  refetchIntervalMs?: number
}

type FetchState =
  | { status: 'loading' }
  | { status: 'success'; data: PayAnalyticsOverview }
  | { status: 'error'; error: string }
  | { status: 'not-implemented' }

export function PayOverviewSection({
  className,
  texts: t,
  refetchIntervalMs = 0,
}: PayOverviewSectionProps) {
  const { client } = usePayContext()
  const [state, setState] = useState<FetchState>({ status: 'loading' })

  const fetchOverview = useCallback(() => {
    setState({ status: 'loading' })
    const apiUrl = client.config.apiUrl
    if (!apiUrl) {
      setState({ status: 'error', error: t.loadError })
      return
    }

    client
      .fetchWithAuth(`${apiUrl}/api/admin/analytics/overview`, {
        method: 'GET',
        headers: client.getHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
      })
      .then(async response => {
        if (response.status === 404) {
          setState({ status: 'not-implemented' })
          return
        }
        if (!response.ok) {
          setState({ status: 'error', error: t.loadError })
          return
        }
        const json = (await response.json()) as unknown
        // Accept both raw payload and the standard `{ success, data }` envelope
        const data = unwrapEnvelope(json)
        if (!data) {
          setState({ status: 'error', error: t.loadError })
          return
        }
        setState({ status: 'success', data })
      })
      .catch(() => {
        setState({ status: 'error', error: t.loadError })
      })
  }, [client, t.loadError])

  useEffect(() => {
    fetchOverview()
    if (refetchIntervalMs > 0) {
      const id = setInterval(fetchOverview, refetchIntervalMs)
      return () => clearInterval(id)
    }
    return undefined
  }, [fetchOverview, refetchIntervalMs])

  return (
    <Div className={className}>
      <Div className="space-y-4">
        <Div className="space-y-1">
          <H3 size="h4">{t.title}</H3>
          <P className="text-sm text-muted-foreground">{t.subtitle}</P>
        </Div>

        {state.status === 'not-implemented' && <ComingSoonState t={t} />}

        {state.status === 'error' && (
          <ErrorState text={state.error} retryLabel={t.retry} onRetry={fetchOverview} />
        )}

        {(state.status === 'loading' || state.status === 'success') && (
          <>
            <StatsGrid
              loading={state.status === 'loading'}
              data={state.status === 'success' ? state.data : undefined}
              t={t}
            />

            <Div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card variant="floating" className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>{t.revenueTrendTitle}</CardTitle>
                  <CardDescription>{t.revenueTrendDescription}</CardDescription>
                </CardHeader>
                <CardContent>
                  <RevenueTrendChart
                    loading={state.status === 'loading'}
                    data={state.status === 'success' ? state.data : undefined}
                    t={t}
                  />
                </CardContent>
              </Card>

              <Card variant="floating">
                <CardHeader>
                  <CardTitle>{t.topAppsTitle}</CardTitle>
                  <CardDescription>{t.topAppsDescription}</CardDescription>
                </CardHeader>
                <CardContent>
                  <TopAppsTable
                    loading={state.status === 'loading'}
                    data={state.status === 'success' ? state.data : undefined}
                    t={t}
                  />
                </CardContent>
              </Card>
            </Div>
          </>
        )}
      </Div>
    </Div>
  )
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

interface SubProps {
  loading: boolean
  data: PayAnalyticsOverview | undefined
  t: Required<PayOverviewSectionTexts>
}

function StatsGrid({ loading, data, t }: SubProps) {
  if (loading || !data) {
    return (
      <Div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-7 w-16" />
          </Card>
        ))}
      </Div>
    )
  }

  const revenueDisplay = formatRevenueByCurrency(data.revenueByCurrency)
  const mrrDisplay = formatRevenueByCurrency(data.mrrByCurrency)
  const totalPayments = safeCount(data.totalPayments)
  const completedPayments = safeCount(data.completedPayments)
  const failedPayments = safeCount(data.failedPayments)
  const activeSubscriptions = safeCount(data.activeSubscriptions)

  return (
    <Div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <SimpleStatCard label={t.totalRevenue} value={revenueDisplay} />
      <SimpleStatCard label={t.totalPayments} value={totalPayments} />
      <SimpleStatCard
        label={t.completedPayments}
        value={completedPayments}
        trendBadge={
          completedPayments > 0 ? (
            <Badge variant="success" size="xs">
              {completedPayments}
            </Badge>
          ) : undefined
        }
      />
      <SimpleStatCard label={t.failedPayments} value={failedPayments} />
      <SimpleStatCard label={t.activeSubscriptions} value={activeSubscriptions} />
      <SimpleStatCard label={t.mrr} value={mrrDisplay} />
    </Div>
  )
}

interface SimpleStatCardProps {
  label: string
  value: string | number
  trendBadge?: React.ReactNode
}

function SimpleStatCard({ label, value, trendBadge }: SimpleStatCardProps) {
  return (
    <Card className="p-4">
      <Div className="flex items-start justify-between gap-2">
        <P className="text-sm text-muted-foreground">{label}</P>
        {trendBadge}
      </Div>
      <P className="text-2xl font-bold mt-1 truncate" title={String(value)}>
        {value}
      </P>
    </Card>
  )
}

function RevenueTrendChart({ loading, data, t }: SubProps) {
  if (loading || !data) {
    return (
      <Div className="flex items-center justify-center h-[260px]">
        <Spinner size="md" />
      </Div>
    )
  }

  const total = data.revenueTrend.reduce((sum, p) => sum + safeAmount(p.total), 0)
  if (total === 0) {
    return (
      <Div className="flex items-center justify-center h-[260px]">
        <P className="text-sm text-muted-foreground">{t.revenueTrendEmpty}</P>
      </Div>
    )
  }

  const chartData = data.revenueTrend.map(p => ({
    date: p.date,
    label: shortDateLabel(p.date),
    revenue: safeAmount(p.total),
  }))

  const chartConfig = {
    revenue: {
      label: t.revenueSeriesLabel,
      color: 'var(--primary)',
    },
  } satisfies ChartConfig

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="payRevenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          className="text-muted-foreground"
          fontSize={11}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          className="text-muted-foreground"
          fontSize={11}
          allowDecimals={false}
          width={32}
        />
        <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
        <Area
          dataKey="revenue"
          type="monotone"
          stroke="var(--primary)"
          strokeWidth={2}
          fill="url(#payRevenueGradient)"
        />
      </AreaChart>
    </ChartContainer>
  )
}

function TopAppsTable({ loading, data, t }: SubProps) {
  if (loading || !data) {
    return (
      <Div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </Div>
    )
  }

  if (data.topAppsByRevenue.length === 0) {
    return (
      <Div className="flex items-center justify-center h-[200px]">
        <P className="text-sm text-muted-foreground">{t.topAppsEmpty}</P>
      </Div>
    )
  }

  // Defensive: coerce per-row amounts so the formatter never receives NaN /
  // undefined / null. Backend should always send a number, but a stale
  // deployment / mismatched API contract would otherwise render `NaN €` cells.
  const safeRows = data.topAppsByRevenue.map(app => ({
    ...app,
    total: safeAmount(app.total),
    currency: app.currency || 'EUR',
  }))
  const max = Math.max(...safeRows.map(a => a.total), 1)

  return (
    <Div className="space-y-2">
      <Div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <P className="text-xs text-muted-foreground">{t.topAppsAppColumn}</P>
        <P className="text-xs text-muted-foreground">{t.topAppsRevenueColumn}</P>
      </Div>
      {safeRows.map(app => {
        const widthPct = Math.max(4, Math.round((app.total / max) * 100))
        return (
          <Div key={app.appName} className="space-y-1">
            <Div className="flex items-center justify-between gap-2">
              <P className="text-sm font-medium truncate">{app.appName}</P>
              <Badge variant="secondary" size="xs">
                {formatCurrency(app.total, app.currency)}
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

function ErrorState({
  text,
  retryLabel,
  onRetry,
}: {
  text: string
  retryLabel: string
  onRetry: () => void
}) {
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

function ComingSoonState({ t }: { t: Required<PayOverviewSectionTexts> }) {
  return (
    <Card className="p-8">
      <Div className="flex flex-col items-center justify-center text-center gap-3">
        <Icon name="lucide:BarChart3" className="w-10 h-10 text-muted-foreground/40" />
        <P className="text-base font-medium">{t.comingSoon}</P>
        <P className="text-sm text-muted-foreground max-w-md">{t.comingSoonDescription}</P>
      </Div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Coerce any value to a finite non-negative integer count. Returns 0 for
 * undefined / null / NaN / negative inputs. Defends rendering against API
 * shape drift or in-flight schema migrations.
 *
 * @internal
 */
export function safeCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 0
  return Math.trunc(value)
}

/**
 * Coerce any value to a finite number suitable for `formatCurrency()`.
 * Returns 0 for undefined / null / NaN / non-numeric inputs. The formatter
 * uses `Intl.NumberFormat` which renders `NaN` as `"NaN €"` — exactly the
 * bug PAY-OVERVIEW-001 surfaced.
 *
 * @internal
 */
export function safeAmount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return value
}

function formatRevenueByCurrency(entries: { currency: string; total: number }[]): string {
  if (!entries || entries.length === 0) return formatCurrency(0)
  return entries.map(e => formatCurrency(safeAmount(e.total), e.currency || 'EUR')).join(' | ')
}

/**
 * Unwrap `{ success, data }` envelopes returned by the api-core handlers.
 * Returns the raw payload when the response is unwrapped already, or `null`
 * when the shape is unrecognized.
 */
function unwrapEnvelope(value: unknown): PayAnalyticsOverview | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  if (v.success === true && v.data && typeof v.data === 'object') {
    return v.data as PayAnalyticsOverview
  }
  // Heuristic: looks like the raw payload
  if ('totalPayments' in v) {
    return v as unknown as PayAnalyticsOverview
  }
  return null
}
