'use client'

import {
  Card,
  CardContent,
  CardHeader,
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
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
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
    staleTime: 60000, // 1 minute
    refetchInterval: 300000, // 5 minutes
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

  // Merge all services data by timestamp
  const timeseriesMap = new Map<string, any>()

  data.services.forEach(service => {
    service.history.forEach(point => {
      const timestamp = new Date(point.timestamp).toISOString()
      const time = new Date(point.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })

      if (!timeseriesMap.has(timestamp)) {
        timeseriesMap.set(timestamp, {
          timestamp: time,
          fullTimestamp: new Date(point.timestamp).toLocaleString(),
        })
      }

      const entry = timeseriesMap.get(timestamp)!
      const serviceLabel = service.serviceId.replace(`${projectId}-`, '')

      // Add response time
      if (point.responseTime !== null) {
        entry[`${serviceLabel}-responseTime`] = point.responseTime
      }

      // Add status (1 = healthy, 0 = unhealthy)
      entry[`${serviceLabel}-status`] = point.status === 'healthy' ? 1 : 0
    })
  })

  // Convert to array and sort by timestamp
  const chartData = Array.from(timeseriesMap.values()).sort(
    (a, b) => new Date(a.fullTimestamp).getTime() - new Date(b.fullTimestamp).getTime()
  )

  // Sample data if too many points (max 60 points for readability)
  const sampledData =
    chartData.length > 60
      ? chartData.filter((_, i) => i % Math.ceil(chartData.length / 60) === 0)
      : chartData

  // Calculate overall stats
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

  const colors = {
    api: 'hsl(var(--chart-1))',
    web: 'hsl(var(--chart-2))',
    status: 'hsl(var(--chart-3))',
  }

  return (
    <Card>
      <CardHeader>
        <Div className="flex items-start justify-between">
          <Div>
            <H3 size="h5">{projectName} - Trending Metrics</H3>
            <Div className="flex gap-6 mt-2 text-sm">
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
                Total Checks:{' '}
                <Span className="font-semibold text-foreground">{overallStats.totalChecks}</Span>
              </P>
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
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={sampledData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="timestamp"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number, name: string) => {
                      if (name.includes('responseTime')) {
                        const serviceName = name.replace('-responseTime', '')
                        return [`${value}ms`, serviceName.toUpperCase()]
                      }
                      return [value, name]
                    }}
                  />
                  <Legend />
                  {data.services.map((service, index) => {
                    const serviceLabel = service.serviceId.replace(`${projectId}-`, '')
                    return (
                      <Area
                        key={service.serviceId}
                        type="monotone"
                        dataKey={`${serviceLabel}-responseTime`}
                        stroke={index === 0 ? colors.api : colors.web}
                        fill={index === 0 ? colors.api : colors.web}
                        fillOpacity={0.2}
                        strokeWidth={2}
                        name={`${serviceLabel.toUpperCase()} Response Time`}
                      />
                    )
                  })}
                </AreaChart>
              </ResponsiveContainer>
            </Div>

            {/* Status Chart */}
            <Div>
              <H3 size="h6" className="mb-4">
                Service Availability
              </H3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={sampledData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="timestamp"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    domain={[0, 1]}
                    ticks={[0, 1]}
                    tickFormatter={value => (value === 1 ? 'UP' : 'DOWN')}
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number, name: string) => {
                      if (name.includes('status')) {
                        const serviceName = name.replace('-status', '')
                        return [value === 1 ? 'UP' : 'DOWN', serviceName.toUpperCase()]
                      }
                      return [value, name]
                    }}
                  />
                  <Legend />
                  {data.services.map((service, index) => {
                    const serviceLabel = service.serviceId.replace(`${projectId}-`, '')
                    return (
                      <Line
                        key={service.serviceId}
                        type="stepAfter"
                        dataKey={`${serviceLabel}-status`}
                        stroke={index === 0 ? colors.api : colors.web}
                        strokeWidth={2}
                        dot={false}
                        name={`${serviceLabel.toUpperCase()} Status`}
                      />
                    )
                  })}
                </LineChart>
              </ResponsiveContainer>
            </Div>
          </Div>
        )}
      </CardContent>
    </Card>
  )
}
