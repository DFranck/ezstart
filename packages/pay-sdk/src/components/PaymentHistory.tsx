'use client'

import { Badge, Card, CardContent, Icon, SkeletonList } from '@ezstart/ui/components'
import type { KnownIconName } from '@ezstart/ui/components'
import type { Payment, PaymentStatus, PaymentType } from '../types.js'
import { formatCurrency } from '../utils/format-currency.js'

export interface PaymentHistoryTexts {
  status?: Record<string, string>
  type?: Record<string, string>
  emptyMessage?: string
  dateHeader?: string
  amountHeader?: string
  statusHeader?: string
  typeHeader?: string
  productHeader?: string
}

export interface PaymentHistoryProps {
  payments: Payment[]
  loading?: boolean
  emptyMessage?: string
  className?: string
  texts?: PaymentHistoryTexts
}

const STATUS_VARIANT: Record<
  PaymentStatus,
  'success' | 'warning' | 'destructive' | 'info' | 'secondary'
> = {
  completed: 'success',
  pending: 'warning',
  failed: 'destructive',
  refunded: 'info',
  cancelled: 'secondary',
}

const TYPE_ICON: Record<PaymentType, KnownIconName> = {
  donation: 'lucide:Heart',
  purchase: 'lucide:ShoppingCart',
  subscription: 'lucide:CreditCard',
  invoice: 'lucide:FileText',
}

const DEFAULT_STATUS_LABELS: Record<PaymentStatus, string> = {
  completed: 'Completed',
  pending: 'Pending',
  failed: 'Failed',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
}

const DEFAULT_TYPE_LABELS: Record<PaymentType, string> = {
  donation: 'Donation',
  purchase: 'Purchase',
  subscription: 'Subscription',
  invoice: 'Invoice',
}

function getProductName(payment: Payment): string {
  if (!payment.metadata) return payment.projectName || '—'

  if ('productName' in payment.metadata && payment.metadata.productName) {
    return payment.metadata.productName as string
  }
  if ('planName' in payment.metadata && payment.metadata.planName) {
    return payment.metadata.planName as string
  }
  if ('invoiceNumber' in payment.metadata && payment.metadata.invoiceNumber) {
    return payment.metadata.invoiceNumber as string
  }

  return payment.projectName || '—'
}

export function PaymentHistory({
  payments,
  loading = false,
  emptyMessage,
  className,
  texts,
}: PaymentHistoryProps) {
  const statusLabel = (status: PaymentStatus) =>
    texts?.status?.[status] || DEFAULT_STATUS_LABELS[status]

  const typeLabel = (type: PaymentType) => texts?.type?.[type] || DEFAULT_TYPE_LABELS[type]

  const t = {
    emptyMessage: emptyMessage || texts?.emptyMessage || 'No payments yet.',
    dateHeader: texts?.dateHeader || 'Date',
    amountHeader: texts?.amountHeader || 'Amount',
    statusHeader: texts?.statusHeader || 'Status',
    typeHeader: texts?.typeHeader || 'Type',
    productHeader: texts?.productHeader || 'Product',
  }

  // Loading state
  if (loading) {
    return (
      <div className={className}>
        <SkeletonList items={4} showAvatar={false} />
      </div>
    )
  }

  // Empty state
  if (!payments.length) {
    return (
      <div className={className}>
        <div className="flex flex-col items-center justify-center gap-4 p-12 rounded-lg border-2 border-dashed border-muted-foreground/20">
          <Icon name="lucide:Receipt" className="w-12 h-12 text-muted-foreground/40" />
          <p className="text-muted-foreground text-center">{t.emptyMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Desktop table */}
      <div className="hidden md:block overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                {t.dateHeader}
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                {t.productHeader}
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                {t.typeHeader}
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                {t.amountHeader}
              </th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                {t.statusHeader}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {payments.map(payment => (
              <tr key={payment.id} className="transition-colors hover:bg-muted/30">
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(payment.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </td>
                <td className="px-4 py-3 font-medium">{getProductName(payment)}</td>
                <td className="px-4 py-3">
                  <Badge variant="secondary" size="sm">
                    <Icon name={TYPE_ICON[payment.type]} className="w-3 h-3 mr-1" />
                    {typeLabel(payment.type)}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right font-semibold">
                  {formatCurrency(payment.amount, payment.currency)}
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge variant={STATUS_VARIANT[payment.status]} size="sm" dot>
                    {statusLabel(payment.status)}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {payments.map(payment => (
          <Card key={payment.id} size="sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{getProductName(payment)}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {new Date(payment.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <p className="font-semibold whitespace-nowrap">
                  {formatCurrency(payment.amount, payment.currency)}
                </p>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="secondary" size="sm">
                  <Icon name={TYPE_ICON[payment.type]} className="w-3 h-3 mr-1" />
                  {typeLabel(payment.type)}
                </Badge>
                <Badge variant={STATUS_VARIANT[payment.status]} size="sm" dot>
                  {statusLabel(payment.status)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
