import { PaymentMethod } from '@ezbill/types'
import { GroupItem } from '@/components/CollapsibleGroup'

/**
 * Group payment methods by type
 *
 * Groups:
 * - Bank Transfer: Bank account payment methods
 * - Digital Wallets: Stripe, PayPal, Wise, Revolut
 * - Crypto: Cryptocurrency wallets
 * - Other: Other payment methods
 */
export function groupPaymentMethodsByType(
  paymentMethods: PaymentMethod[]
): GroupItem<PaymentMethod>[] {
  const bankTransfer = paymentMethods.filter(pm => pm.type === 'bank_transfer')
  const digitalWallets = paymentMethods.filter(pm =>
    pm.type === 'stripe' || pm.type === 'paypal' || pm.type === 'wise' || pm.type === 'revolut'
  )
  const crypto = paymentMethods.filter(pm => pm.type === 'crypto_wallet')
  const other = paymentMethods.filter(
    pm => pm.type !== 'bank_transfer' &&
          pm.type !== 'stripe' &&
          pm.type !== 'paypal' &&
          pm.type !== 'wise' &&
          pm.type !== 'revolut' &&
          pm.type !== 'crypto_wallet'
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

  if (digitalWallets.length > 0) {
    groups.push({
      id: 'digital-wallets',
      label: 'Digital Wallets',
      count: digitalWallets.length,
      items: digitalWallets.sort((a, b) => a.name.localeCompare(b.name)),
    })
  }

  if (crypto.length > 0) {
    groups.push({
      id: 'crypto',
      label: 'Cryptocurrency',
      count: crypto.length,
      items: crypto.sort((a, b) => a.name.localeCompare(b.name)),
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
