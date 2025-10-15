import { Quote } from '@ezbill/types'
import { GroupItem } from '@/components/CollapsibleGroup'
import { format, startOfMonth, isThisMonth } from 'date-fns'
import { fr } from 'date-fns/locale'

/**
 * Group quotes by month
 */
export function groupQuotesByMonth(
  quotes: Quote[],
  locale: 'fr' | 'en' = 'fr'
): GroupItem<Quote>[] {
  const grouped = new Map<string, Quote[]>()

  quotes.forEach(quote => {
    const date = new Date(quote.createdAt)
    const monthStart = startOfMonth(date)
    const key = format(monthStart, 'yyyy-MM')

    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)?.push(quote)
  })

  const groups = Array.from(grouped.entries())
    .map(([key, items]) => {
      const date = new Date(key + '-01')
      let label = format(date, 'MMMM yyyy', { locale: locale === 'fr' ? fr : undefined })

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
    .sort((a, b) => b.id.localeCompare(a.id))

  return groups
}

/**
 * Group quotes by status
 */
export function groupQuotesByStatus(quotes: Quote[]): GroupItem<Quote>[] {
  const statusLabels: Record<string, string> = {
    draft: 'Draft',
    sent: 'Sent',
    accepted: 'Accepted',
    declined: 'Declined',
    expired: 'Expired'
  }

  const statusOrder = ['draft', 'sent', 'accepted', 'declined', 'expired']

  const grouped = new Map<string, Quote[]>()

  quotes.forEach(quote => {
    const status = quote.status
    if (!grouped.has(status)) {
      grouped.set(status, [])
    }
    grouped.get(status)?.push(quote)
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
