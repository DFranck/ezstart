'use client'

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
  Div,
  H3,
  P,
  Select,
  Span,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
} from '@ezstart/ui/components'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Area,
  AreaChart,
  ReferenceLine,
} from 'recharts'
import { callApi } from '@/config/api'

interface TrendingMetricsProps {
  projectId: string
  projectName: string
}

interface HistoryDataPoint {
  status: 'healthy' | 'unhealthy'
  responseTime: number | null
  timestamp: string
}

interface ServiceHistory {
  serviceId: string
  totalChecks: number
  healthyChecks: number
  uptimePercentage: number
  avgResponseTime: number | null
  history: HistoryDataPoint[]
}

interface ProjectHistoryResponse {
  projectId: string
  hours: number
  services: ServiceHistory[]
}

export function TrendingMetrics({ projectId, projectName }: TrendingMetricsProps) {
  const [hours, setHours] = useState<number>(24)

  const { data, isLoading, error } = useQuery<ProjectHistoryResponse>({
    queryKey: ['monitoring', 'project-history', projectId, hours],
    queryFn: async () => {
      const res = await callApi<ProjectHistoryResponse>(`/history/project/${projectId}`, {
        query: { hours: String(hours) },
      })
      if (!res.ok) throw new Error('Failed to fetch project history')
      return res.data
    },
    staleTime: 60000,
    refetchInterval: 300000,
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <H3 size="h5">{projectName} - Trending Metrics</H3>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-96">
          <Spinner variant="fancy" />
        </CardContent>
      </Card>
    )
  }

  if (error || !data || data.services.length === 0) {
    return (
      <Card>
        <CardHeader>
          <H3 size="h5">{projectName} - Trending Metrics</H3>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-96">
          <Div className="text-center space-y-2">
            <P className="text-muted-foreground">No trending data available</P>
            <P className="text-xs text-muted-foreground">
              {error ? 'Failed to load data' : 'No health checks recorded yet'}
            </P>
          </Div>
        </CardContent>
      </Card>
    )
  }

  // Merge all services data by timestamp (rounded to nearest minute for alignment)
  const timeseriesMap = new Map<string, Record<string, unknown>>()

  const roundToMinute = (ts: string) => {
    const d = new Date(ts)
    d.setSeconds(0, 0)
    return d
  }

  data.services.forEach(service => {
    service.history.forEach(point => {
      const rounded = roundToMinute(point.timestamp)
      const key = rounded.toISOString()
      const time = rounded.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })

      if (!timeseriesMap.has(key)) {
        timeseriesMap.set(key, {
          timestamp: time,
          fullTimestamp: rounded.toLocaleString(),
        })
      }

      const entry = timeseriesMap.get(key)!
      const serviceLabel = service.serviceId.replace(`${projectId}-`, '')

      if (point.responseTime !== null) {
        entry[`${serviceLabel}-responseTime`] = point.responseTime
      }
      entry[`${serviceLabel}-status`] = point.status === 'healthy' ? 1 : 0
    })
  })

  const chartData = Array.from(timeseriesMap.values()).sort(
    (a, b) =>
      new Date(a.fullTimestamp as string).getTime() - new Date(b.fullTimestamp as string).getTime()
  )

  const sampledData =
    chartData.length > 60
      ? chartData.filter((_, i) => i % Math.ceil(chartData.length / 60) === 0)
      : chartData

  // Stats
  const overallStats = data.services.reduce(
    (acc, service) => {
      acc.totalChecks += service.totalChecks
      acc.healthyChecks += service.healthyChecks
      if (service.avgResponseTime !== null) {
        acc.totalResponseTime += service.avgResponseTime
        acc.responseTimeCount++
      }
      return acc
    },
    { totalChecks: 0, healthyChecks: 0, totalResponseTime: 0, responseTimeCount: 0 }
  )

  const overallUptime =
    overallStats.totalChecks > 0
      ? ((overallStats.healthyChecks / overallStats.totalChecks) * 100).toFixed(2)
      : '0'

  const avgResponseTime =
    overallStats.responseTimeCount > 0
      ? Math.round(overallStats.totalResponseTime / overallStats.responseTimeCount)
      : null

  const allResponseTimes = data.services
    .flatMap(s => s.history.map(h => h.responseTime))
    .filter((rt): rt is number => rt !== null)
    .sort((a, b) => a - b)

  const p50ResponseTime =
    allResponseTimes.length > 0 ? allResponseTimes[Math.floor(allResponseTimes.length * 0.5)] : null

  const p95ResponseTime =
    allResponseTimes.length > 0
      ? allResponseTimes[Math.floor(allResponseTimes.length * 0.95)]
      : null

  // Explicit hex colors for SVG compatibility
  // (CSS lab()/oklch() theme vars don't work in SVG stroke/fill)
  const COLORS = {
    api: '#6366f1',
    web: '#22c55e',
    p95: '#f97316',
  }

  const responseTimeConfig: ChartConfig = {
    'api-responseTime': { label: 'API Response Time', color: COLORS.api },
    'web-responseTime': { label: 'WEB Response Time', color: COLORS.web },
  }

  const statusConfig: ChartConfig = {
    'api-status': { label: 'API Status', color: COLORS.api },
    'web-status': { label: 'WEB Status', color: COLORS.web },
  }

  return (
    <Card>
      <CardHeader>
        <Div className="flex items-start justify-between">
          <Div>
            <H3 size="h5">{projectName} - Trending Metrics</H3>
            <Div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-sm">
              <P className="text-muted-foreground">
                Overall Uptime:{' '}
                <Span className="font-semibold text-foreground">{overallUptime}%</Span>
              </P>
              <P className="text-muted-foreground">
                Avg Response:{' '}
                <Span className="font-semibold text-foreground">
                  {avgResponseTime ? `${avgResponseTime}ms` : 'N/A'}
                </Span>
              </P>
              <P className="text-muted-foreground">
                p50:{' '}
                <Span className="font-semibold text-foreground">
                  {p50ResponseTime ? `${p50ResponseTime}ms` : 'N/A'}
                </Span>
              </P>
              <P className="text-muted-foreground">
                p95:{' '}
                <Span className="font-semibold text-foreground text-warning">
                  {p95ResponseTime ? `${p95ResponseTime}ms` : 'N/A'}
                </Span>
              </P>
              <P className="text-muted-foreground">
                Total Checks:{' '}
                <Span className="font-semibold text-foreground">{overallStats.totalChecks}</Span>
              </P>
            </Div>
            <Div className="flex gap-2 mt-2">
              <Badge
                variant={
                  Number(overallUptime) >= 99
                    ? 'default'
                    : Number(overallUptime) >= 95
                      ? 'secondary'
                      : 'destructive'
                }
              >
                {hours <= 24 ? '24h' : hours <= 168 ? '7d' : '30d'}: {overallUptime}%
              </Badge>
            </Div>
          </Div>
          <Select value={String(hours)} onValueChange={val => setHours(Number(val))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6">Last 6h</SelectItem>
              <SelectItem value="12">Last 12h</SelectItem>
              <SelectItem value="24">Last 24h</SelectItem>
              <SelectItem value="48">Last 48h</SelectItem>
              <SelectItem value="168">Last 7d</SelectItem>
            </SelectContent>
          </Select>
        </Div>
      </CardHeader>
      <CardContent>
        {sampledData.length === 0 ? (
          <Div className="flex items-center justify-center h-96">
            <P className="text-muted-foreground">No data available for the selected period</P>
          </Div>
        ) : (
          <Div className="space-y-8">
            {/* Response Time Chart */}
            <Div>
              <H3 size="h6" className="mb-4">
                Response Time (ms)
              </H3>
              <ChartContainer config={responseTimeConfig} className="h-[250px] w-full">
                <AreaChart data={sampledData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="timestamp" className="text-xs" />
                  <YAxis
                    yAxisId="api"
                    orientation="left"
                    className="text-xs"
                    stroke={COLORS.api}
                    tickFormatter={v => `${v}ms`}
                  />
                  <YAxis
                    yAxisId="web"
                    orientation="right"
                    className="text-xs"
                    stroke={COLORS.web}
                    tickFormatter={v => `${v}ms`}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => {
                          const serviceName = String(name).replace('-responseTime', '')
                          return [`${value}ms`, serviceName.toUpperCase()]
                        }}
                      />
                    }
                  />
                  <Legend />
                  {data.services.map(service => {
                    const serviceLabel = service.serviceId.replace(`${projectId}-`, '')
                    const color = serviceLabel === 'api' ? COLORS.api : COLORS.web
                    const axisId = serviceLabel === 'api' ? 'api' : 'web'
                    return (
                      <Area
                        key={service.serviceId}
                        yAxisId={axisId}
                        type="monotone"
                        dataKey={`${serviceLabel}-responseTime`}
                        stroke={color}
                        fill={color}
                        fillOpacity={0.15}
                        strokeWidth={2}
                        connectNulls
                        name={`${serviceLabel.toUpperCase()} Response Time`}
                      />
                    )
                  })}
                </AreaChart>
              </ChartContainer>
            </Div>

            {/* Status Chart */}
            <Div>
              <H3 size="h6" className="mb-4">
                Service Availability
              </H3>
              <ChartContainer config={statusConfig} className="h-[200px] w-full">
                <LineChart data={sampledData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="timestamp" className="text-xs" />
                  <YAxis
                    domain={[0, 1]}
                    ticks={[0, 1]}
                    tickFormatter={value => (value === 1 ? 'UP' : 'DOWN')}
                    className="text-xs"
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => {
                          const serviceName = String(name).replace('-status', '')
                          return [Number(value) === 1 ? 'UP' : 'DOWN', serviceName.toUpperCase()]
                        }}
                      />
                    }
                  />
                  <Legend />
                  {data.services.map(service => {
                    const serviceLabel = service.serviceId.replace(`${projectId}-`, '')
                    const color = serviceLabel === 'api' ? COLORS.api : COLORS.web
                    return (
                      <Line
                        key={service.serviceId}
                        type="stepAfter"
                        dataKey={`${serviceLabel}-status`}
                        stroke={color}
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                        name={`${serviceLabel.toUpperCase()} Status`}
                      />
                    )
                  })}
                </LineChart>
              </ChartContainer>
            </Div>
          </Div>
        )}
      </CardContent>
    </Card>
  )
}
