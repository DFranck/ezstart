/**
 * Shared formatters / constants used by the PayAdminDashboard sections.
 * @internal
 */
import type { PaymentStatus, PaymentType } from '../../../core/types.js'

export const PAGE_SIZE = 20

export const STATUS_VARIANT: Record<
  PaymentStatus,
  'success' | 'warning' | 'destructive' | 'info' | 'secondary'
> = {
  completed: 'success',
  pending: 'warning',
  failed: 'destructive',
  refunded: 'info',
  cancelled: 'secondary',
}

export const TYPE_VARIANT: Record<PaymentType, 'purple' | 'cyan' | 'indigo' | 'pink'> = {
  donation: 'purple',
  purchase: 'cyan',
  subscription: 'indigo',
  invoice: 'pink',
  testimonial: 'purple',
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateStr))
}

export function formatDateShort(dateStr: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(new Date(dateStr))
}

/** Compact short label for chart X axis (e.g. `Apr 12`). */
export function shortDateLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(d)
}
