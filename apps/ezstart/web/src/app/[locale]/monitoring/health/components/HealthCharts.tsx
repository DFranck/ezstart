'use client'

import {
  Card,
  CardContent,
  CardHeader,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
  Div,
  H2,
  H3,
  P,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ezstart/ui/components'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts'
import { callApi } from '@/config/api'

export type HealthChartsPeriod = '7d' | '30d'

export interface HealthAggregateBucket {
  timestamp: string
  p95: number | null
  uptimePercent: number
  totalChecks: number
  healthyChecks: number
  unhealthyChecks: number
}

export interface HealthAggregateServiceStats {
  serviceId: string
  totalChecks: number
  errorCount: number
  errorRate: number
}

export interface HealthAggregateResponse {
  period: HealthChartsPeriod
  bucketUnit: 'hour' | 'day'
  buckets: HealthAggregateBucket[]
  services: HealthAggregateServiceStats[]
}

interface HealthChartsProps {
  /** Optional initial period (defaults to '7d'). */
  defaultPeriod?: HealthChartsPeriod
  /** Optional data override — when provided, skips the network fetch (for tests/Storybook). */
  data?: HealthAggregateResponse
}

const CHART_COLORS = {
  latency: 'var(--color-chart-1)',
  uptime: 'var(--color-chart-2)',
  errorRate: 'var(--color-destructive)',
} as const

function formatBucketLabel(timestamp: string, unit: 'hour' | 'day'): string {
  const d = new Date(timestamp)
  if (unit === 'day') {
    return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' })
  }
  return d.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
  })
}

export function HealthCharts({ defaultPeriod = '7d', data: externalData }: HealthChartsProps) {
  const t = useTranslations('monitoring.charts')
  const [period, setPeriod] = useState<HealthChartsPeriod>(defaultPeriod)

  const { data, isLoading, error } = useQuery<HealthAggregateResponse>({
    queryKey: ['monitoring', 'aggregate', period],
    queryFn: () =>
      callApi<HealthAggregateResponse>('/history/aggregate', {
        query: { period },
      }),
    enabled: externalData === undefined,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })

  const response = externalData ?? data

  const latencyConfig: ChartConfig = {
    p95: { label: t('latency.title'), color: CHART_COLORS.latency },
  }
  const uptimeConfig: ChartConfig = {
    uptimePercent: { label: t('uptime.title'), color: CHART_COLORS.uptime },
  }
  const errorRateConfig: ChartConfig = {
    errorRate: { label: t('errorRate.title'), color: CHART_COLORS.errorRate },
  }

  const bucketUnit = response?.bucketUnit ?? (period === '30d' ? 'day' : 'hour')
  const chartData =
    response?.buckets.map(b => ({
      ...b,
      label: formatBucketLabel(b.timestamp, bucketUnit),
    })) ?? []

  const servicesData = response?.services ?? []

  return (
    <Card>
      <CardHeader>
        <Div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <Div>
            <H2 size="h4">{t('title')}</H2>
            <P className="text-muted-foreground text-sm">{t('description')}</P>
          </Div>
          <Tabs value={period} onValueChange={value => setPeriod(value as HealthChartsPeriod)}>
            <TabsList>
              <TabsTrigger value="7d">{t('period.7d')}</TabsTrigger>
              <TabsTrigger value="30d">{t('period.30d')}</TabsTrigger>
            </TabsList>
            <TabsContent value="7d" />
            <TabsContent value="30d" />
          </Tabs>
        </Div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Div className="space-y-6" data-testid="health-charts-loading">
            <Skeleton className="h-[220px] w-full" />
            <Skeleton className="h-[220px] w-full" />
            <Skeleton className="h-[220px] w-full" />
          </Div>
        ) : error ? (
          <Div className="flex h-64 items-center justify-center">
            <P className="text-destructive">{t('error')}</P>
          </Div>
        ) : chartData.length === 0 ? (
          <Div className="flex h-64 items-center justify-center" data-testid="health-charts-empty">
            <P className="text-muted-foreground">{t('empty')}</P>
          </Div>
        ) : (
          <Div className="space-y-8" data-testid="health-charts-content">
            {/* Latency p95 */}
            <Div>
              <H3 size="h6" className="mb-2">
                {t('latency.title')}
              </H3>
              <P className="text-muted-foreground text-xs mb-3">{t('latency.description')}</P>
              <ChartContainer config={latencyConfig} className="h-[240px] w-full">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" className="text-xs" />
                  <YAxis
                    className="text-xs"
                    tickFormatter={value => `${value}${t('latency.yLabel')}`}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => [
                          `${value}${t('latency.yLabel')}`,
                          String(name),
                        ]}
                      />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="p95"
                    stroke={CHART_COLORS.latency}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                    name={t('latency.title')}
                  />
                </LineChart>
              </ChartContainer>
            </Div>

            {/* Uptime % */}
            <Div>
              <H3 size="h6" className="mb-2">
                {t('uptime.title')}
              </H3>
              <P className="text-muted-foreground text-xs mb-3">{t('uptime.description')}</P>
              <ChartContainer config={uptimeConfig} className="h-[240px] w-full">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" className="text-xs" />
                  <YAxis
                    domain={[0, 100]}
                    className="text-xs"
                    tickFormatter={value => `${value}${t('uptime.yLabel')}`}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => [`${value}${t('uptime.yLabel')}`, String(name)]}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="uptimePercent"
                    stroke={CHART_COLORS.uptime}
                    fill={CHART_COLORS.uptime}
                    fillOpacity={0.2}
                    strokeWidth={2}
                    name={t('uptime.title')}
                  />
                </AreaChart>
              </ChartContainer>
            </Div>

            {/* Error rate per service */}
            <Div>
              <H3 size="h6" className="mb-2">
                {t('errorRate.title')}
              </H3>
              <P className="text-muted-foreground text-xs mb-3">{t('errorRate.description')}</P>
              {servicesData.length === 0 ? (
                <Div className="flex h-32 items-center justify-center">
                  <P className="text-muted-foreground">{t('empty')}</P>
                </Div>
              ) : (
                <ChartContainer config={errorRateConfig} className="h-[280px] w-full">
                  <BarChart data={servicesData} layout="vertical" margin={{ left: 16, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      className="text-xs"
                      tickFormatter={value => `${value}${t('errorRate.yLabel')}`}
                    />
                    <YAxis dataKey="serviceId" type="category" width={140} className="text-xs" />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name) => [
                            `${value}${t('errorRate.yLabel')}`,
                            String(name),
                          ]}
                        />
                      }
                    />
                    <Bar
                      dataKey="errorRate"
                      fill={CHART_COLORS.errorRate}
                      radius={[0, 4, 4, 0]}
                      name={t('errorRate.title')}
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </Div>
          </Div>
        )}
      </CardContent>
    </Card>
  )
}
