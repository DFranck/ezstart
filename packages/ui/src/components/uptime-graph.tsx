'use client'

import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { cn } from '../lib/utils'

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
  // Transform data for Recharts
  const chartData = data.map((point, index) => ({
    index,
    value: point.status === 'healthy' ? 1 : 0,
    status: point.status,
    responseTime: point.responseTime,
    timestamp: point.timestamp,
  }))

  // Calculate uptime if not provided
  const calculatedUptime =
    uptimePercentage ??
    (data.length > 0
      ? (data.filter(d => d.status === 'healthy').length / data.length) * 100
      : 0)

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
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null

    const data = payload[0].payload
    const timestamp = new Date(data.timestamp)
    const timeStr = timestamp.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
    const dateStr = timestamp.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })

    return (
      <div className="rounded-lg border bg-card p-2 shadow-md">
        <p className="text-xs font-medium text-foreground">
          {data.status === 'healthy' ? '✅ Healthy' : '❌ Unhealthy'}
        </p>
        {data.responseTime && (
          <p className="text-xs text-muted-foreground">{data.responseTime}ms</p>
        )}
        <p className="text-xs text-muted-foreground">
          {dateStr} {timeStr}
        </p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        {showTitle && title && (
          <h4 className="text-sm font-medium text-foreground">{title}</h4>
        )}
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
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="index" hide />
            <YAxis hide domain={[0, 1]} />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Bar dataKey="value" radius={[2, 2, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.status === 'healthy' ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))'}
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
