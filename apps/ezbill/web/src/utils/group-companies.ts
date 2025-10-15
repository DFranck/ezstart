import { Company } from '@ezbill/types'
import { GroupItem } from '@/components/CollapsibleGroup'

/**
 * Group companies by activity status
 *
 * Groups:
 * - Active: Companies that are not deleted
 * - Archived: Soft-deleted companies (if any)
 *
 * Note: Since settings page doesn't show deleted items (they're in separate tab),
 * this will typically just return one "Active" group.
 */
export function groupCompaniesByStatus(companies: Company[]): GroupItem<Company>[] {
  const active = companies.filter(c => !c.deletedAt)
  const archived = companies.filter(c => c.deletedAt)

  const groups: GroupItem<Company>[] = []

  if (active.length > 0) {
    groups.push({
      id: 'active',
      label: 'Active Companies',
      count: active.length,
      items: active.sort((a, b) => a.companyName.localeCompare(b.companyName)),
    })
  }

  if (archived.length > 0) {
    groups.push({
      id: 'archived',
      label: 'Archived Companies',
      count: archived.length,
      items: archived.sort((a, b) => a.companyName.localeCompare(b.companyName)),
    })
  }

  return groups
}

/**
 * Simple wrapper that returns all companies as one group
 * Used when we don't need complex grouping
 */
export function groupCompaniesAsOne(companies: Company[]): GroupItem<Company>[] {
  if (companies.length === 0) return []

  return [
    {
      id: 'all',
      label: 'All Companies',
      count: companies.length,
      items: companies.sort((a, b) => a.companyName.localeCompare(b.companyName)),
    },
  ]
}
