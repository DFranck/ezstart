import { GroupConfig } from '@/components/GroupedSection'
import { format, startOfMonth } from 'date-fns'
import { fr } from 'date-fns/locale'

/**
 * Groups items by month/year based on a date field
 *
 * @example
 * const groups = groupByDate(invoices, item => item.createdAt, { locale: 'fr', reverse: true })
 */
export function groupByDate<T>(
  items: T[],
  getDate: (item: T) => Date | string | undefined,
  options?: {
    locale?: 'fr' | 'en'
    reverse?: boolean // Most recent first
    format?: string // Default: 'MMMM yyyy'
  }
): GroupConfig<T>[] {
  const { locale = 'fr', reverse = true, format: dateFormat = 'MMMM yyyy' } = options || {}

  // Group by month
  const grouped = new Map<string, T[]>()

  items.forEach(item => {
    const date = getDate(item)
    if (!date) return

    const dateObj = typeof date === 'string' ? new Date(date) : date
    const monthStart = startOfMonth(dateObj)
    const key = monthStart.toISOString()

    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(item)
  })

  // Convert to array and sort
  const groups = Array.from(grouped.entries())
    .map(([key, items]) => {
      const date = new Date(key)
      return {
        id: key,
        label: format(date, dateFormat, { locale: locale === 'fr' ? fr : undefined }),
        items,
        badge: `${items.length}`
      }
    })
    .sort((a, b) => {
      const comparison = new Date(b.id).getTime() - new Date(a.id).getTime()
      return reverse ? comparison : -comparison
    })

  return groups
}

/**
 * Groups items alphabetically by first letter
 *
 * @example
 * const groups = groupByFirstLetter(clients, item => item.name)
 */
export function groupByFirstLetter<T>(
  items: T[],
  getName: (item: T) => string
): GroupConfig<T>[] {
  // Group by first letter
  const grouped = new Map<string, T[]>()

  items.forEach(item => {
    const name = getName(item)
    if (!name) return

    const letter = name[0]?.toUpperCase()
    if (!letter) return

    if (!grouped.has(letter)) {
      grouped.set(letter, [])
    }
    const group = grouped.get(letter)
    if (group) {
      group.push(item)
    }
  })

  // Convert to array and sort alphabetically
  const groups = Array.from(grouped.entries())
    .map(([letter, items]) => ({
      id: letter,
      label: letter,
      items,
      badge: `${items.length}`
    }))
    .sort((a, b) => a.id.localeCompare(b.id))

  return groups
}

/**
 * Groups items by a specific field value
 *
 * @example
 * // Payment methods by type
 * const groups = groupByField(
 *   paymentMethods,
 *   item => item.type,
 *   {
 *     card: { label: 'Cartes Bancaires', icon: 'CreditCard' },
 *     bank: { label: 'Virements', icon: 'Building' },
 *     cash: { label: 'Espèces', icon: 'Coins' }
 *   }
 * )
 */
export function groupByField<T, K extends string>(
  items: T[],
  getField: (item: T) => K,
  labels?: Record<K, { label: string; icon?: string }>
): GroupConfig<T>[] {
  // Group by field
  const grouped = new Map<K, T[]>()

  items.forEach(item => {
    const field = getField(item)
    if (!field) return

    if (!grouped.has(field)) {
      grouped.set(field, [])
    }
    grouped.get(field)!.push(item)
  })

  // Convert to array
  const groups = Array.from(grouped.entries()).map(([field, items]) => ({
    id: field,
    label: labels?.[field]?.label || field,
    items,
    badge: `${items.length}`,
    icon: labels?.[field]?.icon as any
  }))

  return groups
}

/**
 * Groups items by status with semantic ordering
 *
 * @example
 * const groups = groupByStatus(invoices, item => item.status, ['pending', 'paid', 'overdue'])
 */
export function groupByStatus<T>(
  items: T[],
  getStatus: (item: T) => string,
  statusOrder?: string[],
  labels?: Record<string, { label: string; icon?: string; badgeVariant?: 'default' | 'accent' | 'muted' }>
): GroupConfig<T>[] {
  // Group by status
  const grouped = new Map<string, T[]>()

  items.forEach(item => {
    const status = getStatus(item)
    if (!status) return

    if (!grouped.has(status)) {
      grouped.set(status, [])
    }
    grouped.get(status)!.push(item)
  })

  // Convert to array
  let groups = Array.from(grouped.entries()).map(([status, items]) => ({
    id: status,
    label: labels?.[status]?.label || status,
    items,
    badge: `${items.length}`,
    icon: labels?.[status]?.icon as any,
    badgeVariant: labels?.[status]?.badgeVariant
  }))

  // Sort by custom order if provided
  if (statusOrder) {
    groups.sort((a, b) => {
      const aIndex = statusOrder.indexOf(a.id)
      const bIndex = statusOrder.indexOf(b.id)

      // If both in order, sort by order
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex
      }

      // If only a in order, a comes first
      if (aIndex !== -1) return -1

      // If only b in order, b comes first
      if (bIndex !== -1) return 1

      // If neither in order, sort alphabetically
      return a.id.localeCompare(b.id)
    })
  }

  return groups
}

/**
 * Combines multiple grouping strategies
 *
 * @example
 * // Group invoices by status, then by month within each status
 * const groups = groupByMultiple(invoices, [
 *   { by: 'status', getField: i => i.status },
 *   { by: 'date', getDate: i => i.createdAt }
 * ])
 */
export function groupByMultiple<T>(
  items: T[],
  strategies: Array<
    | { by: 'date'; getDate: (item: T) => Date | string | undefined }
    | { by: 'letter'; getName: (item: T) => string }
    | { by: 'field'; getField: (item: T) => string }
  >
): GroupConfig<GroupConfig<T>>[] {
  // TODO: Implement nested grouping if needed
  // For now, use single level grouping
  return []
}
