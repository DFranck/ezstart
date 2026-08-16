'use client'

import { useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  DataTable,
  DataTableColumnHeader,
  Div,
  H3,
  Icon,
  P,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Span,
  type ColumnDef,
} from '@ezstart/ui/components'
import { usePaymentHistory } from '../react/hooks/usePaymentHistory.js'
import { useApplicationContext } from '../react/pay-provider.js'
import { formatCurrency } from '../core/format-currency.js'
import { PayNotConfiguredCard, type PayNotConfiguredTexts } from './common/PayNotConfiguredCard.js'
import type { Payment, PaymentStatus } from '../core/types.js'

// ---------------------------------------------------------------------------
// Texts
// ---------------------------------------------------------------------------

export interface InvoiceHistorySectionTexts {
  title: string
  description: string
  empty: string
  emptyDescription: string
  filterAll: string
  filterPaid: string
  filterPending: string
  filterFailed: string
  download: string
  viewReceipt: string
  loading: string
  errorTitle: string
  errorDescription: string
  retry: string
  contextUnavailableTitle: string
  contextUnavailableDescription: string
  columns: {
    date: string
    description: string
    amount: string
    status: string
    actions: string
  }
  status: {
    paid: string
    pending: string
    failed: string
    refunded: string
    cancelled: string
  }
}

