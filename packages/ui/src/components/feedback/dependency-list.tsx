'use client'

/**
 * DependencyList — surfaces the per-dependency results parsed from a
 * `/health/deep` snapshot (see `@ezstart/api-core`
 * `createDeepHealthHandler`). Rendered under each {@link StatusService}
 * line when the service is configured with `mode: 'deep'`.
 *
 * Pure presentational component — no fetching, all labels are passed
 * through props so the parent {@link StatusPage} keeps owning i18n.
 */

import { Badge } from '../data-display/badge'
import { Div, Span } from '../tag'

export type DependencyStatus = 'ok' | 'degraded' | 'down'

export interface DependencyListItem {
  /** Stable dependency identifier (e.g. `'db'`, `'stripe'`). */
  name: string
  /** Outcome of the dependency check. */
  status: DependencyStatus
  /** Optional human-readable detail returned by the deep handler. */
  message?: string
  /** Round-trip duration in milliseconds, when reported. */
  durationMs?: number
}

export interface DependencyListProps {
  dependencies: DependencyListItem[]
  /** Heading shown above the sublist. */
  label: string
  /** Badge label when status === 'ok'. */
  okLabel: string
  /** Badge label when status === 'degraded'. */
  degradedLabel: string
  /** Badge label when status === 'down'. */
  downLabel: string
}

const DEP_BADGE_VARIANT: Record<DependencyStatus, 'success' | 'warning' | 'destructive'> = {
  ok: 'success',
  degraded: 'warning',
  down: 'destructive',
}

export function DependencyList({
  dependencies,
  label,
  okLabel,
  degradedLabel,
  downLabel,
}: DependencyListProps): React.JSX.Element {
  return (
    <Div className="mt-1 rounded-md border border-border/50 bg-muted/30 p-2">
      <Span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Span>
      <Div className="flex flex-col gap-1" role="list">
        {dependencies.map(dep => (
          <Div key={dep.name} role="listitem" className="flex items-center justify-between gap-2">
            <Div className="flex min-w-0 flex-col gap-0.5">
              <Span className="truncate text-xs font-medium text-foreground">{dep.name}</Span>
              {dep.message && dep.status !== 'ok' ? (
                <Span className="truncate text-xs text-muted-foreground">{dep.message}</Span>
              ) : null}
            </Div>
            <Div className="flex shrink-0 items-center gap-2">
              {typeof dep.durationMs === 'number' ? (
                <Span className="text-xs tabular-nums text-muted-foreground">
                  {dep.durationMs}ms
                </Span>
              ) : null}
              <Badge variant={DEP_BADGE_VARIANT[dep.status]} size="xs" dot>
                {dep.status === 'ok'
                  ? okLabel
                  : dep.status === 'degraded'
                    ? degradedLabel
                    : downLabel}
              </Badge>
            </Div>
          </Div>
        ))}
      </Div>
    </Div>
  )
}

DependencyList.displayName = 'DependencyList'
