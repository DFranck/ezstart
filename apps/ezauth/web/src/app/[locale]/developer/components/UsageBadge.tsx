'use client'

import { Badge, Div, Span } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

interface UsageBadgeProps {
  used: number
  quota: number | null
}

/** Get the badge variant based on usage percentage. */
function getUsageVariant(percentage: number): 'success' | 'warning' | 'destructive' {
  if (percentage >= 80) return 'destructive'
  if (percentage >= 50) return 'warning'
  return 'success'
}

export function UsageBadge({ used, quota }: UsageBadgeProps) {
  const t = useTranslations('developer.usage')

  if (quota === null) {
    return (
      <Badge variant="outline" size="sm">
        {t('unlimited')}
      </Badge>
    )
  }

  const percentage = quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0
  const variant = getUsageVariant(percentage)

  return (
    <Div className="flex items-center gap-2">
      <Div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
        <Div
          className={`h-full rounded-full transition-all ${
            variant === 'destructive'
              ? 'bg-destructive'
              : variant === 'warning'
                ? 'bg-warning'
                : 'bg-success'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </Div>
      <Badge variant={variant} size="xs">
        <Span>{percentage}%</Span>
      </Badge>
    </Div>
  )
}