export const defaultInvoiceHistorySectionTexts: InvoiceHistorySectionTexts = {
  title: 'Invoices',
  description: 'Your billing history',
  empty: 'No invoices yet',
  emptyDescription: 'Your invoices will appear here once you receive them.',
  filterAll: 'All',
  filterPaid: 'Paid',
  filterPending: 'Pending',
  filterFailed: 'Failed',
  download: 'Download PDF',
  viewReceipt: 'View receipt',
  loading: 'Loading invoices...',
  errorTitle: 'Could not load invoices',
  errorDescription: 'Something went wrong while loading your invoice history.',
  retry: 'Retry',
  contextUnavailableTitle: 'Invoice context unavailable',
  contextUnavailableDescription:
    'We could not resolve your billing application. Please refresh the page or contact support if the problem persists.',
  columns: {
    date: 'Date',
    description: 'Description',
    amount: 'Amount',
    status: 'Status',
    actions: 'Actions',
  },
  status: {
    paid: 'Paid',
    pending: 'Pending',
    failed: 'Failed',
    refunded: 'Refunded',
    cancelled: 'Cancelled',
  },
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type InvoiceStatusFilter = 'all' | 'paid' | 'pending' | 'failed'

export interface InvoiceHistorySectionProps {
  /** Ezauth Application id (preferred). When omitted, resolved from PayProvider. */
  applicationId?: string
  /** User id whose invoices to load. */
  userId?: string
  /** Number of invoices per page in the table (default 10). */
  pageSize?: number
  /** Customizable texts (English defaults). */
  texts?: Partial<InvoiceHistorySectionTexts>
  /** Override texts for the graceful "context unavailable" fallback card. */
  notConfiguredTexts?: PayNotConfiguredTexts
  /** Custom className appended to the wrapping `<Card>`. */
  className?: string
}

// ---------------------------------------------------------------------------
// Status mapping
// ---------------------------------------------------------------------------

type DisplayStatus = 'paid' | 'pending' | 'failed' | 'refunded' | 'cancelled'

const STATUS_VARIANT: Record<
  DisplayStatus,
  'success' | 'warning' | 'destructive' | 'info' | 'secondary'
> = {
  paid: 'success',
  pending: 'warning',
  failed: 'destructive',
  refunded: 'info',
  cancelled: 'secondary',
}

function toDisplayStatus(status: PaymentStatus): DisplayStatus {
  // The backend uses `completed` for the success state; surface it as "Paid"
  // to match standard invoice vocabulary (Stripe / Clerk / GitHub).
  if (status === 'completed') return 'paid'
  return status
}

// ---------------------------------------------------------------------------
// Metadata helpers (no app coupling — only the documented Stripe / Payment fields)
// ---------------------------------------------------------------------------

function getInvoiceDescription(payment: Payment): string {
  const meta = payment.metadata as
    | {
        invoiceNumber?: string
        planName?: string
        productName?: string
      }
    | undefined
  return meta?.invoiceNumber || meta?.planName || meta?.productName || payment.projectName || '—'
}

function getInvoicePdfUrl(payment: Payment): string | undefined {
  // Optional consumer-provided URLs. Backend doesn't store them today; if a
  // consumer enriches the metadata via a Stripe webhook extension these URLs
  // surface naturally without a new schema.
  const meta = payment.metadata as
    | {
        invoicePdfUrl?: string
        hostedInvoiceUrl?: string
      }
    | undefined
  return meta?.invoicePdfUrl
}

function getReceiptUrl(payment: Payment): string | undefined {
  const meta = payment.metadata as
    | {
        receiptUrl?: string
        hostedInvoiceUrl?: string
      }
    | undefined
  return meta?.receiptUrl || meta?.hostedInvoiceUrl
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InvoiceHistorySection({
  applicationId,
  userId,
  pageSize = 10,
  texts: textsProp,
  notConfiguredTexts,
  className,
}: InvoiceHistorySectionProps) {
  const t: InvoiceHistorySectionTexts = {
    ...defaultInvoiceHistorySectionTexts,
    ...textsProp,
    columns: { ...defaultInvoiceHistorySectionTexts.columns, ...textsProp?.columns },
    status: { ...defaultInvoiceHistorySectionTexts.status, ...textsProp?.status },
  }

  const [statusFilter, setStatusFilter] = useState<InvoiceStatusFilter>('all')

  const {
    applicationId: ctxApplicationId,
    applicationResolutionStatus,
    payWebUrl,
    locale,
  } = useApplicationContext()
  const effectiveApplicationId = applicationId ?? ctxApplicationId ?? undefined
  const dashboardUrl = payWebUrl ? `${payWebUrl}/${locale}/developer` : undefined

  // Map UI filter to backend status. We always restrict by `type=invoice`.
  const statusForBackend = useMemo<PaymentStatus | undefined>(() => {
    switch (statusFilter) {
      case 'paid':
        return 'completed'
      case 'pending':
        return 'pending'
      case 'failed':
        return 'failed'
      default:
        return undefined
    }
  }, [statusFilter])

  const {
    payments: invoices,
    isLoading,
    error,
    reload,
  } = usePaymentHistory({
    userId,
    applicationId: effectiveApplicationId,
    limit: 100,
    filters: {
      type: 'invoice',
      status: statusForBackend,
    },
  })

  // VULN-1 parity with BillingDashboard: when the publishable key resolution
  // fails, render an explicit fallback instead of a silently empty table.
  if (applicationResolutionStatus === 'failed' && applicationId === undefined) {
    return (
      <Card className={className}>
        <CardHeader>
          <H3>{t.title}</H3>
        </CardHeader>
        <CardContent>
          <PayNotConfiguredCard
            reason="resolve-failed"
            dashboardUrl={dashboardUrl}
            texts={{
              title: notConfiguredTexts?.title ?? t.contextUnavailableTitle,
              description: notConfiguredTexts?.description ?? t.contextUnavailableDescription,
              cta: notConfiguredTexts?.cta,
            }}
          />
        </CardContent>
      </Card>
    )
  }

  const columns = useMemo<ColumnDef<Payment, unknown>[]>(() => {
    const cols: ColumnDef<Payment, unknown>[] = [
      {
        accessorKey: 'createdAt',
        header: ({ header }) => <DataTableColumnHeader header={header} title={t.columns.date} />,
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
      {
        accessorKey: 'description',
        header: ({ header }) => (
          <DataTableColumnHeader header={header} title={t.columns.description} />
        ),
        cell: ({ row }) => <Span>{getInvoiceDescription(row.original)}</Span>,
        enableSorting: false,
      },
      {
        accessorKey: 'amount',
        header: ({ header }) => <DataTableColumnHeader header={header} title={t.columns.amount} />,
        cell: ({ row }) => (
          <Span>{formatCurrency(row.original.amount, row.original.currency)}</Span>
        ),
      },
      {
        accessorKey: 'status',
        header: ({ header }) => <DataTableColumnHeader header={header} title={t.columns.status} />,
        cell: ({ row }) => {
          const display = toDisplayStatus(row.original.status)
          return (
            <Badge variant={STATUS_VARIANT[display]} size="sm" dot>
              {t.status[display]}
            </Badge>
          )
        },
      },
      {
        id: 'actions',
        header: ({ header }) => <DataTableColumnHeader header={header} title={t.columns.actions} />,
        cell: ({ row }) => {
          const pdfUrl = getInvoicePdfUrl(row.original)
          const receiptUrl = getReceiptUrl(row.original)
          if (!pdfUrl && !receiptUrl) {
            return <Span className="text-muted-foreground text-xs">—</Span>
          }
          return (
            <Div className="flex items-center gap-1">
              {pdfUrl && (
                <Button asChild variant="ghost" size="sm">
                  <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                    <Icon name="lucide:Download" className="h-3.5 w-3.5" />
                    <Span className="sr-only">{t.download}</Span>
                  </a>
                </Button>
              )}
              {receiptUrl && (
                <Button asChild variant="ghost" size="sm">
                  <a href={receiptUrl} target="_blank" rel="noopener noreferrer">
                    <Icon name="lucide:ExternalLink" className="h-3.5 w-3.5" />
                    <Span className="sr-only">{t.viewReceipt}</Span>
                  </a>
                </Button>
              )}
            </Div>
          )
        },
        enableSorting: false,
      },
    ]
    return cols
  }, [t])

  return (
    <Card className={className}>
      <CardHeader>
        <Div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Div className="space-y-1">
            <H3>{t.title}</H3>
            <P className="text-sm text-muted-foreground">{t.description}</P>
          </Div>
          <Select
            value={statusFilter}
            onValueChange={(value: string) => setStatusFilter(value as InvoiceStatusFilter)}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder={t.filterAll} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.filterAll}</SelectItem>
              <SelectItem value="paid">{t.filterPaid}</SelectItem>
              <SelectItem value="pending">{t.filterPending}</SelectItem>
              <SelectItem value="failed">{t.filterFailed}</SelectItem>
            </SelectContent>
          </Select>
        </Div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </Div>
        ) : error ? (
          <Div className="flex flex-col items-center gap-3 py-8 text-center">
            <Icon name="lucide:AlertTriangle" className="h-8 w-8 text-destructive" />
            <Div className="space-y-1">
              <P className="text-sm font-medium text-foreground">{t.errorTitle}</P>
              <P className="text-sm text-muted-foreground">{t.errorDescription}</P>
            </Div>
            <Button variant="outline" size="sm" onClick={reload}>
              {t.retry}
            </Button>
          </Div>
        ) : invoices.length === 0 ? (
          <Div className="flex flex-col items-center gap-2 py-10 text-center">
            <Icon name="lucide:Receipt" className="h-10 w-10 text-muted-foreground/40" />
            <P className="text-sm font-medium text-foreground">{t.empty}</P>
            <P className="text-sm text-muted-foreground">{t.emptyDescription}</P>
          </Div>
        ) : (
          <DataTable
            columns={columns}
            data={invoices}
            pageSize={pageSize}
            initialSorting={[{ id: 'createdAt', desc: true }]}
          />
        )}
      </CardContent>
    </Card>
  )
}
