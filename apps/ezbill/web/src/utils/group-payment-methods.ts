import { PaymentMethod } from '@ezbill/types'
import { GroupItem } from '@/components/CollapsibleGroup'

/**
 * Group payment methods by type
 *
 * Groups:
 * - Bank Transfer: Bank account payment methods
 * - Card: Credit/debit card payment methods
 * - Other: Other payment methods (PayPal, crypto, etc.)
 */
export function groupPaymentMethodsByType(
  paymentMethods: PaymentMethod[]
): GroupItem<PaymentMethod>[] {
  const bankTransfer = paymentMethods.filter(pm => pm.type === 'bank_transfer')
  const card = paymentMethods.filter(pm => pm.type === 'card')
  const other = paymentMethods.filter(
    pm => pm.type !== 'bank_transfer' && pm.type !== 'card'
  )

  const groups: GroupItem<PaymentMethod>[] = []

  if (bankTransfer.length > 0) {
    groups.push({
      id: 'bank-transfer',
      label: 'Bank Transfer',
      count: bankTransfer.length,
      items: bankTransfer.sort((a, b) => a.name.localeCompare(b.name)),
    })
  }

  if (card.length > 0) {
    groups.push({
      id: 'card',
      label: 'Card',
      count: card.length,
      items: card.sort((a, b) => a.name.localeCompare(b.name)),
    })
  }

  if (other.length > 0) {
    groups.push({
      id: 'other',
      label: 'Other',
      count: other.length,
      items: other.sort((a, b) => a.name.localeCompare(b.name)),
    })
  }

  return groups
}

/**
 * Simple wrapper that returns all payment methods as one group
 * Used when we don't need complex grouping
 */
export function groupPaymentMethodsAsOne(
  paymentMethods: PaymentMethod[]
): GroupItem<PaymentMethod>[] {
  if (paymentMethods.length === 0) return []

  return [
    {
      id: 'all',
      label: 'All Payment Methods',
      count: paymentMethods.length,
      items: paymentMethods.sort((a, b) => a.name.localeCompare(b.name)),
    },
  ]
}
