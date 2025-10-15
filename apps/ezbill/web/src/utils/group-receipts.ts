import { Receipt } from '@ezbill/types'
import { GroupItem } from '@/components/CollapsibleGroup'
import { format, startOfMonth, isThisMonth } from 'date-fns'
import { fr } from 'date-fns/locale'

/**
 * Group receipts by month (based on payment date)
 */
export function groupReceiptsByMonth(
  receipts: Receipt[],
  locale: 'fr' | 'en' = 'fr'
): GroupItem<Receipt>[] {
  const grouped = new Map<string, Receipt[]>()

  receipts.forEach(receipt => {
    const date = receipt.paymentDate ? new Date(receipt.paymentDate) : new Date(receipt.createdAt)
    const monthStart = startOfMonth(date)
    const key = format(monthStart, 'yyyy-MM')

    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)?.push(receipt)
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
        items: items.sort((a, b) => {
          const dateA = a.paymentDate ? new Date(a.paymentDate) : new Date(a.createdAt)
          const dateB = b.paymentDate ? new Date(b.paymentDate) : new Date(b.createdAt)
          return dateB.getTime() - dateA.getTime()
        })
      }
    })
    .sort((a, b) => b.id.localeCompare(a.id))

  return groups
}
