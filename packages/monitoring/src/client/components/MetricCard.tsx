'use client'

import { Card, CardContent, Div, H3, P, Span } from '@ezstart/ui/components'

export interface MetricCardProps {
  /** Card title */
  title: string
  /** Primary value to display */
  value: string | number
  /** Secondary text below value */
  subtitle?: string
  /** Emoji or icon string */
  icon?: string
  /** Trend indicator */
  trend?: {
    value: number
    direction: 'up' | 'down'
  }
}

export function MetricCard({ title, value, subtitle, icon, trend }: MetricCardProps) {
  const getTrendColor = () => {
    if (!trend) return ''
    return trend.direction === 'up' ? 'text-status-healthy' : 'text-status-unhealthy'
  }

  const getTrendIcon = () => {
    if (!trend) return null
    return trend.direction === 'up' ? '\u2191' : '\u2193'
  }

  return (
    <Card variant="floating" className="hover:border-primary/50 transition-colors">
      <CardContent>
        <Div layout={'center'}>
          <P className="text-sm text-muted-foreground">{title}</P>
          <Div className="flex items-baseline gap-2">
            {icon && <Span className="text-2xl">{icon}</Span>}
            <H3 size="h2" className="font-bold">
              {value}
            </H3>
          </Div>
          {subtitle && <P className="text-xs text-muted-foreground">{subtitle}</P>}
        </Div>
        {trend && (
          <Div className={`flex items-center gap-1 ${getTrendColor()}`}>
            <Span className="text-2xl">{getTrendIcon()}</Span>
            <P className="text-sm font-semibold">{Math.abs(trend.value)}%</P>
          </Div>
        )}
      </CardContent>
    </Card>
  )
}
