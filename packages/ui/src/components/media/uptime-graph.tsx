'use client'

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { cn } from '../../lib/utils'

export interface UptimeDataPoint {
  status: 'healthy' | 'unhealthy'
  responseTime: number | null
  timestamp: Date
}

export interface UptimeGraphProps {
  /**
   * Health check history data
   */
  data: UptimeDataPoint[]
  /**
   * Title of the graph (e.g., "API" or "Web")
   */
  title?: string
  /**
   * Overall uptime percentage
   */
  uptimePercentage?: number
  /**
   * Height of the graph in pixels
   */
  height?: number
  /**
   * Additional CSS classes
   */
  className?: string
  /**
   * Show uptime percentage badge
   */
  showPercentage?: boolean
  /**
   * Show title
   */
  showTitle?: boolean
}

/**
 * UptimeGraph - UptimeRobot-style uptime visualization
 *
 * Displays a bar chart showing health check history with green (healthy) and red (unhealthy) bars.
 * Includes uptime percentage badge and responsive design.
 *
 * @example
 * ```tsx
 * <UptimeGraph
 *   data={healthCheckHistory}
 *   title="API"
 *   uptimePercentage={98.5}
 *   height={80}
 * />
 * ```
 */
export function UptimeGraph({
  data,
  title,
  uptimePercentage,
  height = 80,
  className,
  showPercentage = true,
  showTitle = true,
}: UptimeGraphProps) {
  // Aggregate data into groups for better readability
  // Dynamic grouping based on data density
  // - If we have lots of data (>100 checks), group by 6 to get ~48 bars
  // - If we have sparse data (<100 checks), show all bars individually
  const aggregateData = (rawData: UptimeDataPoint[], groupSize?: number) => {
    // Auto-calculate groupSize based on data density
    if (!groupSize) {
      if (rawData.length > 100) {
        groupSize = Math.ceil(rawData.length / 60) // Target ~60 bars max
      } else {
        groupSize = 1 // Show all bars for sparse data
      }
    }
    const aggregated: Array<{
      index: number
      value: number
      status: 'healthy' | 'unhealthy'
      responseTime: number | null
      timestamp: Date
      healthyCount: number
      totalCount: number
    }> = []

    for (let i = 0; i < rawData.length; i += groupSize) {
      const group = rawData.slice(i, i + groupSize)
      const healthyCount = group.filter(p => p.status === 'healthy').length
      const totalCount = group.length
      const avgResponseTime =
        group
          .filter(p => p.responseTime !== null)
          .reduce((sum, p) => sum + (p.responseTime || 0), 0) / healthyCount || null

      aggregated.push({
        index: i / groupSize,
        value: 1, // Always 1 for uniform bar height
        status: healthyCount === totalCount ? 'healthy' : 'unhealthy', // Red if ANY failure
        responseTime: avgResponseTime,
        timestamp: group[0]?.timestamp || new Date(), // Use first timestamp of group
        healthyCount,
        totalCount,
      })
    }

    return aggregated
  }

  // Transform data for Recharts (auto-aggregate based on density)
  const chartData = aggregateData(data)

  // Calculate uptime if not provided
  const calculatedUptime =
    uptimePercentage ??
    (data.length > 0 ? (data.filter(d => d.status === 'healthy').length / data.length) * 100 : 0)

  // Determine color based on uptime percentage
  const getUptimeColor = (uptime: number) => {
    if (uptime >= 99) return 'text-green-600 dark:text-green-400'
    if (uptime >= 95) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getUptimeBgColor = (uptime: number) => {
    if (uptime >= 99) return 'bg-green-100 dark:bg-green-950'
    if (uptime >= 95) return 'bg-yellow-100 dark:bg-yellow-950'
    return 'bg-red-100 dark:bg-red-950'
  }

  // Custom tooltip
  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean
    payload?: Array<{
      payload: {
        timestamp: string
        uptime: number
        responseTime: number
        healthyCount: number
        totalCount: number
        status: string
      }
    }>
  }) => {
    if (!active || !payload || !payload.length) return null

    const data = payload[0]!.payload
    const timestamp = new Date(data.timestamp)
    const timeStr = timestamp.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
    const dateStr = timestamp.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })

    const uptimeInGroup = ((data.healthyCount / data.totalCount) * 100).toFixed(0)

    return (
      <div className="rounded-lg border bg-card p-2 shadow-md">
        <p className="text-xs font-medium text-foreground">
          {data.status === 'healthy' ? '✅ Healthy' : '❌ Issues'}
        </p>
        <p className="text-xs text-muted-foreground">
          {data.healthyCount}/{data.totalCount} checks ({uptimeInGroup}%)
        </p>
        {data.responseTime && (
          <p className="text-xs text-muted-foreground">~{Math.round(data.responseTime)}ms avg</p>
        )}
        <p className="text-xs text-muted-foreground">
          {dateStr} {timeStr}
        </p>
      </div>
    )
  }

  return (
    <div className={cn('', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        {showTitle && title && <h4 className="text-sm font-medium text-foreground">{title}</h4>}
        {showPercentage && (
          <div
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-semibold',
              getUptimeBgColor(calculatedUptime),
              getUptimeColor(calculatedUptime)
            )}
          >
            {calculatedUptime.toFixed(1)}% uptime
          </div>
        )}
      </div>

      {/* Chart */}
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={chartData}
            margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
            barCategoryGap={1.5}
            barGap={1}
          >
            <XAxis dataKey="index" hide />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Bar dataKey="value" radius={[3, 3, 3, 3]} maxBarSize={6}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.status === 'healthy' ? '#22c55e' : '#ef4444'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div
          className="flex items-center justify-center rounded-lg border border-dashed bg-muted/50"
          style={{ height }}
        >
          <p className="text-xs text-muted-foreground">No data available</p>
        </div>
      )}
    </div>
  )
}
