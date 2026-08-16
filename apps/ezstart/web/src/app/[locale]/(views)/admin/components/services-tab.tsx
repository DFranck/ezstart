'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiCall } from '@ezstart/api-sdk'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Div,
  H2,
  H3,
  P,
  Progress,
  Skeleton,
  Span,
  type BadgeProps,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

// ========================================
// Types (mirrors api-ezstart DTO)
// ========================================

type ProviderHealth = 'healthy' | 'warning' | 'critical' | 'unknown'

interface UsageMetric {
  label: string
  current: number
  limit: number | null
  unit: string
  percentage?: number
}

interface ProviderStatus {
  provider: string
  displayName: string
  plan: string
  monthlyCostEstimate: number
  usage: UsageMetric[]
  status: ProviderHealth
  statusMessage?: string
  lastSync: string
  dashboardUrl: string
  error?: string
}

interface ProviderStatusListResponse {
  providers: ProviderStatus[]
  cacheTtlSeconds: number
  generatedAt: string
}

// ========================================
// Helpers
// ========================================

const QUERY_KEY = ['admin-services'] as const

const STATUS_TO_VARIANT: Record<ProviderHealth, BadgeProps['variant']> = {
  healthy: 'success',
  warning: 'warning',
  critical: 'destructive',
  unknown: 'secondary',
}

async function fetchServices(refresh: boolean): Promise<ProviderStatusListResponse> {
  return apiCall<ProviderStatusListResponse>(`/admin/services${refresh ? '?refresh=true' : ''}`, {
    appName: 'ezstart',
  })
}

function formatNumber(n: number, unit: string): string {
  if (unit === 'USD') return `$${n.toLocaleString()}`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toLocaleString()
}

// ========================================
// Sub-components
// ========================================

function UsageRow({ metric }: { metric: UsageMetric }) {
  const hasLimit = metric.limit !== null
  const pct = metric.percentage ?? 0

  return (
    <Div className="space-y-1">
      <Div className="flex justify-between items-baseline text-sm">
        <Span className="text-muted-foreground">{metric.label}</Span>
        <Span className="font-medium tabular-nums">
          {formatNumber(metric.current, metric.unit)}
          {hasLimit && metric.limit !== null && (
            <Span className="text-muted-foreground">
              {' / '}
              {formatNumber(metric.limit, metric.unit)} {metric.unit}
            </Span>
          )}
          {!hasLimit && <Span className="text-muted-foreground"> {metric.unit}</Span>}
        </Span>
      </Div>
      {hasLimit && <Progress value={pct} />}
    </Div>
  )
}

function ProviderCard({ provider, labels }: { provider: ProviderStatus; labels: Labels }) {
  const variant = STATUS_TO_VARIANT[provider.status]

  return (
    <Card variant="floating" className="flex flex-col">
      <CardHeader>
        <Div className="flex items-start justify-between gap-3">
          <Div>
            <H3 size="h4">{provider.displayName}</H3>
            <P className="text-sm text-muted-foreground">
              {labels.plan}: <Span className="font-medium">{provider.plan}</Span>
            </P>
          </Div>
          <Badge variant={variant} dot>
            {labels.status[provider.status]}
          </Badge>
        </Div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {provider.error && (
          <Div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
            <P className="text-sm font-semibold text-destructive">{labels.error}</P>
            <P className="text-xs text-muted-foreground mt-1 break-words">{provider.error}</P>
          </Div>
        )}

        {provider.statusMessage && !provider.error && (
          <P className="text-sm text-muted-foreground italic">{provider.statusMessage}</P>
        )}

        {provider.usage.length > 0 && (
          <Div className="space-y-3">
            {provider.usage.map(m => (
              <UsageRow key={m.label} metric={m} />
            ))}
          </Div>
        )}

        <Div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
          <Span>
            {labels.monthlyCost}:{' '}
            <Span className="font-medium text-foreground">
              ${provider.monthlyCostEstimate.toLocaleString()}
            </Span>
          </Span>
          <a
            href={provider.dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {labels.openDashboard}
          </a>
        </Div>
      </CardContent>
    </Card>
  )
}

// ========================================
// Labels (i18n)
// ========================================

interface Labels {
  title: string
  subtitle: string
  refresh: string
  refreshing: string
  lastSync: string
  plan: string
  monthlyCost: string
  openDashboard: string
  error: string
  failedToLoad: string
  status: Record<ProviderHealth, string>
}

// ========================================
// Main tab
// ========================================

export function ServicesTab() {
  const t = useTranslations('admin.services')
  const queryClient = useQueryClient()

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchServices(false),
    staleTime: 5 * 60 * 1000,
  })

  const labels: Labels = {
    title: t('title'),
    subtitle: t('subtitle'),
    refresh: t('refresh'),
    refreshing: t('refreshing'),
    lastSync: t('lastSync'),
    plan: t('plan'),
    monthlyCost: t('monthlyCost'),
    openDashboard: t('openDashboard'),
    error: t('error'),
    failedToLoad: t('failedToLoad'),
    status: {
      healthy: t('statusHealthy'),
      warning: t('statusWarning'),
      critical: t('statusCritical'),
      unknown: t('statusUnknown'),
    },
  }

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    // Also bypass server cache once
    await queryClient.fetchQuery({
      queryKey: QUERY_KEY,
      queryFn: () => fetchServices(true),
    })
    refetch()
  }

  const totalMonthly = data?.providers.reduce((s, p) => s + p.monthlyCostEstimate, 0) ?? 0

  return (
    <Div className="mt-4 space-y-6">
      <Div className="flex items-start justify-between gap-4 flex-wrap">
        <Div>
          <H2 size="h3">{labels.title}</H2>
          <P className="text-sm text-muted-foreground mt-1">{labels.subtitle}</P>
          {data && (
            <P className="text-xs text-muted-foreground mt-2">
              {labels.lastSync}: {new Date(data.generatedAt).toLocaleString()} ·{' '}
              {t('totalMonthlyCost')}:{' '}
              <Span className="font-semibold text-foreground">
                ${totalMonthly.toLocaleString()}
              </Span>
            </P>
          )}
        </Div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}>
          {isFetching ? labels.refreshing : labels.refresh}
        </Button>
      </Div>

      {error && (
        <Card variant="floating">
          <CardContent className="py-6 space-y-2">
            <P className="font-semibold text-destructive">{labels.failedToLoad}</P>
            <P className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : String(error)}
            </P>
          </CardContent>
        </Card>
      )}

      {isLoading && !data && (
        <Div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </Div>
      )}

      {data && (
        <Div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.providers.map(p => (
            <ProviderCard key={p.provider} provider={p} labels={labels} />
          ))}
        </Div>
      )}
    </Div>
  )
}
