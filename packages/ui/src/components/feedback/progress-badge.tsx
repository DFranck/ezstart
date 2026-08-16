'use client'

/**
 * Generic usage / quota progress badge — pure presentation.
 *
 * Renders a tiny bar + percentage badge for any "X / Y" usage metric
 * (API calls, storage, seats, AI tokens, etc.). The color of both the
 * bar and the badge is computed from configurable warning / danger
 * thresholds so the same component drives every quota surface in a
 * SaaS app without bespoke styling.
 *
 * Originally inlined inside `@ezstart/auth-sdk`'s `<UsageBadge>` (api
 * key quota indicator) — extracted so consumer apps can reuse it for
 * any quota surface (storage, seats, billing units, ...).
 */

import { type ReactNode } from 'react'
import { Badge } from '../data-display/badge'
import { Div } from '../tag'

// ─── Types ──────────────────────────────────────────────────────────────────

/** Pre-resolved usage payload accepted by the badge. */
export interface ProgressBadgeUsage {
  /** Number of units consumed so far. */
  used: number
  /**
   * Total quota for the period. Pass `null` for unlimited plans — the
   * component will then render a single "unlimited" badge instead of
   * the bar + percentage row.
   */
  limit: number | null
}

/** Color thresholds expressed as percentages (0-100). */
export interface ProgressBadgeThresholds {
  /** Below this % the badge stays in the success palette. */
  warning: number
  /** At or above this % the badge switches to the destructive palette. */
  danger: number
}

export interface ProgressBadgeTexts {
  /** Label rendered when `limit === null`. */
  unlimited: string
}

export interface ProgressBadgeProps {
  /** Usage payload — `used` and `limit` (with `null = unlimited`). */
  usage: ProgressBadgeUsage
  /**
   * Visual layout. `default` = bar + percentage badge (compact row),
   * `compact` = single percentage badge (no bar).
   */
  variant?: 'default' | 'compact'
  /** Custom thresholds to swap warning / destructive colors. */
  threshold?: ProgressBadgeThresholds
  /** Override default English texts (e.g. for i18n consumers). */
  texts?: Partial<ProgressBadgeTexts>
  /**
   * Override the rendered label. Defaults to `"<percentage>%"`. Useful when
   * the consumer wants to render the raw `"used / limit"` ratio inside the
   * badge instead of a percentage.
   */
  label?: ReactNode
  /** Optional className appended to the wrapper. */
  className?: string
  /** Aria-label for the progress bar — useful for screen readers. */
  ariaLabel?: string
}

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_TEXTS: ProgressBadgeTexts = {
  unlimited: 'Unlimited',
}

const DEFAULT_THRESHOLDS: ProgressBadgeThresholds = {
  warning: 50,
  danger: 80,
}

// ─── Helpers ────────────────────────────────────────────────────────────────

type Severity = 'success' | 'warning' | 'destructive'

function getSeverity(percentage: number, threshold: ProgressBadgeThresholds): Severity {
  if (percentage >= threshold.danger) return 'destructive'
  if (percentage >= threshold.warning) return 'warning'
  return 'success'
}

const barColorClass: Record<Severity, string> = {
  destructive: 'bg-destructive',
  warning: 'bg-warning',
  success: 'bg-success',
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Generic usage progress badge with semantic color thresholds.
 *
 * @example
 * ```tsx
 * <ProgressBadge usage={{ used: 320, limit: 1000 }} />
 * <ProgressBadge usage={{ used: 0, limit: null }} />
 * <ProgressBadge
 *   usage={{ used: 91, limit: 100 }}
 *   threshold={{ warning: 60, danger: 90 }}
 *   variant="compact"
 * />
 * ```
 */
export function ProgressBadge({
  usage,
  variant = 'default',
  threshold = DEFAULT_THRESHOLDS,
  texts,
  label,
  className,
  ariaLabel,
}: ProgressBadgeProps) {
  const t: ProgressBadgeTexts = { ...DEFAULT_TEXTS, ...texts }

  if (usage.limit === null) {
    return (
      <Badge variant="outline" size="sm" className={className}>
        {t.unlimited}
      </Badge>
    )
  }

  const percentage =
    usage.limit > 0 ? Math.min(100, Math.max(0, Math.round((usage.used / usage.limit) * 100))) : 0
  const severity = getSeverity(percentage, threshold)
  const labelNode: ReactNode = label ?? `${String(percentage)}%`

  if (variant === 'compact') {
    return (
      <Badge
        variant={severity}
        size="xs"
        className={className}
        aria-label={ariaLabel ?? `${String(percentage)}%`}
      >
        {labelNode}
      </Badge>
    )
  }

  return (
    <Div className={['flex items-center gap-2', className ?? ''].filter(Boolean).join(' ')}>
      <Div
        className="w-16 h-2 rounded-full bg-muted overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
        aria-label={ariaLabel ?? `${String(percentage)}%`}
      >
        <Div
          className={`h-full rounded-full transition-all ${barColorClass[severity]}`}
          style={{ width: `${String(percentage)}%` }}
        />
      </Div>
      <Badge variant={severity} size="xs">
        {labelNode}
      </Badge>
    </Div>
  )
}
