'use client'

import { Card, CardContent, CardHeader, H2, P } from '@ezstart/ui/components'

interface HealthScoreProps {
  score: number
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
}

export function HealthScore({ score, status }: HealthScoreProps) {
  const getScoreColor = () => {
    if (score >= 90) return 'text-green-500'
    if (score >= 70) return 'text-yellow-500'
    if (score >= 50) return 'text-orange-500'
    return 'text-red-500'
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
    if (score >= 90) return 'from-green-500/20 to-green-500/5'
    if (score >= 70) return 'from-yellow-500/20 to-yellow-500/5'
    if (score >= 50) return 'from-orange-500/20 to-orange-500/5'
    return 'from-red-500/20 to-red-500/5'
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
          <div className="relative">
            <div className={`text-8xl font-bold ${getScoreColor()}`}>{score}</div>
            <div className="absolute -top-2 -right-2 text-4xl">{getStatusEmoji()}</div>
          </div>

          <P className="text-xl font-semibold capitalize text-center">{status}</P>

          <div className="w-full max-w-md">
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  score >= 90
                    ? 'bg-green-500'
                    : score >= 70
                      ? 'bg-yellow-500'
                      : score >= 50
                        ? 'bg-orange-500'
                        : 'bg-red-500'
                } transition-all duration-500`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full max-w-md text-center">
            <div className="bg-background/50 rounded-lg p-3">
              <P className="text-sm text-muted-foreground">Target</P>
              <P className="text-lg font-bold">90+</P>
            </div>
            <div className="bg-background/50 rounded-lg p-3">
              <P className="text-sm text-muted-foreground">Current</P>
              <P className={`text-lg font-bold ${getScoreColor()}`}>{score}</P>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
