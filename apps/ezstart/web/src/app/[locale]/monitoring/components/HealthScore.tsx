'use client'

import { Card, CardContent, CardHeader, H2, P } from '@ezstart/ui/components'

interface HealthScoreProps {
  score: number
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
}

export function HealthScore({ score, status }: HealthScoreProps) {
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
      className={`bg-gradient-to-br ${getBackgroundGradient()} w-full max-w-lg`}
    >
      <CardHeader>
        <H2 size="h4" className="text-center">
          Overall Health Score
        </H2>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center space-y-4">
          <div className="relative flex items-end">
            <div className={`text-8xl font-bold ${getScoreColor()}`}>{score}</div>
            <span className={`text-3xl font-semibold mb-2 ml-1 ${getScoreColor()}`}>%</span>
            <div className="absolute -top-2 -right-2 text-4xl">{getStatusEmoji()}</div>
          </div>

          <P className="text-xl font-semibold capitalize text-center">{status}</P>

          <div className="w-full max-w-md relative">
            {/* Progress bar */}
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
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
            </div>

            {/* Target marker at 90% */}
            <div
              className="absolute top-0 h-3 w-0.5 bg-foreground/40"
              style={{ left: '90%' }}
              title="Target: 90+"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
