/**
 * Pure format/variant helpers for the error logs section. Extracted from the
 * section component for reuse between the table and the detail modal.
 *
 * @internal
 */

import type { ErrorLogLevel } from '../../../../react/admin-error-logs.js'

export function formatDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return iso
  }
}

export function levelBadgeVariant(level: ErrorLogLevel): 'destructive' | 'warning' | 'default' {
  if (level === 'fatal') return 'destructive'
  if (level === 'warn') return 'warning'
  return 'default'
}

export function statusBadgeVariant(statusCode?: number): 'destructive' | 'warning' | 'secondary' {
  if (!statusCode) return 'secondary'
  if (statusCode >= 500) return 'destructive'
  if (statusCode >= 400) return 'warning'
  return 'secondary'
}
