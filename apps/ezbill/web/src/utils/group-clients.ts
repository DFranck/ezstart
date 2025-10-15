import { Client, Invoice, Quote, Receipt } from '@ezbill/types'
import { GroupItem } from '@/components/CollapsibleGroup'
import { isThisWeek, isThisMonth } from 'date-fns'

/**
 * Get the latest activity date for a client
 */
function getClientLatestActivity(
  clientId: string,
  invoices: Invoice[],
  quotes: Quote[],
  receipts: Receipt[]
): Date {
  const clientInvoices = invoices.filter(inv => inv.clientId === clientId)
  const clientQuotes = quotes.filter(q => q.clientId === clientId)
  const clientReceipts = receipts.filter(r => r.clientId === clientId)

  const dates = [
    ...clientInvoices.map(inv => new Date(inv.updatedAt || inv.createdAt)),
    ...clientQuotes.map(q => new Date(q.updatedAt || q.createdAt)),
    ...clientReceipts.map(r => new Date(r.updatedAt || r.createdAt)),
  ]

  return dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date(0)
}

/**
 * Group clients by recent activity
 *
 * Groups:
 * - This Week: Clients with activity in the last 7 days
 * - This Month: Clients with activity in the current month
 * - Older: Clients with older activity
 *
 * @example
 * const groups = groupClientsByActivity(clients, invoices, quotes, receipts)
 * // Returns:
 * // [
 * //   { id: 'this-week', label: 'This Week', count: 3, items: [...] },
 * //   { id: 'this-month', label: 'This Month', count: 5, items: [...] },
 * //   { id: 'older', label: 'Older', count: 12, items: [...] }
 * // ]
 */
export function groupClientsByActivity(
  clients: Client[],
  invoices: Invoice[],
  quotes: Quote[],
  receipts: Receipt[]
): GroupItem<Client>[] {
  const thisWeek: Client[] = []
  const thisMonth: Client[] = []
  const older: Client[] = []

  clients.forEach(client => {
    const lastActivity = getClientLatestActivity(client._id, invoices, quotes, receipts)

    if (isThisWeek(lastActivity, { weekStartsOn: 1 })) {
      thisWeek.push(client)
    } else if (isThisMonth(lastActivity)) {
      thisMonth.push(client)
    } else {
      older.push(client)
    }
  })

  // Sort each group by latest activity (most recent first)
  const sortByActivity = (a: Client, b: Client) => {
    const aDate = getClientLatestActivity(a._id, invoices, quotes, receipts)
    const bDate = getClientLatestActivity(b._id, invoices, quotes, receipts)
    return bDate.getTime() - aDate.getTime()
  }

  thisWeek.sort(sortByActivity)
  thisMonth.sort(sortByActivity)
  older.sort(sortByActivity)

  const groups: GroupItem<Client>[] = []

  if (thisWeek.length > 0) {
    groups.push({
      id: 'this-week',
      label: 'This Week',
      count: thisWeek.length,
      items: thisWeek,
    })
  }

  if (thisMonth.length > 0) {
    groups.push({
      id: 'this-month',
      label: 'This Month',
      count: thisMonth.length,
      items: thisMonth,
    })
  }

  if (older.length > 0) {
    groups.push({
      id: 'older',
      label: 'Older',
      count: older.length,
      items: older,
    })
  }

  return groups
}

/**
 * Group clients by type (Company vs Individual)
 */
export function groupClientsByType(clients: Client[]): GroupItem<Client>[] {
  const companies = clients.filter(c => c.isCompany)
  const individuals = clients.filter(c => !c.isCompany)

  const groups: GroupItem<Client>[] = []

  if (companies.length > 0) {
    groups.push({
      id: 'companies',
      label: 'Companies',
      count: companies.length,
      items: companies.sort((a, b) => a.clientName.localeCompare(b.clientName)),
    })
  }

  if (individuals.length > 0) {
    groups.push({
      id: 'individuals',
      label: 'Individuals',
      count: individuals.length,
      items: individuals.sort((a, b) => a.clientName.localeCompare(b.clientName)),
    })
  }

  return groups
}
