import { Client, Company, Invoice, Quote, Receipt } from '@ezbill/types'
import { GroupItem } from '@/components/CollapsibleGroup'

type DeletedItemsMap = {
  clients: Client[]
  companies: Company[]
  quotes: Quote[]
  invoices: Invoice[]
  receipts: Receipt[]
}

type AllDeletedItemTypes = Client | Company | Quote | Invoice | Receipt

export type DeletedItemGroup = GroupItem<{
  type: keyof DeletedItemsMap
  item: AllDeletedItemTypes
}>

/**
 * Group deleted items by type for CollapsibleGroup
 *
 * Returns groups with unified structure so we can use CollapsibleGroup
 */
export function groupDeletedItems(deletedItems: DeletedItemsMap): DeletedItemGroup[] {
  const groups: DeletedItemGroup[] = []

  // Clients
  if (deletedItems.clients.length > 0) {
    groups.push({
      id: 'clients',
      label: 'Clients',
      count: deletedItems.clients.length,
      items: deletedItems.clients.map(item => ({ type: 'clients' as const, item })),
    })
  }

  // Companies
  if (deletedItems.companies.length > 0) {
    groups.push({
      id: 'companies',
      label: 'Companies',
      count: deletedItems.companies.length,
      items: deletedItems.companies.map(item => ({ type: 'companies' as const, item })),
    })
  }

  // Quotes
  if (deletedItems.quotes.length > 0) {
    groups.push({
      id: 'quotes',
      label: 'Quotes',
      count: deletedItems.quotes.length,
      items: deletedItems.quotes.map(item => ({ type: 'quotes' as const, item })),
    })
  }

  // Invoices
  if (deletedItems.invoices.length > 0) {
    groups.push({
      id: 'invoices',
      label: 'Invoices',
      count: deletedItems.invoices.length,
      items: deletedItems.invoices.map(item => ({ type: 'invoices' as const, item })),
    })
  }

  // Receipts
  if (deletedItems.receipts.length > 0) {
    groups.push({
      id: 'receipts',
      label: 'Receipts',
      count: deletedItems.receipts.length,
      items: deletedItems.receipts.map(item => ({ type: 'receipts' as const, item })),
    })
  }

  return groups
}
