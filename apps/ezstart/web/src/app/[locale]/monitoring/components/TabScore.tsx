'use client'

import { Card, CardContent, CardHeader, Div, H2, P, Span } from '@ezstart/ui/components'

interface TabScoreProps {
  score: number
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
  title?: string
  subtitle?: string
}

export function TabScore({ score, status, title = 'Overall Score', subtitle }: TabScoreProps) {
  const getScoreColor = () => {
    if (score >= 90) return 'text-status-healthy'
    if (score >= 70) return 'text-status-degraded'
    if (score >= 50) return 'text-status-degraded'
    return 'text-status-unhealthy'
  }

  const getStatusEmoji = () => {
    switch (status) {
      case 'excellent':
        return '🎉'
      case 'good':
        return '✅'
      case 'fair':
        return '⚠️'
      case 'poor':
        return '❌'
      case 'critical':
        return '🚨'
    }
  }

  const getBackgroundGradient = () => {
    if (score >= 90) return 'from-status-healthy/20 to-status-healthy/5'
    if (score >= 70) return 'from-status-degraded/20 to-status-degraded/5'
    if (score >= 50) return 'from-status-degraded/20 to-status-degraded/5'
    return 'from-status-unhealthy/20 to-status-unhealthy/5'
  }

  return (
    <Card
      variant="elevated"
      className={`w-full bg-gradient-to-br ${getBackgroundGradient()} w-full`}
    >
      <CardHeader>
        <H2 size="h4" className="text-center">
          {title}
        </H2>
        {subtitle && <P className="text-sm text-muted-foreground text-center">{subtitle}</P>}
      </CardHeader>
      <CardContent>
        <Div className="flex flex-col items-center space-y-4">
          <Div className="relative flex items-end">
            <Div className={`text-8xl font-bold ${getScoreColor()}`}>{score}</Div>
            <Span className={`text-3xl font-semibold mb-2 ml-1 ${getScoreColor()}`}>%</Span>
            <Div className="absolute -top-2 -right-2 text-4xl">{getStatusEmoji()}</Div>
          </Div>

          <P className="text-xl font-semibold capitalize text-center">{status}</P>

          <Div className="w-full max-w-md relative">
            {/* Progress bar */}
            <Div className="h-3 bg-muted rounded-full overflow-hidden">
              <Div
                className={`h-full ${
                  score >= 90
                    ? 'bg-status-healthy'
                    : score >= 70
                      ? 'bg-status-degraded'
                      : score >= 50
                        ? 'bg-status-degraded'
                        : 'bg-status-unhealthy'
                } transition-all duration-500`}
                style={{ width: `${score}%` }}
              />
            </Div>

            {/* Target marker at 90% */}
            <Div
              className="absolute top-0 h-3 w-0.5 bg-foreground/40"
              style={{ left: '90%' }}
              title="Target: 90+"
            />
          </Div>
        </Div>
      </CardContent>
    </Card>
  )
}
