'use client'

import { Badge, Div } from '@ezstart/ui/components'
import type { UsageBadgeTexts } from './types.js'

export interface UsageBadgeProps {
  used: number
  quota: number | null
  texts?: UsageBadgeTexts
}

function getUsageVariant(percentage: number): 'success' | 'warning' | 'destructive' {
  if (percentage >= 80) return 'destructive'
  if (percentage >= 50) return 'warning'
  return 'success'
}

function getBarColorClass(variant: 'success' | 'warning' | 'destructive'): string {
  if (variant === 'destructive') return 'bg-destructive'
  if (variant === 'warning') return 'bg-warning'
  return 'bg-success'
}

export function UsageBadge({ used, quota, texts }: UsageBadgeProps) {
  if (quota === null) {
    return (
      <Badge variant="outline" size="sm">
        {texts?.unlimited ?? 'Unlimited'}
      </Badge>
    )
  }

  const percentage = quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0
  const variant = getUsageVariant(percentage)

  return (
    <Div className="flex items-center gap-2">
      <Div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
        <Div
          className={`h-full rounded-full transition-all ${getBarColorClass(variant)}`}
          style={{ width: `${String(percentage)}%` }}
        />
      </Div>
      <Badge variant={variant} size="xs">
        {String(percentage)}%
      </Badge>
    </Div>
  )
}
