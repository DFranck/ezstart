'use client'

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
  P,
  Skeleton,
  Spinner,
  type ChartConfig,
} from '@ezstart/ui/components'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { useAdminAnalyticsOverview } from '../../react/admin-analytics.js'
import type { AdminAnalyticsOverview } from '../../core/types.js'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface AdminAnalyticsSectionTexts {
  title?: string
  subtitle?: string

  // Stat cards
  totalUsers?: string
  newUsersThisMonth?: string
  activeUsersLast30Days?: string
  activeUsersHint?: string
  verifiedUsers?: string
  twoFactorEnabled?: string
  totalApplications?: string
  totalApiKeys?: string

  // Chart
  signupTrendTitle?: string
  signupTrendDescription?: string
  signupTrendEmpty?: string
  signupSeriesLabel?: string
  signupAxisLabel?: string

  // Top apps
  topAppsTitle?: string
  topAppsDescription?: string
  topAppsEmpty?: string
  topAppsAppColumn?: string
  topAppsUsersColumn?: string

  // Errors
  loadError?: string
  retry?: string
}

const DEFAULT_TEXTS: Required<AdminAnalyticsSectionTexts> = {
  title: 'Platform analytics',
  subtitle: 'Real-time platform-wide stats. Superadmin only.',
  totalUsers: 'Total users',
  newUsersThisMonth: 'New this month',
  activeUsersLast30Days: 'Active (30d)',
  activeUsersHint: 'Users seen in the last 30 days',
  verifiedUsers: 'Verified',
  twoFactorEnabled: '2FA enabled',
  totalApplications: 'Applications',
  totalApiKeys: 'API keys',
  signupTrendTitle: 'Signups (last 30 days)',
  signupTrendDescription: 'Daily new accounts',
  signupTrendEmpty: 'No signups in the last 30 days.',
  signupSeriesLabel: 'Signups',
  signupAxisLabel: 'Date',
  topAppsTitle: 'Top apps by users',
  topAppsDescription: 'Applications ranked by registered user count.',
  topAppsEmpty: 'No app registrations yet.',
  topAppsAppColumn: 'App',
  topAppsUsersColumn: 'Users',
  loadError: 'Failed to load analytics.',
  retry: 'Retry',
}

export interface AdminAnalyticsSectionProps {
  className?: string
  texts?: Partial<AdminAnalyticsSectionTexts>
  /**
   * Override the EZAuth API base URL. Required for federated admin
   * (Tier 3 hub embedding the SDK cross-origin).
   */
  apiUrl?: string
  /**
   * Bearer token override. Required when the local store token is not the
   * platform-wide superadmin JWT.
   */
  authToken?: string | (() => string | Promise<string>)
  /** Auto-refresh interval (ms). `0` = no polling (default). */
  refetchIntervalMs?: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format short month/day label for the X axis (e.g. `Apr 12`). */
function shortDateLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(d)
}

/** Compact percent display: 12.5 → `12.5%`. */
function pctLabel(value: number): string {
  return `${value.toFixed(1)}%`
}

/** Trend variant for percent-style stats — green when positive, neutral otherwise. */
function pctTrendVariant(value: number, threshold = 0): 'success' | 'default' {
  return value > threshold ? 'success' : 'default'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Platform analytics dashboard section for the superadmin admin page.
 *
 * Renders a responsive grid of stat cards (totals + percentages), a 30-day
 * signup trend area chart, and a top-5 apps table — all driven by a single
 * `GET /admin/analytics/overview` call.
 *
 * @example Standalone (uses surrounding AuthProvider)
 * ```tsx
 * <AdminAnalyticsSection />
 * ```
 *
 * @example Federated admin (Tier 3 hub embedding cross-origin)
 * ```tsx
 * <AdminAnalyticsSection
 *   apiUrl="https://auth.example.com"
 *   authToken={() => superadminJwt}
 * />
 * ```
 */
export function AdminAnalyticsSection({
  className,
  texts,
  apiUrl,
  authToken,
  refetchIntervalMs = 0,
}: AdminAnalyticsSectionProps) {
  const t: Required<AdminAnalyticsSectionTexts> = { ...DEFAULT_TEXTS, ...texts }
  const { data, isLoading, isError, refetch } = useAdminAnalyticsOverview({
    apiUrl,
    authToken,
    refetchIntervalMs,
  })

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

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

interface StatsGridProps {
  loading: boolean
  data: AdminAnalyticsOverview | undefined
  t: Required<AdminAnalyticsSectionTexts>
}

function StatsGrid({ loading, data, t }: StatsGridProps) {
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

interface SignupTrendChartProps {
  loading: boolean
  data: AdminAnalyticsOverview | undefined
  t: Required<AdminAnalyticsSectionTexts>
}

function SignupTrendChart({ loading, data, t }: SignupTrendChartProps) {
  if (loading || !data) {
    return (
      <Div className="flex items-center justify-center h-[260px]">
        <Spinner size="md" />
      </Div>
    )
  }

  const totalSignups = data.signupTrend.reduce((sum, p) => sum + p.count, 0)
  if (totalSignups === 0) {
    return (
      <Div className="flex items-center justify-center h-[260px]">
        <P className="text-sm text-muted-foreground">{t.signupTrendEmpty}</P>
      </Div>
    )
  }

  const chartData = data.signupTrend.map(p => ({
    date: p.date,
    label: shortDateLabel(p.date),
    signups: p.count,
  }))

  const chartConfig = {
    signups: {
      label: t.signupSeriesLabel,
      // Use semantic CSS var resolved at runtime — stays consistent with theme.
      color: 'var(--primary)',
    },
  } satisfies ChartConfig

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="signupGradient" x1="0" y1="0" x2="0" y2="1">
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
          dataKey="signups"
          type="monotone"
          stroke="var(--primary)"
          strokeWidth={2}
          fill="url(#signupGradient)"
        />
      </AreaChart>
    </ChartContainer>
  )
}

interface TopAppsTableProps {
  loading: boolean
  data: AdminAnalyticsOverview | undefined
  t: Required<AdminAnalyticsSectionTexts>
}

function TopAppsTable({ loading, data, t }: TopAppsTableProps) {
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

function ErrorState({ text, retryLabel, onRetry }: ErrorStateProps) {
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
