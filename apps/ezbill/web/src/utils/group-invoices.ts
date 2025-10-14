import { Invoice } from '@ezbill/types'
import { GroupItem } from '@/components/CollapsibleGroup'
import { format, startOfMonth, startOfWeek, startOfYear, isThisMonth, isThisWeek, isThisYear } from 'date-fns'
import { fr } from 'date-fns/locale'

/**
 * Group invoices by month
 *
 * @example
 * const groups = groupInvoicesByMonth(invoices)
 * // Returns:
 * // [
 * //   { id: '2025-01', label: 'January 2025', count: 4, items: [...] },
 * //   { id: '2024-12', label: 'December 2024', count: 2, items: [...] }
 * // ]
 */
export function groupInvoicesByMonth(
  invoices: Invoice[],
  locale: 'fr' | 'en' = 'fr'
): GroupItem<Invoice>[] {
  const grouped = new Map<string, Invoice[]>()

  // Group by month
  invoices.forEach(invoice => {
    const date = new Date(invoice.createdAt)
    const monthStart = startOfMonth(date)
    const key = format(monthStart, 'yyyy-MM')

    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)?.push(invoice)
  })

  // Convert to array and sort (most recent first)
  const groups = Array.from(grouped.entries())
    .map(([key, items]) => {
      const date = new Date(key + '-01')
      let label = format(date, 'MMMM yyyy', { locale: locale === 'fr' ? fr : undefined })

      // Add "This month" indicator
      if (isThisMonth(date)) {
        label = locale === 'fr' ? `${label} (ce mois)` : `${label} (this month)`
      }

      return {
        id: key,
        label,
        count: items.length,
        items: items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      }
    })
    .sort((a, b) => b.id.localeCompare(a.id)) // Most recent first

  return groups
}

/**
 * Group invoices by week
 *
 * @example
 * const groups = groupInvoicesByWeek(invoices)
 * // Returns:
 * // [
 * //   { id: '2025-W02', label: 'Week of Jan 6, 2025', count: 3, items: [...] },
 * //   { id: '2025-W01', label: 'Week of Dec 30, 2024', count: 1, items: [...] }
 * // ]
 */
export function groupInvoicesByWeek(
  invoices: Invoice[],
  locale: 'fr' | 'en' = 'fr'
): GroupItem<Invoice>[] {
  const grouped = new Map<string, Invoice[]>()

  // Group by week
  invoices.forEach(invoice => {
    const date = new Date(invoice.createdAt)
    const weekStart = startOfWeek(date, { weekStartsOn: 1 }) // Monday
    const key = format(weekStart, 'yyyy-\'W\'II')

    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)?.push(invoice)
  })

  // Convert to array and sort
  const groups = Array.from(grouped.entries())
    .map(([key, items]) => {
      const weekMatch = key.match(/(\d{4})-W(\d{2})/)
      if (!weekMatch || !weekMatch[1] || !weekMatch[2]) return null

      const year = weekMatch[1]
      const week = weekMatch[2]
      const date = new Date(parseInt(year), 0, 1 + (parseInt(week) - 1) * 7)
      const weekStart = startOfWeek(date, { weekStartsOn: 1 })

      let label = locale === 'fr'
        ? `Semaine du ${format(weekStart, 'd MMM yyyy', { locale: fr })}`
        : `Week of ${format(weekStart, 'MMM d, yyyy')}`

      // Add "This week" indicator
      if (isThisWeek(weekStart, { weekStartsOn: 1 })) {
        label = locale === 'fr' ? `${label} (cette semaine)` : `${label} (this week)`
      }

      return {
        id: key,
        label,
        count: items.length,
        items: items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      }
    })
    .filter((g): g is GroupItem<Invoice> => g !== null)
    .sort((a, b) => b.id.localeCompare(a.id))

  return groups
}

/**
 * Group invoices by year
 */
export function groupInvoicesByYear(invoices: Invoice[]): GroupItem<Invoice>[] {
  const grouped = new Map<string, Invoice[]>()

  invoices.forEach(invoice => {
    const date = new Date(invoice.createdAt)
    const yearStart = startOfYear(date)
    const key = format(yearStart, 'yyyy')

    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)?.push(invoice)
  })

  const groups = Array.from(grouped.entries())
    .map(([key, items]) => {
      const date = new Date(parseInt(key), 0, 1)
      let label = key

      if (isThisYear(date)) {
        label = `${label} (this year)`
      }

      return {
        id: key,
        label,
        count: items.length,
        items: items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      }
    })
    .sort((a, b) => b.id.localeCompare(a.id))

  return groups
}

/**
 * Group invoices by status
 */
export function groupInvoicesByStatus(invoices: Invoice[]): GroupItem<Invoice>[] {
  const statusLabels: Record<string, string> = {
    draft: 'Draft',
    sent: 'Sent',
    paid: 'Paid',
    overdue: 'Overdue',
    cancelled: 'Cancelled'
  }

  const statusOrder = ['draft', 'sent', 'overdue', 'paid', 'cancelled']

  const grouped = new Map<string, Invoice[]>()

  invoices.forEach(invoice => {
    const status = invoice.status
    if (!grouped.has(status)) {
      grouped.set(status, [])
    }
    grouped.get(status)?.push(invoice)
  })

  const groups = Array.from(grouped.entries())
    .map(([status, items]) => ({
      id: status,
      label: statusLabels[status] || status,
      count: items.length,
      items: items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }))
    .sort((a, b) => {
      const aIndex = statusOrder.indexOf(a.id)
      const bIndex = statusOrder.indexOf(b.id)
      return aIndex - bIndex
    })

  return groups
}
