'use client'

import { Card, CardContent, CardHeader, Div, H3, P, Span, Spinner } from '@ezstart/ui/components'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { callApi } from '@/config/api'

interface TrendingGraphProps {
  serviceId: string
  title?: string
  hours?: number
}

interface HistoryDataPoint {
  status: 'healthy' | 'unhealthy'
  responseTime: number | null
  timestamp: string
  error?: string
}

interface HistoryResponse {
  serviceId: string
  hours: number
  totalChecks: number
  healthyChecks: number
  uptimePercentage: number
  avgResponseTime: number | null
  history: HistoryDataPoint[]
}

export function TrendingGraph({ serviceId, title, hours = 24 }: TrendingGraphProps) {
  const { data, isLoading, error } = useQuery<HistoryResponse>({
    queryKey: ['monitoring', 'history', serviceId, hours],
    queryFn: async () => {
      const res = await callApi<HistoryResponse>(`/history/${serviceId}`, {
        query: { hours: String(hours) },
      })
      if (!res.ok) throw new Error('Failed to fetch history')
      return res.data
    },
    staleTime: 60000, // 1 minute
    refetchInterval: 300000, // 5 minutes
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <H3 size="h5">{title || `${serviceId} - Trending`}</H3>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <Spinner variant="fancy" />
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <H3 size="h5">{title || `${serviceId} - Trending`}</H3>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <P className="text-muted-foreground">Unable to load trending data</P>
        </CardContent>
      </Card>
    )
  }

  // Transform data for Recharts
  const chartData = data.history.map(point => ({
    timestamp: new Date(point.timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    fullTimestamp: new Date(point.timestamp).toLocaleString(),
    responseTime: point.responseTime || 0,
    status: point.status === 'healthy' ? 1 : 0,
  }))

  // Sample data if too many points (max 48 points for readability)
  const sampledData =
    chartData.length > 48
      ? chartData.filter((_, i) => i % Math.ceil(chartData.length / 48) === 0)
      : chartData

  return (
    <Card>
      <CardHeader>
        <H3 size="h5">{title || `${serviceId} - Last ${hours}h`}</H3>
        <Div className="flex gap-4 text-sm">
          <P className="text-muted-foreground">
            Uptime: <Span className="font-semibold text-foreground">{data.uptimePercentage}%</Span>
          </P>
          <P className="text-muted-foreground">
            Avg Response:{' '}
            <Span className="font-semibold text-foreground">
              {data.avgResponseTime ? `${data.avgResponseTime}ms` : 'N/A'}
            </Span>
          </P>
          <P className="text-muted-foreground">
            Checks: <Span className="font-semibold text-foreground">{data.totalChecks}</Span>
          </P>
        </Div>
      </CardHeader>
      <CardContent>
        {sampledData.length === 0 ? (
          <Div className="flex items-center justify-center h-64">
            <P className="text-muted-foreground">No data available for the selected period</P>
          </Div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={sampledData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="timestamp"
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                yAxisId="left"
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                label={{ value: 'Response Time (ms)', angle: -90, position: 'insideLeft' }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 1]}
                ticks={[0, 1]}
                tickFormatter={value => (value === 1 ? 'Healthy' : 'Down')}
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
                formatter={(value: any, name: string) => {
                  if (name === 'responseTime') return [`${value}ms`, 'Response Time']
                  if (name === 'status') return [value === 1 ? 'Healthy' : 'Down', 'Status']
                  return [value, name]
                }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="responseTime"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                name="Response Time"
              />
              <Line
                yAxisId="right"
                type="stepAfter"
                dataKey="status"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                dot={false}
                name="Status"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
