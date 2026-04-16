'use client'

import {
  Badge,
  DataTable,
  DataTableColumnHeader,
  Div,
  Icon,
  P,
  SkeletonList,
  Span,
  type ColumnDef,
} from '@ezstart/ui/components'
import type { KnownIconName } from '@ezstart/ui/components'
import type { Payment, PaymentStatus, PaymentType } from '../core/types.js'
import { formatCurrency } from '../core/format-currency.js'

export interface PaymentHistoryTexts {
  status?: Record<string, string>
  type?: Record<string, string>
  emptyMessage?: string
  dateHeader?: string
  amountHeader?: string
  statusHeader?: string
  typeHeader?: string
  productHeader?: string
  appHeader?: string
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
  testimonial: 'lucide:MessageCircle',
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
  testimonial: 'Testimonial',
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

function buildColumns(
  statusLabel: (status: PaymentStatus) => string,
  typeLabel: (type: PaymentType) => string,
  headers: {
    dateHeader: string
    productHeader: string
    typeHeader: string
    amountHeader: string
    statusHeader: string
    appHeader: string
  },
  showAppColumn: boolean
): ColumnDef<Payment, unknown>[] {
  const columns: ColumnDef<Payment, unknown>[] = [
    {
      accessorKey: 'createdAt',
      header: ({ header }) => <DataTableColumnHeader header={header} title={headers.dateHeader} />,
      cell: ({ row }) => (
        <Span>
          {new Date(row.original.createdAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </Span>
      ),
    },
  ]

  if (showAppColumn) {
    columns.push({
      accessorKey: 'projectId',
      header: ({ header }) => <DataTableColumnHeader header={header} title={headers.appHeader} />,
      cell: ({ row }) => (
        <Badge variant="secondary" size="sm">
          {row.original.projectName || row.original.projectId}
        </Badge>
      ),
      enableSorting: false,
    })
  }

  columns.push(
    {
      accessorKey: 'productName',
      header: ({ header }) => (
        <DataTableColumnHeader header={header} title={headers.productHeader} />
      ),
      cell: ({ row }) => <Span>{getProductName(row.original)}</Span>,
      enableSorting: false,
    },
    {
      accessorKey: 'type',
      header: ({ header }) => <DataTableColumnHeader header={header} title={headers.typeHeader} />,
      cell: ({ row }) => (
        <Badge variant="secondary" size="sm">
          <Icon name={TYPE_ICON[row.original.type]} size={12} />
          {typeLabel(row.original.type)}
        </Badge>
      ),
    },
    {
      accessorKey: 'amount',
      header: ({ header }) => (
        <DataTableColumnHeader header={header} title={headers.amountHeader} />
      ),
      cell: ({ row }) => <Span>{formatCurrency(row.original.amount, row.original.currency)}</Span>,
    },
    {
      accessorKey: 'status',
      header: ({ header }) => (
        <DataTableColumnHeader header={header} title={headers.statusHeader} />
      ),
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANT[row.original.status]} size="sm" dot>
          {statusLabel(row.original.status)}
        </Badge>
      ),
    }
  )

  return columns
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
    appHeader: texts?.appHeader || 'App',
  }

  // Loading state
  if (loading) {
    return (
      <Div className={className}>
        <SkeletonList items={4} showAvatar={false} />
      </Div>
    )
  }

  // Empty state
  if (!payments.length) {
    return (
      <Div className={className}>
        <Div layout="center" size="lg" variant="outline">
          <Icon name="lucide:Receipt" size={48} />
          <P variant="description">{t.emptyMessage}</P>
        </Div>
      </Div>
    )
  }

  // Show App column when payments come from multiple projects
  const showAppColumn = payments.length > 0 && new Set(payments.map(p => p.projectId)).size > 1

  const columns = buildColumns(
    statusLabel,
    typeLabel,
    {
      dateHeader: t.dateHeader,
      productHeader: t.productHeader,
      typeHeader: t.typeHeader,
      amountHeader: t.amountHeader,
      statusHeader: t.statusHeader,
      appHeader: t.appHeader,
    },
    showAppColumn
  )

  return (
    <Div className={className}>
      <DataTable
        columns={columns}
        data={payments}
        pageSize={10}
        initialSorting={[{ id: 'createdAt', desc: true }]}
      />
    </Div>
  )
}
